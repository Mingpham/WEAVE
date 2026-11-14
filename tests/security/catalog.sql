-- WP-0-DB: structural prerequisites, not a proof of row isolation.
-- INV-06, INV-07; DB-06; SEC-09; supports AT-05/06/07/23.
-- Run with psql -X -v ON_ERROR_STOP=1 -f tests/security/catalog.sql.
BEGIN TRANSACTION READ ONLY;
DO $audit$
DECLARE
  table_name text;
  relation_oid oid;
  role_name text;
  problems text[] := ARRAY[]::text[];
  business_tables constant text[] := ARRAY[
    'projects', 'areas', 'resources', 'tasks', 'task_criteria',
    'task_dependencies', 'task_resource_requirements', 'claims',
    'claim_evidence', 'incidents', 'members', 'assignments',
    'observations', 'observation_media', 'media_assets',
    'task_submissions', 'criterion_assessments', 'information_requests',
    'incident_links', 'incident_unknowns', 'decision_proposals',
    'recovery_actions', 'plan_drafts', 'plan_messages', 'project_invites',
    'ai_suggestions', 'payout_ledger', 'event_log', 'notifications',
    'analysis_jobs', 'ai_inference_logs', 'idempotency_keys', 'push_tokens'
  ];
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = role_name) THEN
      RAISE EXCEPTION 'Missing Supabase role: %', role_name;
    END IF;
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = role_name
               AND (rolsuper OR rolbypassrls)) THEN
      problems := array_append(problems, role_name || ' bypasses RLS');
    END IF;
  END LOOP;

  FOREACH table_name IN ARRAY business_tables LOOP
    relation_oid := to_regclass(format('public.%I', table_name));
    IF relation_oid IS NULL THEN
      problems := array_append(problems, 'Missing public.' || table_name);
      CONTINUE;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_class
                   WHERE oid = relation_oid AND relkind IN ('r', 'p')
                     AND relrowsecurity) THEN
      problems := array_append(problems, table_name || ': RLS disabled or not a table');
    END IF;
    -- Check inherited and PUBLIC policies as well as explicit role policies.
    IF EXISTS (
      SELECT FROM pg_policy p
      WHERE p.polrelid = relation_oid AND p.polcmd IN ('a', 'w', 'd', '*')
        AND EXISTS (
          SELECT FROM unnest(p.polroles) AS r(role_oid)
          WHERE CASE WHEN r.role_oid = 0 THEN true
                ELSE pg_has_role('authenticated', r.role_oid, 'MEMBER') END
        )
    ) THEN
      problems := array_append(problems, table_name || ': authenticated write policy (12.1)');
    END IF;
    FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT FROM pg_class c WHERE c.oid = relation_oid
                 AND pg_has_role(role_name, c.relowner, 'MEMBER')) THEN
        problems := array_append(problems, table_name || ': application role owns table');
      END IF;
      IF has_table_privilege(role_name, relation_oid, 'TRUNCATE') THEN
        problems := array_append(problems, table_name || ': ' || role_name || ' can TRUNCATE');
      END IF;
      IF table_name = ANY(ARRAY['event_log', 'observations', 'claim_evidence',
                               'plan_messages', 'ai_inference_logs']) AND (
        has_any_column_privilege(role_name, relation_oid, 'UPDATE') OR
        has_table_privilege(role_name, relation_oid, 'DELETE')
      ) THEN
        problems := array_append(problems, table_name || ': ' || role_name || ' can modify append-only data (DB-06)');
      END IF;
    END LOOP;
  END LOOP;
  IF cardinality(problems) > 0 THEN
    RAISE EXCEPTION E'Security catalog audit failed:\n%', array_to_string(problems, E'\n');
  END IF;
  RAISE NOTICE 'Security catalog prerequisites passed for % tables; behavioral tests still required', cardinality(business_tables);
END
$audit$;
ROLLBACK;
