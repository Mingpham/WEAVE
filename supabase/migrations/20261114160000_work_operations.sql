-- Work storage and caller-scoped atomic manual task/assignment operations (§7–9).
create table public.tasks (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id),
  created_at timestamptz not null default now(), title text not null check(char_length(btrim(title)) between 3 and 80),
  description text not null check(char_length(description)<=1000), area_id uuid, role_tag text,
  role_required boolean not null default false, start_at timestamptz, due_at timestamptz not null,
  hard_deadline boolean not null default false, estimated_minutes integer not null check(estimated_minutes>0),
  critical boolean not null default false, stipend_amount bigint check(stipend_amount>=0),
  status public.task_status not null default 'OPEN', risk public.task_risk not null default 'NONE',
  risk_reasons jsonb not null default '[]', origin public.task_origin not null, source_incident_id uuid,
  created_by uuid not null, version integer not null default 1 check(version>0), unique(project_id,id),
  foreign key(project_id,area_id) references public.areas(project_id,id),
  foreign key(project_id,created_by) references public.members(project_id,id),
  check(start_at is null or start_at<due_at), check(not role_required or role_tag is not null)
);
create table public.task_criteria (
  id uuid primary key default gen_random_uuid(), project_id uuid not null, task_id uuid not null,
  created_at timestamptz not null default now(), position integer not null check(position>=0),
  description text not null check(char_length(btrim(description)) between 1 and 200),
  critical boolean not null default true, photo_expected boolean not null default false,
  state public.criterion_state not null default 'PENDING', decided_by uuid, decided_at timestamptz,
  unique(project_id,id), unique(task_id,position),
  foreign key(project_id,task_id) references public.tasks(project_id,id),
  foreign key(project_id,decided_by) references public.members(project_id,id)
);
create table public.task_dependencies (
  project_id uuid not null, predecessor_id uuid not null, successor_id uuid not null,
  kind public.dependency_kind not null, primary key(predecessor_id,successor_id),
  check(predecessor_id<>successor_id),
  foreign key(project_id,predecessor_id) references public.tasks(project_id,id),
  foreign key(project_id,successor_id) references public.tasks(project_id,id)
);
create index task_dependencies_successor_idx on public.task_dependencies(project_id,successor_id);
create table public.task_resource_requirements (
  id uuid primary key default gen_random_uuid(),project_id uuid not null, task_id uuid not null,
  resource_id uuid,category text,hard boolean not null default true,
  check((resource_id is null)<>(category is null)), check(category is null or btrim(category)<>''),
  foreign key(project_id,task_id) references public.tasks(project_id,id),
  foreign key(project_id,resource_id) references public.resources(project_id,id)
);
create index task_requirements_task_idx on public.task_resource_requirements(project_id,task_id);
create table public.assignments (
  id uuid primary key default gen_random_uuid(), project_id uuid not null, task_id uuid not null, member_id uuid not null,
  created_at timestamptz not null default now(), status public.assignment_status not null,
  respond_by timestamptz not null, responded_at timestamptz,decline_reason text,release_reason text,
  is_recovery boolean not null default false,recovery_action_id uuid,version integer not null default 1 check(version>0),
  unique(project_id,id), foreign key(project_id,task_id) references public.tasks(project_id,id),
  foreign key(project_id,member_id) references public.members(project_id,id)
);
create unique index assignments_one_active_task on public.assignments(task_id) where status in ('OFFERED','ACCEPTED');
create index assignments_member_idx on public.assignments(project_id,member_id,status);
create index tasks_project_status_idx on public.tasks(project_id,status);
alter table public.tasks enable row level security;
alter table public.task_criteria enable row level security;
alter table public.task_dependencies enable row level security;
alter table public.task_resource_requirements enable row level security;
alter table public.assignments enable row level security;
create policy tasks_read on public.tasks for select to authenticated using(weave_private.is_member(project_id));
create policy criteria_read on public.task_criteria for select to authenticated using(weave_private.is_member(project_id));
create policy dependencies_read on public.task_dependencies for select to authenticated using(weave_private.is_member(project_id));
create policy requirements_read on public.task_resource_requirements for select to authenticated using(weave_private.is_member(project_id));
create policy assignments_read on public.assignments for select to authenticated using(weave_private.is_member(project_id));
revoke all on public.tasks,public.task_criteria,public.task_dependencies,public.task_resource_requirements,public.assignments from public,anon,authenticated,service_role;
grant select on public.tasks,public.task_criteria,public.task_dependencies,public.task_resource_requirements,public.assignments to authenticated;

create function public.mutate_work(p_operation text,p_target_id uuid,p_request jsonb,p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  v_pid uuid; v_actor uuid; v_owner boolean; v_hash text; v_cached public.idempotency_keys;
  v_project public.projects; v_task public.tasks; v_assignment public.assignments; v_member public.members;
  v_item jsonb; v_id uuid; v_aid uuid; v_data jsonb; v_result jsonb; v_version bigint; v_pos integer; v_success integer:=0; v_error text;
begin
  if auth.uid() is null then raise exception using errcode='P0001',message='UNAUTHENTICATED'; end if;
  if p_operation not in ('CREATE','OFFERS','RESPOND','RELEASE','START','STATUS') or p_operation is null
    or p_target_id is null or p_request is null or jsonb_typeof(p_request)<>'object' then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  if p_operation not in ('CREATE','OFFERS') and (jsonb_typeof(p_request->'expected_version') is distinct from 'number' or (p_request->>'expected_version')::integer<1) then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  if p_operation in ('CREATE','OFFERS') then v_pid:=p_target_id;
  elsif p_operation in ('RESPOND','RELEASE') then
    select * into v_assignment from public.assignments where id=p_target_id;
    v_pid:=v_assignment.project_id;
  else select project_id into v_pid from public.tasks where id=p_target_id; end if;
  select id,role='OWNER' into v_actor,v_owner from public.members
    where project_id=v_pid and user_id=auth.uid() and status='APPROVED';
  if v_actor is null or not weave_private.is_member(v_pid) then raise exception using errcode='P0001',message='NOT_FOUND'; end if;
  if p_operation in ('CREATE','OFFERS','STATUS') and not v_owner then raise exception using errcode='P0001',message='FORBIDDEN'; end if;
  if p_operation in ('RESPOND','RELEASE') and v_assignment.member_id<>v_actor then raise exception using errcode='P0001',message='FORBIDDEN'; end if;
  if p_operation='START' and not exists(select 1 from public.assignments where task_id=p_target_id and member_id=v_actor and status='ACCEPTED') then
    raise exception using errcode='P0001',message='FORBIDDEN'; end if;
  v_hash:=md5(jsonb_build_object('target',p_target_id,'body',p_request)::text);
  v_cached:=weave_private.begin_idempotent_request(p_idempotency_key,'WORK_'||p_operation,v_hash);
  if v_cached.user_id is not null then return v_cached.response_body; end if;
  select state_version into v_version from public.projects where id=v_pid;
  v_project:=weave_private.lock_project_for_mutation(v_pid,v_version,p_operation in ('CREATE','OFFERS','STATUS'));
  if p_operation in ('CREATE','OFFERS') and v_project.status<>'ACTIVE' then raise exception using errcode='P0001',message='INVALID_TRANSITION'; end if;
  if p_operation='CREATE' then
    if (p_request-array['title','description','area_id','role_tag','role_required','start_at','due_at','hard_deadline','estimated_minutes','critical','stipend_amount','criteria','depends_on','needs','expected_state_version'])<>'{}'::jsonb
      or jsonb_typeof(p_request->'criteria') is distinct from 'array' or jsonb_array_length(p_request->'criteria') not between 1 and 8
      or jsonb_typeof(p_request->'depends_on') is distinct from 'array' or jsonb_typeof(p_request->'needs') is distinct from 'array' then
      raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
    if (select count(*) from public.tasks where project_id=v_pid)>=100 then raise exception using errcode='P0001',message='LIMIT_EXCEEDED'; end if;
    if p_request->>'role_tag' is not null and not (p_request->>'role_tag'=any(v_project.role_tags)) then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
    if (p_request->>'due_at')::timestamptz<v_project.starts_at-interval '14 days' or (p_request->>'due_at')::timestamptz>v_project.ends_at+interval '1 day' then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
    insert into public.tasks(project_id,title,description,area_id,role_tag,role_required,start_at,due_at,hard_deadline,estimated_minutes,critical,stipend_amount,origin,created_by)
    values(v_pid,p_request->>'title',p_request->>'description',(p_request->>'area_id')::uuid,p_request->>'role_tag',(p_request->>'role_required')::boolean,
      (p_request->>'start_at')::timestamptz,(p_request->>'due_at')::timestamptz,(p_request->>'hard_deadline')::boolean,
      (p_request->>'estimated_minutes')::integer,(p_request->>'critical')::boolean,(p_request->>'stipend_amount')::bigint,'MANUAL',v_actor) returning id into v_id;
    v_pos:=0;
    for v_item in select value from jsonb_array_elements(p_request->'criteria') loop
      insert into public.task_criteria(project_id,task_id,position,description,critical,photo_expected)
        values(v_pid,v_id,v_pos,v_item->>'description',(v_item->>'critical')::boolean,(v_item->>'photo_expected')::boolean); v_pos:=v_pos+1;
    end loop;
    for v_item in select value from jsonb_array_elements(p_request->'depends_on') loop
      insert into public.task_dependencies(project_id,predecessor_id,successor_id,kind) values(v_pid,(v_item->>'task_id')::uuid,v_id,(v_item->>'kind')::public.dependency_kind);
    end loop;
    for v_item in select value from jsonb_array_elements(p_request->'needs') loop
      insert into public.task_resource_requirements(project_id,task_id,resource_id,category,hard) values(v_pid,v_id,(v_item->>'resource_id')::uuid,v_item->>'category',(v_item->>'hard')::boolean);
    end loop;
    v_data:=jsonb_build_object('task_id',v_id,'assignment_id',null);
  elsif p_operation='OFFERS' then
    if (p_request-array['offers'])<>'{}'::jsonb or jsonb_typeof(p_request->'offers') is distinct from 'array'
      or jsonb_array_length(p_request->'offers') not between 1 and 100 then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
    v_data:='[]';
    for v_item in select value from jsonb_array_elements(p_request->'offers') loop
      begin
      if (v_item-array['task_id','member_id','respond_by'])<>'{}'::jsonb then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
      select * into v_task from public.tasks where id=(v_item->>'task_id')::uuid and project_id=v_pid for update;
      if not found then raise exception using errcode='P0001',message='NOT_FOUND'; end if;
      if v_task.status<>'OPEN' then raise exception using errcode='P0001',message='ALREADY_ASSIGNED'; end if;
      select * into v_member from public.members where id=(v_item->>'member_id')::uuid and project_id=v_pid and status='APPROVED';
      if not found then raise exception using errcode='P0001',message='CONSTRAINT_VIOLATION'; end if;
      if v_member.presence='UNAVAILABLE' or (v_member.presence='NOT_ARRIVED' and coalesce(v_task.start_at,v_task.due_at-make_interval(mins=>v_task.estimated_minutes))<=now()+interval '30 minutes') or (v_task.role_required and not(v_task.role_tag=any(v_member.role_tags)))
        or (select count(*) from public.assignments where member_id=v_member.id and status in ('OFFERED','ACCEPTED'))>=2
        or (v_task.critical and exists(select 1 from public.assignments a join public.tasks t on t.id=a.task_id
          where a.member_id=v_member.id and a.status in ('OFFERED','ACCEPTED') and t.critical
          and tstzrange(coalesce(t.start_at,t.due_at-make_interval(mins=>t.estimated_minutes)),t.due_at,'[)') &&
              tstzrange(coalesce(v_task.start_at,v_task.due_at-make_interval(mins=>v_task.estimated_minutes)),v_task.due_at,'[)'))) then
        raise exception using errcode='P0001',message='CONSTRAINT_VIOLATION'; end if;
      if not coalesce((v_member.availability->>'whole_event')::boolean,false) and not exists(
        select 1 from jsonb_array_elements(v_member.availability->'windows') w
        where (w->>'from')::timestamptz<=coalesce(v_task.start_at,v_task.due_at-make_interval(mins=>v_task.estimated_minutes)) and (w->>'to')::timestamptz>=v_task.due_at) then
        raise exception using errcode='P0001',message='CONSTRAINT_VIOLATION'; end if;
      if v_item ? 'respond_by' and (v_item->>'respond_by')::timestamptz<=now() then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
      insert into public.assignments(project_id,task_id,member_id,status,respond_by) values(v_pid,v_task.id,v_member.id,'OFFERED',coalesce((v_item->>'respond_by')::timestamptz,now()+interval '30 minutes')) returning id into v_aid;
      update public.tasks set status='OFFERED',version=version+1 where id=v_task.id;
      v_data:=v_data||jsonb_build_array(jsonb_build_object('task_id',v_task.id,'assignment_id',v_aid,'error',null)); v_success:=v_success+1;
      exception when others then
        v_error:=case when SQLSTATE='P0001' and SQLERRM in ('NOT_FOUND','ALREADY_ASSIGNED','CONSTRAINT_VIOLATION','VALIDATION_FAILED') then SQLERRM else 'VALIDATION_FAILED' end;
        v_data:=v_data||jsonb_build_array(jsonb_build_object('task_id',v_item->>'task_id','assignment_id',null,'error',v_error));
      end;
    end loop;
  else
    if p_operation in ('RESPOND','RELEASE') then
      select * into v_assignment from public.assignments where id=p_target_id for update;
      select * into v_task from public.tasks where id=v_assignment.task_id for update;
      if v_assignment.version<>(p_request->>'expected_version')::integer then raise exception using errcode='P0001',message='VERSION_CONFLICT'; end if;
    else
      select * into v_task from public.tasks where id=p_target_id for update;
      if v_task.version<>(p_request->>'expected_version')::integer then raise exception using errcode='P0001',message='VERSION_CONFLICT'; end if;
      select * into v_assignment from public.assignments where task_id=v_task.id and status in ('OFFERED','ACCEPTED');
    end if;
    v_id:=v_task.id; v_aid:=v_assignment.id;
    if p_operation='RESPOND' then
      if v_assignment.status<>'OFFERED' or v_task.status<>'OFFERED' or v_assignment.respond_by<=now() or coalesce(p_request->>'response','') not in ('ACCEPT','DECLINE') then raise exception using errcode='P0001',message='INVALID_TRANSITION'; end if;
      update public.assignments set status=case when p_request->>'response'='ACCEPT' then 'ACCEPTED'::public.assignment_status else 'DECLINED'::public.assignment_status end,
        responded_at=now(),decline_reason=p_request->>'reason',version=version+1 where id=v_aid;
      update public.tasks set status=case when p_request->>'response'='ACCEPT' then 'ACCEPTED'::public.task_status else 'OPEN'::public.task_status end,version=version+1 where id=v_id;
    elsif p_operation='RELEASE' then
      if v_assignment.status<>'ACCEPTED' or v_task.status not in ('ACCEPTED','IN_PROGRESS','CHANGES_REQUESTED') then raise exception using errcode='P0001',message='INVALID_TRANSITION'; end if;
      if coalesce(btrim(p_request->>'reason'),'')='' then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
      update public.assignments set status='RELEASED',release_reason=p_request->>'reason',version=version+1 where id=v_aid;
      update public.tasks set status='OPEN',version=version+1 where id=v_id;
    elsif p_operation='START' then
      if v_task.status<>'ACCEPTED' then raise exception using errcode='P0001',message='INVALID_TRANSITION'; end if;
      if exists(select 1 from public.task_dependencies d join public.tasks t on t.id=d.predecessor_id where d.successor_id=v_id and d.kind='HARD' and t.status<>'APPROVED') then raise exception using errcode='P0001',message='CONSTRAINT_VIOLATION'; end if;
      if exists(select 1 from public.task_resource_requirements n join public.resources r on r.id=n.resource_id where n.task_id=v_id and n.hard and (r.condition in ('FAILED','MISSING') or r.inventory_state='TO_ACQUIRE')) then raise exception using errcode='P0001',message='CONSTRAINT_VIOLATION'; end if;
      update public.tasks set status='IN_PROGRESS',version=version+1 where id=v_id;
    elsif p_operation='STATUS' then
      if v_task.status in ('APPROVED','CANCELLED') or coalesce(p_request->>'action','') not in ('CANCEL','DEFER','REOPEN','REVOKE')
        or (p_request->>'action'='REOPEN' and v_task.status<>'DEFERRED')
        or (p_request->>'action'='REVOKE' and v_assignment.id is null) then raise exception using errcode='P0001',message='INVALID_TRANSITION'; end if;
      update public.assignments set status='RELEASED',release_reason=p_request->>'reason',version=version+1 where task_id=v_id and status in ('OFFERED','ACCEPTED');
      update public.tasks set status=case p_request->>'action' when 'CANCEL' then 'CANCELLED'::public.task_status when 'DEFER' then 'DEFERRED'::public.task_status else 'OPEN'::public.task_status end,version=version+1 where id=v_id;
    end if;
    v_data:=jsonb_build_object('task_id',v_id,'assignment_id',v_aid);
  end if;
  if p_operation<>'OFFERS' or v_success>0 then
    v_version:=weave_private.finish_project_mutation(v_pid,v_project.state_version,'WORK_'||p_operation,'ALL',jsonb_build_object('operation',p_operation),array[v_actor],'task',v_id);
  else v_version:=v_project.state_version; end if;
  v_result:=jsonb_build_object('data',v_data,'meta',jsonb_build_object('state_version',v_version));
  perform weave_private.save_idempotent_response(p_idempotency_key,'WORK_'||p_operation,v_hash,200,v_result);
  return v_result;
exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow or numeric_value_out_of_range or not_null_violation or check_violation then
  raise exception using errcode='P0001',message='VALIDATION_FAILED';
when foreign_key_violation or unique_violation then raise exception using errcode='P0001',message='CONSTRAINT_VIOLATION';
end;
$$;
revoke all on function public.mutate_work(text,uuid,jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function public.mutate_work(text,uuid,jsonb,uuid) to authenticated;
