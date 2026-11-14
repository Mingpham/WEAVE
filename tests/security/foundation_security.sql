-- WP-0-DB foundation handoff: specification 7.3/12.2 and db-core checkpoint.
-- INV-07, DB-11, FR-MEM-04/06, FR-EVT-06; supports AT-05/06/07.
-- NOT a full AT: no RPC, Storage, Realtime or app snapshot is exercised.
-- Run only on disposable Supabase local AFTER the foundation migration:
-- psql -X -v ON_ERROR_STOP=1 -f tests/security/foundation_security.sql
BEGIN;
DO $$
BEGIN
  IF to_regclass('public.projects') IS NULL
     OR to_regclass('public.members') IS NULL
     OR to_regclass('public.areas') IS NULL THEN
    RAISE EXCEPTION 'Foundation migration unavailable: projects/members/areas required';
  END IF;
END $$;

CREATE TEMP TABLE fixture_users (name text PRIMARY KEY, id uuid NOT NULL DEFAULT gen_random_uuid());
INSERT INTO fixture_users (name) VALUES
  ('owner_a'), ('owner_b'), ('participant_a'), ('pending_a'), ('removed_a'), ('outsider');
INSERT INTO auth.users (id) SELECT id FROM fixture_users;
CREATE TEMP TABLE fixture_projects (name text PRIMARY KEY, id uuid NOT NULL DEFAULT gen_random_uuid());
INSERT INTO fixture_projects (name) VALUES ('a'), ('b');
INSERT INTO public.projects
  (id, owner_user_id, title, brief, starts_at, ends_at, timezone, expected_team_size, settings)
SELECT p.id, u.id, 'Security fixture ' || p.name,
       'Generated local authorization fixture with no reference scenario dependencies.',
       now() + interval '1 day', now() + interval '2 days', 'UTC', 6, '{"ai_enabled":false}'::jsonb
FROM fixture_projects p JOIN fixture_users u ON u.name = 'owner_' || p.name;
CREATE TEMP TABLE fixture_members (name text PRIMARY KEY, id uuid NOT NULL DEFAULT gen_random_uuid());
INSERT INTO fixture_members (name) VALUES ('owner_a'), ('owner_b'), ('participant_a'), ('pending_a'), ('removed_a');
INSERT INTO public.members
  (id, project_id, user_id, role, status, nickname, availability, consent_at, consent_version)
SELECT m.id, p.id, u.id,
       CASE WHEN m.name LIKE 'owner_%' THEN 'OWNER' ELSE 'PARTICIPANT' END::public.member_role,
       CASE WHEN m.name = 'pending_a' THEN 'PENDING'
            WHEN m.name = 'removed_a' THEN 'REMOVED' ELSE 'APPROVED' END::public.member_status,
       CASE WHEN m.name = 'participant_a' THEN 'Participant A' ELSE m.name END,
       '{"whole_event":true}'::jsonb, now(), 'security-fixture-v1'
FROM fixture_members m JOIN fixture_users u USING (name)
JOIN fixture_projects p ON p.name = CASE WHEN m.name = 'owner_b' THEN 'b' ELSE 'a' END;
CREATE TEMP TABLE fixture_areas (name text PRIMARY KEY, id uuid NOT NULL DEFAULT gen_random_uuid());
INSERT INTO fixture_areas (name) VALUES ('a'), ('b');
INSERT INTO public.areas (id, project_id, name)
SELECT a.id, p.id, '  Zone ' || upper(a.name) || '  '
FROM fixture_areas a JOIN fixture_projects p USING (name);
GRANT SELECT ON fixture_users, fixture_projects, fixture_members, fixture_areas TO authenticated;

-- Owner positive control: can see their project and every membership in A.
SELECT set_config('request.jwt.claim.sub', id::text, true),
       set_config('request.jwt.claims', json_build_object('sub',id,'role','authenticated')::text, true)
FROM fixture_users WHERE name = 'owner_a';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.projects WHERE id IN (SELECT id FROM fixture_projects)) <> 1
     OR (SELECT count(*) FROM public.areas WHERE id IN (SELECT id FROM fixture_areas)) <> 1
     OR (SELECT count(*) FROM public.members WHERE id IN (SELECT id FROM fixture_members)) <> 4
     OR EXISTS (SELECT FROM public.projects WHERE id=(SELECT id FROM fixture_projects WHERE name='b'))
     OR EXISTS (SELECT FROM public.areas WHERE id=(SELECT id FROM fixture_areas WHERE name='b'))
     OR EXISTS (SELECT FROM public.members WHERE project_id=(SELECT id FROM fixture_projects WHERE name='b')) THEN
    RAISE EXCEPTION 'INV-07 owner positive control or cross-project isolation failed';
  END IF;
END $$;
-- Direct DML must fail with privilege denial or affect zero rows. Positive
-- SELECT above ensures UPDATE/DELETE cannot falsely pass on absent fixtures.
DO $$ BEGIN
  BEGIN
    INSERT INTO public.areas (project_id,name)
      SELECT id,'Forbidden insert' FROM fixture_projects WHERE name='a';
    RAISE EXCEPTION 'INV-07 authenticated direct INSERT allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.projects (owner_user_id,title,brief,starts_at,ends_at,timezone,expected_team_size,settings)
      SELECT owner_user_id,title,brief,starts_at,ends_at,timezone,expected_team_size,settings
      FROM public.projects WHERE id=(SELECT id FROM fixture_projects WHERE name='a');
    RAISE EXCEPTION 'INV-07 authenticated direct project INSERT allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.members (project_id,user_id,role,status,nickname,availability)
      SELECT p.id,u.id,'PARTICIPANT','PENDING','Forbidden insert','{"whole_event":true}'::jsonb
      FROM fixture_projects p,fixture_users u WHERE p.name='a' AND u.name='outsider';
    RAISE EXCEPTION 'INV-07 authenticated direct member INSERT allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.projects SET title='Forbidden update' WHERE id=(SELECT id FROM fixture_projects WHERE name='a');
    IF FOUND THEN RAISE EXCEPTION 'INV-07 authenticated direct project UPDATE allowed'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.members SET nickname='Forbidden update' WHERE id=(SELECT id FROM fixture_members WHERE name='participant_a');
    IF FOUND THEN RAISE EXCEPTION 'INV-07 authenticated direct member UPDATE allowed'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    DELETE FROM public.projects WHERE id=(SELECT id FROM fixture_projects WHERE name='a');
    IF FOUND THEN RAISE EXCEPTION 'INV-07 authenticated direct project DELETE allowed'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    DELETE FROM public.members WHERE id=(SELECT id FROM fixture_members WHERE name='participant_a');
    IF FOUND THEN RAISE EXCEPTION 'INV-07 authenticated direct member DELETE allowed'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.areas SET notes='Forbidden update' WHERE id IN (SELECT id FROM fixture_areas);
    IF FOUND THEN RAISE EXCEPTION 'INV-07 authenticated direct UPDATE allowed'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    DELETE FROM public.areas WHERE id IN (SELECT id FROM fixture_areas);
    IF FOUND THEN RAISE EXCEPTION 'INV-07 authenticated direct DELETE allowed'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

-- Approved participant sees approved membership rows only, with no recursion.
SELECT set_config('request.jwt.claim.sub', id::text, true),
       set_config('request.jwt.claims', json_build_object('sub',id,'role','authenticated')::text, true)
FROM fixture_users WHERE name='participant_a';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.projects WHERE id IN (SELECT id FROM fixture_projects)) <> 1
     OR (SELECT count(*) FROM public.areas WHERE id IN (SELECT id FROM fixture_areas)) <> 1
     OR (SELECT count(*) FROM public.members WHERE id IN (SELECT id FROM fixture_members)) <> 2
     OR EXISTS (SELECT FROM public.projects WHERE id=(SELECT id FROM fixture_projects WHERE name='b'))
     OR EXISTS (SELECT FROM public.areas WHERE id=(SELECT id FROM fixture_areas WHERE name='b'))
     OR EXISTS (SELECT FROM public.members WHERE project_id=(SELECT id FROM fixture_projects WHERE name='b'))
     OR EXISTS (SELECT FROM public.members WHERE id IN (SELECT id FROM fixture_members) AND status <> 'APPROVED') THEN
    RAISE EXCEPTION 'INV-07 approved participant reads or cross-project isolation failed';
  END IF;
END $$;
RESET ROLE;

-- Pending sees own request only; outsider/removed get no protected project or
-- area rows. Section 12.2 permits a non-approved member's own membership row.
DO $$
DECLARE actor text; actor_id uuid; expected_members int;
BEGIN
  FOREACH actor IN ARRAY ARRAY['pending_a','removed_a','outsider'] LOOP
    SELECT id INTO actor_id FROM fixture_users WHERE name=actor;
    PERFORM set_config('request.jwt.claim.sub',actor_id::text,true);
    PERFORM set_config('request.jwt.claims',json_build_object('sub',actor_id,'role','authenticated')::text,true);
    expected_members := CASE WHEN actor='outsider' THEN 0 ELSE 1 END;
    SET LOCAL ROLE authenticated;
    IF EXISTS (SELECT FROM public.projects WHERE id IN (SELECT id FROM fixture_projects))
       OR EXISTS (SELECT FROM public.areas WHERE id IN (SELECT id FROM fixture_areas))
       OR (SELECT count(*) FROM public.members WHERE id IN (SELECT id FROM fixture_members)) <> expected_members
       OR EXISTS (SELECT FROM public.members WHERE id IN (SELECT id FROM fixture_members) AND user_id <> actor_id) THEN
      RAISE EXCEPTION 'FR-MEM-04/06 protected data leaked to %',actor;
    END IF;
    RESET ROLE;
  END LOOP;
END $$;

-- Verify member and area normalization, then reject normalized duplicates.
DO $$ BEGIN
  IF (SELECT nickname_norm FROM public.members WHERE id=(SELECT id FROM fixture_members WHERE name='participant_a')) IS DISTINCT FROM 'participant a'
     OR (SELECT name_norm FROM public.areas WHERE id=(SELECT id FROM fixture_areas WHERE name='a')) IS DISTINCT FROM 'zone a' THEN
    RAISE EXCEPTION 'FR-MEM-02 foundation normalization failed';
  END IF;
  BEGIN
    INSERT INTO public.areas (project_id,name) SELECT id,'zone a' FROM fixture_projects WHERE name='a';
    RAISE EXCEPTION 'Area normalized duplicate accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.members (project_id,user_id,role,status,nickname,availability)
      SELECT p.id,u.id,'PARTICIPANT','PENDING',' participant a ','{"whole_event":true}'::jsonb
      FROM fixture_projects p,fixture_users u WHERE p.name='a' AND u.name='outsider';
    RAISE EXCEPTION 'FR-MEM-02 active nickname normalized duplicate accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;

-- Inactive duplicate nicknames and equal area names across projects are valid.
UPDATE public.members SET nickname=' participant a ' WHERE id=(SELECT id FROM fixture_members WHERE name='removed_a');
INSERT INTO public.areas (project_id,name) SELECT id,'zone a' FROM fixture_projects WHERE name='b';

-- Composite FK enforcement runs as administrator: RLS cannot mask these checks.
DO $$ BEGIN
  BEGIN
    UPDATE public.members SET current_area_id=(SELECT id FROM fixture_areas WHERE name='b')
      WHERE id=(SELECT id FROM fixture_members WHERE name='participant_a');
    RAISE EXCEPTION 'DB-11 cross-project current_area_id accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;
  BEGIN
    UPDATE public.members SET decided_by=(SELECT id FROM fixture_members WHERE name='owner_b')
      WHERE id=(SELECT id FROM fixture_members WHERE name='pending_a');
    RAISE EXCEPTION 'DB-11 cross-project decided_by accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;
END $$;

-- Removal must revoke existing access, not merely deny initially removed users.
UPDATE public.members SET status='REMOVED' WHERE id=(SELECT id FROM fixture_members WHERE name='participant_a');
SELECT set_config('request.jwt.claim.sub',id::text,true),
       set_config('request.jwt.claims',json_build_object('sub',id,'role','authenticated')::text,true)
FROM fixture_users WHERE name='participant_a';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF EXISTS (SELECT FROM public.projects WHERE id IN (SELECT id FROM fixture_projects))
     OR EXISTS (SELECT FROM public.areas WHERE id IN (SELECT id FROM fixture_areas)) THEN
    RAISE EXCEPTION 'FR-MEM-06 / AT-07 supporting check: removal did not revoke reads';
  END IF;
END $$;
RESET ROLE;

UPDATE public.projects SET deleted_at=now() WHERE id=(SELECT id FROM fixture_projects WHERE name='a');
SELECT set_config('request.jwt.claim.sub',id::text,true),
       set_config('request.jwt.claims',json_build_object('sub',id,'role','authenticated')::text,true)
FROM fixture_users WHERE name='owner_a';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF EXISTS (SELECT FROM public.projects WHERE id IN (SELECT id FROM fixture_projects))
     OR EXISTS (SELECT FROM public.areas WHERE id IN (SELECT id FROM fixture_areas))
     OR EXISTS (SELECT FROM public.members WHERE id IN (SELECT id FROM fixture_members)) THEN
    RAISE EXCEPTION 'FR-EVT-06 soft deletion leaked rows even to owner';
  END IF;
END $$;
RESET ROLE;
ROLLBACK;
