-- Membership writes derive the caller from auth.uid(), serialize on the project,
-- and persist acknowledged responses within the same transaction. No direct writes.
create table weave_private.invite_attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null,
  attempts integer not null check(attempts > 0)
);
revoke all on table weave_private.invite_attempts from public,anon,authenticated,service_role;

create function weave_private.member_self_json(p_member public.members)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object('id',p_member.id,'nickname',p_member.nickname,'role',p_member.role,
    'role_tags',p_member.role_tags,'presence',p_member.presence,'current_area_id',p_member.current_area_id,
    'status',p_member.status,'availability',p_member.availability,'consent_at',p_member.consent_at,
    'consent_version',p_member.consent_version,'version',p_member.version);
$$;
revoke all on function weave_private.member_self_json(public.members) from public,anon,authenticated,service_role;

create function public.resolve_membership_invite(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_project public.projects;
  v_attempts integer;
  v_owner text;
begin
  if auth.uid() is null then raise exception using errcode='P0001',message='UNAUTHENTICATED'; end if;
  insert into weave_private.invite_attempts(user_id,window_started_at,attempts)
    values(auth.uid(),clock_timestamp(),1)
    on conflict(user_id) do update set
      attempts=case when invite_attempts.window_started_at < clock_timestamp()-interval '10 minutes' then 1 else invite_attempts.attempts+1 end,
      window_started_at=case when invite_attempts.window_started_at < clock_timestamp()-interval '10 minutes' then clock_timestamp() else invite_attempts.window_started_at end
    returning attempts into v_attempts;
  -- Return errors (rather than raising) so invalid guesses still consume an attempt.
  if v_attempts > 10 then return jsonb_build_object('error',jsonb_build_object('code','RATE_LIMITED')); end if;
  select p.* into v_project from public.project_invites i join public.projects p on p.id=i.project_id
    where i.code=p_code and i.disabled_at is null and i.expires_at>clock_timestamp()
      and p.deleted_at is null and p.status in ('DRAFT','ACTIVE');
  if not found then return jsonb_build_object('error',jsonb_build_object('code','INVITE_INVALID')); end if;
  select m.nickname into v_owner from public.members m where m.project_id=v_project.id and m.role='OWNER' and m.status='APPROVED';
  return jsonb_build_object('data',jsonb_build_object('project_id',v_project.id,'project_title',v_project.title,
    'organizer_nickname',v_owner,'venue_name',v_project.venue_name,'starts_at',v_project.starts_at,
    'ends_at',v_project.ends_at,'timezone',v_project.timezone,'consent_version','1','role_tags',v_project.role_tags),
    'meta',jsonb_build_object('state_version',v_project.state_version));
end;
$$;
revoke all on function public.resolve_membership_invite(text) from public,anon,authenticated,service_role;
grant execute on function public.resolve_membership_invite(text) to authenticated;

create function public.membership_operation(p_operation text,p_request jsonb,p_target_id uuid,p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_project public.projects;
  v_member public.members;
  v_actor public.members;
  v_cached public.idempotency_keys;
  v_hash text;
  v_operation text;
  v_resolved jsonb;
  v_result jsonb;
  v_data jsonb;
  v_event text;
  v_visibility public.log_visibility := 'OWNER';
  v_version bigint;
  v_tags text[];
  v_window jsonb;
  v_status public.member_status;
begin
  if v_user is null then raise exception using errcode='P0001',message='UNAUTHENTICATED'; end if;
  if p_operation is null or p_operation not in ('JOIN','DECISION','UPDATE','REMOVE','LEAVE')
    or p_request is null or jsonb_typeof(p_request)<>'object' then
    raise exception using errcode='P0001',message='VALIDATION_FAILED';
  end if;
  v_operation := 'MEMBERSHIP ' || p_operation;
  v_hash := md5(jsonb_build_object('target',p_target_id,'body',p_request)::text);
  v_cached := weave_private.begin_idempotent_request(p_idempotency_key,v_operation,v_hash);
  if p_operation='JOIN' then
    if v_cached.user_id is not null then
      select m.* into v_member from public.members m where m.id=(v_cached.response_body->'data'->'member'->>'id')::uuid and m.user_id=v_user;
      if not found or v_member.status not in ('PENDING','APPROVED') or not exists (
        select 1 from public.projects p where p.id=v_member.project_id and p.deleted_at is null
      ) then raise exception using errcode='P0001',message='NOT_FOUND'; end if;
      return v_cached.response_body;
    end if;
    if (p_request-array['code','nickname','role_tags','availability','consent_version'])<>'{}'::jsonb
      or p_request->>'code' is null or p_request->>'code' !~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$'
      or jsonb_typeof(p_request->'nickname') is distinct from 'string'
      or char_length(btrim(p_request->>'nickname')) not between 2 and 24
      or p_request->>'consent_version' is distinct from '1' then
      raise exception using errcode='P0001',message='VALIDATION_FAILED';
    end if;
    v_resolved := public.resolve_membership_invite(p_request->>'code');
    if v_resolved ? 'error' then return v_resolved; end if;
    select p.* into v_project from public.projects p where p.id=(v_resolved->'data'->>'project_id')::uuid and p.deleted_at is null for update;
    if not found or v_project.status='CLOSED' or not exists(select 1 from public.project_invites i where i.project_id=v_project.id
      and i.code=p_request->>'code' and i.disabled_at is null and i.expires_at>clock_timestamp()) then
      return jsonb_build_object('error',jsonb_build_object('code','INVITE_INVALID'));
    end if;
    select m.* into v_member from public.members m where m.project_id=v_project.id and m.user_id=v_user;
    if found and v_member.status in ('PENDING','APPROVED') then raise exception using errcode='P0001',message='INVALID_TRANSITION'; end if;
    if (select count(*) from public.members m where m.project_id=v_project.id and m.status in ('PENDING','APPROVED'))>=50 then
      raise exception using errcode='P0001',message='LIMIT_EXCEEDED';
    end if;
  else
    if p_operation='LEAVE' then
      select m.* into v_member from public.members m where m.project_id=p_target_id and m.user_id=v_user;
    else
      select m.* into v_member from public.members m where m.id=p_target_id;
    end if;
    if not found then raise exception using errcode='P0001',message='NOT_FOUND'; end if;
    select p.* into v_project from public.projects p where p.id=v_member.project_id and p.deleted_at is null for update;
    if not found then raise exception using errcode='P0001',message='NOT_FOUND'; end if;
    select m.* into v_member from public.members m where m.id=v_member.id;
    select m.* into v_actor from public.members m where m.project_id=v_project.id and m.user_id=v_user;
    if v_actor.id is null or v_actor.status not in ('PENDING','APPROVED') then
      if not (p_operation='LEAVE' and v_cached.user_id is not null and v_member.user_id=v_user and v_member.status='LEFT') then
        raise exception using errcode='P0001',message='NOT_FOUND';
      end if;
    end if;
    if p_operation in ('DECISION','REMOVE') and not weave_private.is_owner(v_project.id) then raise exception using errcode='P0001',message='FORBIDDEN'; end if;
    if p_operation='UPDATE' and (v_member.user_id<>v_user and not weave_private.is_owner(v_project.id)) then raise exception using errcode='P0001',message='FORBIDDEN'; end if;
    if p_operation='LEAVE' and v_member.role='OWNER' then raise exception using errcode='P0001',message='FORBIDDEN'; end if;
    if v_cached.user_id is not null then return v_cached.response_body; end if;
    if v_project.status='CLOSED' then raise exception using errcode='P0001',message='PROJECT_CLOSED'; end if;
  end if;

  if p_operation='JOIN' or (p_operation='UPDATE' and p_request ? 'role_tags') then
    if jsonb_typeof(p_request->'role_tags') is distinct from 'array' then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
    if jsonb_array_length(p_request->'role_tags')>10 or exists(select 1 from jsonb_array_elements(p_request->'role_tags') j where jsonb_typeof(j)<>'string') then
      raise exception using errcode='P0001',message='VALIDATION_FAILED';
    end if;
    select coalesce(array_agg(t),'{}') into v_tags from jsonb_array_elements_text(p_request->'role_tags') t;
    if not (v_tags <@ v_project.role_tags) then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  end if;
  if p_operation='JOIN' or (p_operation='UPDATE' and p_request ? 'availability') then
    if jsonb_typeof(p_request->'availability') is distinct from 'object' then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
    if p_request->'availability' <> '{"whole_event":true}'::jsonb then
      if (p_request->'availability'-'windows')<>'{}'::jsonb or jsonb_typeof(p_request->'availability'->'windows') is distinct from 'array' then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
      if jsonb_array_length(p_request->'availability'->'windows') not between 1 and 12 then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
      for v_window in select value from jsonb_array_elements(p_request->'availability'->'windows') loop
        if jsonb_typeof(v_window)<>'object' or (v_window-array['from','to'])<>'{}'::jsonb or v_window->>'from' is null or v_window->>'to' is null then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
        begin
          if (v_window->>'to')::timestamptz <= (v_window->>'from')::timestamptz then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
        exception when invalid_datetime_format or datetime_field_overflow then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end;
      end loop;
    end if;
  end if;
  if p_operation='JOIN' then
    v_status := case when coalesce((v_project.settings->>'auto_approve_members')::boolean,false) then 'APPROVED'::public.member_status else 'PENDING'::public.member_status end;
    insert into public.members(project_id,user_id,role,status,nickname,role_tags,availability,consent_at,consent_version)
      values(v_project.id,v_user,'PARTICIPANT',v_status,btrim(p_request->>'nickname'),v_tags,p_request->'availability',clock_timestamp(),'1')
      on conflict(project_id,user_id) do update set status=excluded.status,nickname=excluded.nickname,role_tags=excluded.role_tags,
        availability=excluded.availability,consent_at=excluded.consent_at,consent_version=excluded.consent_version,
        presence='NOT_ARRIVED',current_area_id=null,decided_by=null,decided_at=null,version=members.version+1
      returning * into v_member;
    v_actor:=v_member;
    v_event := 'MEMBER_JOIN_REQUESTED';
    v_data := jsonb_build_object('project_id',v_project.id,'member',weave_private.member_self_json(v_member));
  elsif p_operation='DECISION' then
    if (p_request-array['decision','expected_version'])<>'{}'::jsonb or p_request->>'decision' is null or p_request->>'decision' not in ('APPROVE','REJECT')
      or jsonb_typeof(p_request->'expected_version') is distinct from 'number' then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
    if v_member.version::text<>p_request->>'expected_version' then raise exception using errcode='P0001',message='VERSION_CONFLICT'; end if;
    if v_member.status<>'PENDING' or v_member.role='OWNER' then raise exception using errcode='P0001',message='INVALID_TRANSITION'; end if;
    update public.members set status=case when p_request->>'decision'='APPROVE' then 'APPROVED'::public.member_status else 'REJECTED'::public.member_status end,
      decided_by=v_actor.id,decided_at=clock_timestamp(),version=version+1 where id=v_member.id returning * into v_member;
    v_event:=case when v_member.status='APPROVED' then 'MEMBER_APPROVED' else 'MEMBER_REJECTED' end;
    v_data:=jsonb_build_object('member_id',v_member.id,'status',v_member.status,'version',v_member.version);
  elsif p_operation='UPDATE' then
    if v_member.status<>'APPROVED' then raise exception using errcode='P0001',message='FORBIDDEN'; end if;
    if p_request='{}'::jsonb or (p_request-array['nickname','role_tags','availability','presence','unavailable_reason','current_area_id'])<>'{}'::jsonb then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
    if v_member.user_id<>v_user and (p_request-'role_tags')<>'{}'::jsonb then raise exception using errcode='P0001',message='FORBIDDEN'; end if;
    -- On-site state requires claim projection and engine effects; fail explicitly until
    -- that dependent schema is installed, rather than acknowledging an incomplete write.
    if p_request ?| array['presence','current_area_id','unavailable_reason'] then raise exception using errcode='P0001',message='INVALID_TRANSITION'; end if;
    if p_request ? 'nickname' and (jsonb_typeof(p_request->'nickname')<>'string' or char_length(btrim(p_request->>'nickname')) not between 2 and 24) then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
    update public.members set nickname=case when p_request ? 'nickname' then btrim(p_request->>'nickname') else nickname end,
      role_tags=case when p_request ? 'role_tags' then v_tags else role_tags end,
      availability=case when p_request ? 'availability' then p_request->'availability' else availability end,version=version+1
      where id=v_member.id returning * into v_member;
    v_event:='MEMBER_UPDATED';v_data:=weave_private.member_self_json(v_member);
  else
    -- There is no work-assignment/probe schema in the foundation. Refuse the operation
    -- once it appears until its release/cancellation engine is integrated atomically.
    if to_regclass('public.assignments') is not null or to_regclass('public.probes') is not null or to_regclass('public.incidents') is not null then
      raise exception using errcode='P0001',message='INVALID_TRANSITION';
    end if;
    if (p_operation='REMOVE' and (p_request-'reason')<>'{}'::jsonb) or (p_operation='LEAVE' and p_request<>'{}'::jsonb) then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
    if v_member.role='OWNER' or v_member.status not in ('APPROVED','PENDING') then raise exception using errcode='P0001',message='INVALID_TRANSITION'; end if;
    update public.members set status=case when p_operation='REMOVE' then 'REMOVED'::public.member_status else 'LEFT'::public.member_status end,
      version=version+1 where id=v_member.id returning * into v_member;
    v_event:=case when p_operation='REMOVE' then 'MEMBER_REMOVED' else 'MEMBER_LEFT' end;
    v_data:='null'::jsonb;
  end if;
  update public.projects set state_version=state_version+1 where id=v_project.id returning state_version into v_version;
  insert into public.event_log(project_id,state_version,event_type,actor_kind,actor_member_id,entity_type,entity_id,visibility,involved_member_ids)
    values(v_project.id,v_version,v_event,'MEMBER',v_actor.id,'MEMBER',v_member.id,v_visibility,array[v_member.id]);
  v_result:=jsonb_build_object('data',v_data,'meta',jsonb_build_object('state_version',v_version));
  perform weave_private.save_idempotent_response(p_idempotency_key,v_operation,v_hash,200,v_result);
  return v_result;
exception when unique_violation then raise exception using errcode='P0001',message='CONSTRAINT_VIOLATION';
end;
$$;
revoke all on function public.membership_operation(text,jsonb,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.membership_operation(text,jsonb,uuid,uuid) to authenticated;
