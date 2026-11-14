-- WP-1-DB FR-MEM-01: owner invite rotation / disable in one transaction.
create function public.manage_project_invite(p_project_id uuid, p_action text, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_project public.projects;
  v_cached public.idempotency_keys;
  v_hash text;
  v_actor uuid;
  v_code text;
  v_expires timestamptz;
  v_now timestamptz := clock_timestamp();
  v_version bigint;
  v_response jsonb;
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  v_try integer;
  v_i integer;
begin
  if v_user is null then raise exception using errcode='P0001',message='UNAUTHENTICATED'; end if;
  if p_project_id is null or p_action is null or p_action not in ('CREATE','DISABLE') then
    raise exception using errcode='P0001',message='VALIDATION_FAILED';
  end if;
  if not weave_private.is_member(p_project_id) then raise exception using errcode='P0001',message='NOT_FOUND'; end if;
  if not weave_private.is_owner(p_project_id) then raise exception using errcode='P0001',message='FORBIDDEN'; end if;
  v_hash := md5(jsonb_build_object('project_id',p_project_id,'action',p_action)::text);
  v_cached := weave_private.begin_idempotent_request(p_idempotency_key,'POST /v1/projects/{pid}/invites',v_hash);
  select p.* into v_project from public.projects p where p.id=p_project_id and p.deleted_at is null for update;
  if not found or not weave_private.is_member(p_project_id) then raise exception using errcode='P0001',message='NOT_FOUND'; end if;
  if not weave_private.is_owner(p_project_id) then raise exception using errcode='P0001',message='FORBIDDEN'; end if;
  if v_project.status='CLOSED' then raise exception using errcode='P0001',message='PROJECT_CLOSED'; end if;
  if v_cached.user_id is not null then return v_cached.response_body; end if;
  select m.id into v_actor from public.members m where m.project_id=p_project_id and m.user_id=v_user and m.role='OWNER' and m.status='APPROVED';
  update public.project_invites set disabled_at=v_now where project_id=p_project_id and disabled_at is null;
  if p_action='CREATE' then
    v_expires := v_now + interval '72 hours';
    for v_try in 1..10 loop
      v_bytes := uuid_send(gen_random_uuid());
      v_code := '';
      for v_i in 0..5 loop
        v_code := v_code || substr(v_alphabet, (get_byte(v_bytes,v_i) % length(v_alphabet)) + 1, 1);
      end loop;
      begin
        insert into public.project_invites(project_id,code,expires_at,created_by) values(p_project_id,v_code,v_expires,v_actor);
        exit;
      exception when unique_violation then
        if v_try=10 then raise exception using errcode='P0001',message='INTERNAL'; end if;
      end;
    end loop;
  end if;
  v_version := weave_private.finish_project_mutation(p_project_id,v_project.state_version,
    case when p_action='CREATE' then 'INVITE_CREATED' else 'INVITE_DISABLED' end,'OWNER');
  v_response := jsonb_build_object('data',jsonb_build_object('code',v_code,'expires_at',v_expires,
    'deep_link',case when v_code is null then null else 'weave://join?code=' || v_code end),
    'meta',jsonb_build_object('state_version',v_version));
  perform weave_private.save_idempotent_response(p_idempotency_key,'POST /v1/projects/{pid}/invites',v_hash,200,v_response);
  return v_response;
end;
$$;
revoke all on function public.manage_project_invite(uuid,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.manage_project_invite(uuid,text,uuid) to authenticated;
