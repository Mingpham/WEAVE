-- WP-1-DB FR-AUTH-03 / FR-EVT-01/03: create project atomically.
create function public.create_project(p_request jsonb, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_hash text;
  v_cached public.idempotency_keys;
  v_project uuid;
  v_member uuid;
  v_plan uuid;
  v_result jsonb;
  v_start timestamptz;
  v_end timestamptz;
  v_team integer;
  v_attendees integer;
  v_nickname text;
begin
  if v_user is null then raise exception using errcode='P0001', message='UNAUTHENTICATED'; end if;
  if not exists (select 1 from auth.users u join auth.identities i on i.user_id=u.id
      where u.id=v_user and not coalesce(u.is_anonymous,false) and i.provider='google') then
    raise exception using errcode='P0001', message='FORBIDDEN';
  end if;
  if p_request is null or jsonb_typeof(p_request) <> 'object'
    or (p_request - array['title','brief','venue_name','starts_at','ends_at','timezone','expected_team_size','expected_attendees','currency']) <> '{}'::jsonb
    or jsonb_typeof(p_request->'title') is distinct from 'string'
    or jsonb_typeof(p_request->'brief') is distinct from 'string'
    or jsonb_typeof(p_request->'starts_at') is distinct from 'string'
    or jsonb_typeof(p_request->'ends_at') is distinct from 'string'
    or jsonb_typeof(p_request->'timezone') is distinct from 'string'
    or jsonb_typeof(p_request->'expected_team_size') is distinct from 'number'
    or (p_request ? 'venue_name' and jsonb_typeof(p_request->'venue_name') not in ('string','null'))
    or (p_request ? 'expected_attendees' and jsonb_typeof(p_request->'expected_attendees') not in ('number','null'))
    or (p_request ? 'currency' and jsonb_typeof(p_request->'currency') <> 'string') then
    raise exception using errcode='P0001', message='VALIDATION_FAILED';
  end if;
  begin
    if (p_request->>'starts_at') !~ 'Z$' or (p_request->>'ends_at') !~ 'Z$' then raise invalid_datetime_format; end if;
    v_start := (p_request->>'starts_at')::timestamptz;
    v_end := (p_request->>'ends_at')::timestamptz;
    v_team := (p_request->>'expected_team_size')::integer;
    v_attendees := (p_request->>'expected_attendees')::integer;
  exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow or numeric_value_out_of_range then
    raise exception using errcode='P0001', message='VALIDATION_FAILED';
  end;
  if char_length(p_request->>'title') not between 3 and 80
    or char_length(p_request->>'brief') not between 40 and 4000
    or v_team not between 2 and 50 or v_attendees < 0
    or v_end <= v_start or v_end > v_start + interval '72 hours'
    or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_request->>'timezone')
    or coalesce(p_request->>'currency','VND') = '' then
    raise exception using errcode='P0001', message='VALIDATION_FAILED';
  end if;
  -- Hash normalized JSON, after validation; clients cannot choose this value.
  v_hash := md5(p_request::text);
  v_cached := weave_private.begin_idempotent_request(p_idempotency_key,'POST /v1/projects',v_hash);
  if v_cached.user_id is not null then
    if not exists (select 1 from public.projects p where p.id=(v_cached.response_body->'data'->>'project_id')::uuid and p.owner_user_id=v_user and p.deleted_at is null) then
      raise exception using errcode='P0001', message='NOT_FOUND';
    end if;
    return v_cached.response_body;
  end if;
  select left(btrim(coalesce(nullif(u.raw_user_meta_data->>'full_name',''),nullif(u.raw_user_meta_data->>'name',''),'Organizer')),24)
    into v_nickname from auth.users u where u.id=v_user;
  if char_length(v_nickname)<2 then v_nickname := 'Organizer'; end if;
  insert into public.projects(owner_user_id,title,brief,venue_name,starts_at,ends_at,timezone,expected_team_size,expected_attendees,currency,settings)
  values(v_user,p_request->>'title',p_request->>'brief',p_request->>'venue_name',v_start,v_end,p_request->>'timezone',v_team,v_attendees,coalesce(p_request->>'currency','VND'),
    '{"ai_enabled":true,"ai_probe_enabled":true,"ai_recovery_enabled":true,"ai_vision_enabled":true,"auto_approve_members":false}'::jsonb)
  returning id into v_project;
  insert into public.members(project_id,user_id,role,status,nickname,availability)
  values(v_project,v_user,'OWNER','APPROVED',v_nickname,'{"whole_event":true}'::jsonb) returning id into v_member;
  insert into public.plan_drafts(project_id,draft) values(v_project,
    '{"areas":[],"role_tags":[],"tasks":[],"resources":[],"questions":[],"assumptions":[],"gaps":[]}'::jsonb) returning id into v_plan;
  update public.projects set state_version=1 where id=v_project;
  insert into public.event_log(project_id,state_version,event_type,actor_kind,actor_member_id,visibility)
    values(v_project,1,'PROJECT_CREATED','MEMBER',v_member,'ALL');
  v_result := jsonb_build_object('data',jsonb_build_object('project_id',v_project,'owner_member_id',v_member,'plan_draft_id',v_plan),'meta',jsonb_build_object('state_version',1));
  perform weave_private.save_idempotent_response(p_idempotency_key,'POST /v1/projects',v_hash,201,v_result);
  return v_result;
end;
$$;
revoke all on function public.create_project(jsonb,uuid) from public, anon, authenticated, service_role;
grant execute on function public.create_project(jsonb,uuid) to authenticated;
