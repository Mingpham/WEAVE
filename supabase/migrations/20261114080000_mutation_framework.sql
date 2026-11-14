-- WP-0-DB private transaction primitives, §9.1 / §11.0.
-- No public mutation RPC. These invoker helpers must be called by a guarded
-- SECURITY DEFINER endpoint, which owns domain permissions and transitions.
create function weave_private.lock_project_for_mutation(
  p_project_id uuid,
  p_expected_state_version bigint,
  p_require_owner boolean default false
) returns public.projects
language plpgsql security invoker set search_path = ''
as $$
declare
  v_project public.projects;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHENTICATED';
  end if;
  if p_project_id is null or p_expected_state_version is null
      or p_expected_state_version < 0 or p_require_owner is null then
    raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
  end if;
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception using errcode = '40001', message = 'Mutation framework requires READ COMMITTED';
  end if;
  select p.* into v_project from public.projects p
    where p.id = p_project_id and p.deleted_at is null for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;
  if not weave_private.is_member(p_project_id) then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;
  if p_require_owner and not weave_private.is_owner(p_project_id) then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN';
  end if;
  if v_project.status = 'CLOSED' then
    raise exception using errcode = 'P0001', message = 'PROJECT_CLOSED';
  end if;
  if v_project.state_version <> p_expected_state_version then
    raise exception using errcode = 'P0001', message = 'VERSION_CONFLICT',
      detail = json_build_object('current', v_project.state_version)::text;
  end if;
  return v_project;
end;
$$;

create function weave_private.begin_idempotent_request(
  p_key uuid,
  p_operation text,
  p_request_hash text
) returns public.idempotency_keys
language plpgsql security invoker set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_cached public.idempotency_keys;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHENTICATED';
  end if;
  if p_key is null or substring(p_key::text, 15, 1) <> '4'
      or substring(p_key::text, 20, 1) not in ('8', '9', 'a', 'b')
      or p_operation is null or btrim(p_operation) = ''
      or p_request_hash is null or btrim(p_request_hash) = '' then
    raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
  end if;
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception using errcode = '40001', message = 'Mutation framework requires READ COMMITTED';
  end if;
  -- Acquire this BEFORE the project row lock. A hash collision only causes
  -- extra serialization; cache identity is still checked using the full PK.
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || p_key::text, 0));
  select k.* into v_cached from public.idempotency_keys k
    where k.user_id = v_user_id and k.key = p_key;
  if not found then return null; end if;
  if v_cached.operation <> p_operation or v_cached.request_hash <> p_request_hash then
    raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_KEY_REUSED';
  end if;
  return v_cached;
end;
$$;

create function weave_private.save_idempotent_response(
  p_key uuid,
  p_operation text,
  p_request_hash text,
  p_response_status integer,
  p_response_body jsonb
) returns public.idempotency_keys
language plpgsql security invoker set search_path = ''
as $$
declare
  v_cached public.idempotency_keys;
begin
  if p_response_status is null or p_response_status not between 100 and 599
      or p_response_body is null then
    raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
  end if;
  v_cached := weave_private.begin_idempotent_request(p_key, p_operation, p_request_hash);
  if v_cached.user_id is not null then return v_cached; end if;
  insert into public.idempotency_keys
    (user_id, key, operation, request_hash, response_status, response_body)
  values (auth.uid(), p_key, p_operation, p_request_hash, p_response_status, p_response_body)
  returning * into v_cached;
  return v_cached;
end;
$$;

create function weave_private.finish_project_mutation(
  p_project_id uuid,
  p_expected_state_version bigint,
  p_event_type text,
  p_visibility public.log_visibility,
  p_payload jsonb default '{}',
  p_involved_member_ids uuid[] default '{}',
  p_entity_type text default null,
  p_entity_id uuid default null
) returns bigint
language plpgsql security invoker set search_path = ''
as $$
declare
  v_project public.projects;
  v_actor_member_id uuid;
  v_state_version bigint;
begin
  if p_event_type is null or btrim(p_event_type) = '' or p_visibility is null
      or p_payload is null or p_involved_member_ids is null then
    raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
  end if;
  v_project := weave_private.lock_project_for_mutation(p_project_id, p_expected_state_version);
  select m.id into v_actor_member_id from public.members m
    where m.project_id = p_project_id and m.user_id = (select auth.uid())
      and m.status = 'APPROVED';
  if not found then
    raise exception using errcode = 'P0001', message = 'NOT_FOUND';
  end if;
  update public.projects set state_version = state_version + 1
    where id = p_project_id returning state_version into v_state_version;
  insert into public.event_log
    (project_id, state_version, event_type, actor_kind, actor_member_id,
     entity_type, entity_id, payload, visibility, involved_member_ids)
  values (p_project_id, v_state_version, p_event_type, 'MEMBER', v_actor_member_id,
    p_entity_type, p_entity_id, p_payload, p_visibility, p_involved_member_ids);
  return v_state_version;
end;
$$;

revoke all on function weave_private.lock_project_for_mutation(uuid, bigint, boolean)
  from public, anon, authenticated, service_role;
revoke all on function weave_private.begin_idempotent_request(uuid, text, text)
  from public, anon, authenticated, service_role;
revoke all on function weave_private.save_idempotent_response(uuid, text, text, integer, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function weave_private.finish_project_mutation(uuid, bigint, text, public.log_visibility, jsonb, uuid[], text, uuid)
  from public, anon, authenticated, service_role;

-- Caller contract: authorize endpoint scope before revealing any cached body;
-- acquire key lock, check replay, lock project, validate/apply domain + engine
-- delta, call finalizer ONCE, save response, return, all in one transaction.
-- Event type and payload are server-authored; never copy authority from clients.
-- Workers, self-leave, project creation, closure and closed-project ledger updates require
-- their own guarded entry points. TTL cleanup and public RPCs are not installed.
