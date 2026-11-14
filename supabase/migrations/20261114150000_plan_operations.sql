-- Owner-only planning. Caller JWT, project lock and replay lock share one transaction.
alter table public.plan_drafts add column reviewed_revision integer;

create function weave_private.plan_data(p_project_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',d.id,'project_id',d.project_id,'revision',d.revision,'status',d.status,'draft',d.draft,
 'ai_turns_used',d.ai_turns_used,'last_error',d.last_error,'reviewed_revision',d.reviewed_revision,
 'state_version',p.state_version,'starts_at',p.starts_at,'ends_at',p.ends_at,'timezone',p.timezone,'ai_available',false,
 'messages',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'role',m.role,'text',m.text,'created_at',m.created_at,'payload',m.payload) order by m.created_at,m.id)
 from public.plan_messages m where m.project_id=p.id and m.draft_id=d.id),'[]'::jsonb))
 from public.plan_drafts d join public.projects p on p.id=d.project_id where p.id=p_project_id and p.deleted_at is null;
$$;
create function public.get_plan(p_project_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception using errcode='P0001',message='UNAUTHENTICATED'; end if;
 if not weave_private.is_owner(p_project_id) then raise exception using errcode='P0001',message='NOT_FOUND'; end if;
 return weave_private.plan_data(p_project_id);
end; $$;

create function weave_private.validate_plan(p jsonb, p_start timestamptz, p_end timestamptz) returns void
language plpgsql security invoker set search_path='' as $$
declare r jsonb; t jsonb; n jsonb; c text; keys text[] := '{}'; roles text[]; duration numeric;
begin
 if p is null or jsonb_typeof(p)<>'object' then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
 foreach c in array array['areas','tasks','resources','role_tags','questions','assumptions','gaps'] loop
  if jsonb_typeof(p->c) is distinct from 'array' then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
 end loop;
 if jsonb_array_length(p->'tasks')>100 or jsonb_array_length(p->'resources')>100 or jsonb_array_length(p->'areas')>30 or jsonb_array_length(p->'role_tags')>12 then
  raise exception using errcode='P0001',message='LIMIT_EXCEEDED'; end if;
 select coalesce(array_agg(value),'{}') into roles from jsonb_array_elements_text(p->'role_tags');
 if exists(select 1 from unnest(roles) role where role !~ '^[a-z0-9][a-z0-9 -]{0,31}$') or cardinality(roles)<>(select count(distinct role) from unnest(roles) role) then
  raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
 foreach c in array array['areas','tasks','resources'] loop
  for r in select value from jsonb_array_elements(p->c) loop
   if coalesce(r->>'key','') !~ '^[a-z0-9][a-z0-9_-]{0,63}$' or r->>'key'=any(keys)
    or coalesce(r->>'origin','') not in ('AI','HUMAN') or jsonb_typeof(r->'locked') is distinct from 'boolean' then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
   keys:=array_append(keys,r->>'key');
   if c<>'tasks' and (char_length(btrim(coalesce(r->>'name',''))) not between 1 and case when c='areas' then 60 else 80 end) then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
   if c<>'areas' and r->>'area_key' is not null and not exists(select 1 from jsonb_array_elements(p->'areas') a where a->>'key'=r->>'area_key') then
    raise exception using errcode='P0001',message='CONSTRAINT_VIOLATION'; end if;
  end loop;
 end loop;
 if exists(select 1 from jsonb_array_elements(p->'areas') a group by lower(btrim(a->>'name')) having count(*)>1) then
  raise exception using errcode='P0001',message='CONSTRAINT_VIOLATION'; end if;
 for r in select value from jsonb_array_elements(p->'resources') loop
  if coalesce(r->>'kind','') not in ('ITEM','SUPPLY') or coalesce(r->>'inventory_state','') not in ('CONFIRMED','REPORTED','UNVERIFIED','TO_ACQUIRE')
   or char_length(btrim(coalesce(r->>'category',''))) not between 1 and 32
   or (r->>'quantity' is not null and ((r->>'quantity')::integer<0 or r->>'kind'='ITEM')) then
   raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
 end loop;
 duration:=extract(epoch from (p_end-p_start))/60+1440;
 for t in select value from jsonb_array_elements(p->'tasks') loop
  if jsonb_typeof(t->'due_offset_min') is distinct from 'number' or jsonb_typeof(t->'estimated_minutes') is distinct from 'number'
   or jsonb_typeof(t->'criteria') is distinct from 'array' or jsonb_typeof(t->'depends_on') is distinct from 'array' or jsonb_typeof(t->'needs') is distinct from 'array'
   or jsonb_typeof(t->'role_required') is distinct from 'boolean' or jsonb_typeof(t->'critical') is distinct from 'boolean' or jsonb_typeof(t->'hard_deadline') is distinct from 'boolean'
   or char_length(btrim(coalesce(t->>'title',''))) not between 3 and 80 or char_length(coalesce(t->>'description',''))>1000
   or coalesce((t->>'estimated_minutes')::integer,0)<=0 or (t->>'due_offset_min')::integer not between -20160 and duration
   or coalesce((t->>'start_offset_min')::integer,(t->>'due_offset_min')::integer-(t->>'estimated_minutes')::integer)>=(t->>'due_offset_min')::integer
   or jsonb_array_length(t->'criteria') not between 1 and 8 or (t->>'stipend_amount')::bigint<0
   or (t->>'role_tag' is not null and not(t->>'role_tag'=any(roles))) then
   raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  for r in select value from jsonb_array_elements(t->'criteria') loop
   if char_length(btrim(coalesce(r->>'description',''))) not between 1 and 200 or jsonb_typeof(r->'critical') is distinct from 'boolean' or jsonb_typeof(r->'photo_expected') is distinct from 'boolean' then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  end loop;
  for r in select value from jsonb_array_elements(t->'depends_on') loop
   if r->>'kind' not in ('HARD','SOFT') or not exists(select 1 from jsonb_array_elements(p->'tasks') d where d->>'key'=r->>'task_key') then
    raise exception using errcode='P0001',message='CONSTRAINT_VIOLATION'; end if;
  end loop;
  for n in select value from jsonb_array_elements(t->'needs') loop
   if (n->>'resource_key' is null)=(n->>'category' is null) or (n->>'category' is not null and btrim(n->>'category')='')
    or (n->>'resource_key' is not null and not exists(select 1 from jsonb_array_elements(p->'resources') d where d->>'key'=n->>'resource_key')) then
    raise exception using errcode='P0001',message='CONSTRAINT_VIOLATION'; end if;
  end loop;
 end loop;
 if exists(with recursive edges as (select task_item->>'key' src,dep_item->>'task_key' dst from jsonb_array_elements(p->'tasks') task_item cross join lateral jsonb_array_elements(task_item->'depends_on') dep_item),
 walk(src,dst,path,cycle) as (select src,dst,array[src,dst],src=dst from edges union all select w.src,e.dst,w.path||e.dst,e.dst=any(w.path) from walk w join edges e on e.src=w.dst where not w.cycle)
 select 1 from walk where cycle) then raise exception using errcode='P0001',message='DEPENDENCY_CYCLE'; end if;
end; $$;

create function public.mutate_plan(p_project_id uuid,p_expected_state_version bigint,p_expected_revision integer,p_request jsonb,p_draft jsonb,p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.projects; d public.plan_drafts; cached public.idempotency_keys; h text; op text; result jsonb; row jsonb; child jsonb; item jsonb;
 v uuid; actor uuid; area_ids jsonb:='{}'; resource_ids jsonb:='{}'; task_ids jsonb:='{}'; version bigint; position integer;
begin
 if auth.uid() is null then raise exception using errcode='P0001',message='UNAUTHENTICATED'; end if;
 if not weave_private.is_owner(p_project_id) then raise exception using errcode='P0001',message='NOT_FOUND'; end if;
 if p_expected_revision is null or p_expected_revision<1 or jsonb_typeof(p_request->'ops') is distinct from 'array' or jsonb_array_length(p_request->'ops')>100 then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
 op:=case when coalesce((p_request->>'publish')::boolean,false) then 'PUBLISH_PLAN' else 'PATCH_PLAN' end;
 h:=md5(jsonb_build_object('project',p_project_id,'state',p_expected_state_version,'revision',p_expected_revision,'request',p_request,'draft',p_draft)::text);
 cached:=weave_private.begin_idempotent_request(p_idempotency_key,op,h);
 if cached.user_id is not null then return cached.response_body; end if;
 select * into p from public.projects where id=p_project_id and deleted_at is null for update;
 select * into d from public.plan_drafts where project_id=p_project_id for update;
 -- A second publish of the acknowledged revision creates no duplicate rows.
 if op='PUBLISH_PLAN' and d.status='PUBLISHED' and d.revision=p_expected_revision and d.draft=p_draft then
  result:=weave_private.plan_data(p_project_id);
  perform weave_private.save_idempotent_response(p_idempotency_key,op,h,200,result);
  return result;
 end if;
 p:=weave_private.lock_project_for_mutation(p_project_id,p_expected_state_version,true);
 if d.revision<>p_expected_revision then raise exception using errcode='P0001',message='VERSION_CONFLICT'; end if;
 if d.status<>'EDITING' or p.status<>'DRAFT' then raise exception using errcode='P0001',message='INVALID_TRANSITION'; end if;
 perform weave_private.validate_plan(p_draft,p.starts_at,p.ends_at);
 -- Locked/manual provenance is mandatory for every item supplied by a manual write.
 for row in select value from jsonb_array_elements(p_request->'ops') loop
  if row->>'collection' not in ('tasks','resources','areas','role_tags') or row->>'op' not in ('UPSERT','DELETE','UNLOCK','LOCK') then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  if row->>'op'='UPSERT' and row->>'collection'<>'role_tags' and not exists(select 1 from jsonb_array_elements(p_draft->(row->>'collection')) x where x->>'key'=row->>'key' and x->>'origin'='HUMAN' and x->>'locked'='true') then
   raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
 end loop;
 if op='PUBLISH_PLAN' then
  if d.reviewed_revision is distinct from d.revision or d.draft is distinct from p_draft or jsonb_array_length(p_draft->'tasks')=0 then
   raise exception using errcode='P0001',message='INVALID_TRANSITION'; end if;
  select id into actor from public.members where project_id=p_project_id and user_id=auth.uid() and role='OWNER' and status='APPROVED';
  for row in select value from jsonb_array_elements(p_draft->'areas') loop
   insert into public.areas(project_id,name,notes) values(p_project_id,row->>'name',row->>'notes') returning id into v;
   area_ids:=area_ids||jsonb_build_object(row->>'key',v);
  end loop;
  for row in select value from jsonb_array_elements(p_draft->'resources') loop
   if row->>'custodian_member_id' is not null and not exists(select 1 from public.members where project_id=p_project_id and id=(row->>'custodian_member_id')::uuid and status='APPROVED') then raise exception using errcode='P0001',message='CONSTRAINT_VIOLATION'; end if;
   insert into public.resources(project_id,name,category,kind,quantity,inventory_state,area_id,custodian_member_id,notes)
   values(p_project_id,row->>'name',row->>'category',(row->>'kind')::public.resource_kind,(row->>'quantity')::integer,(row->>'inventory_state')::public.inventory_state,(area_ids->>(row->>'area_key'))::uuid,(row->>'custodian_member_id')::uuid,row->>'reason') returning id into v;
   resource_ids:=resource_ids||jsonb_build_object(row->>'key',v);
  end loop;
  for row in select value from jsonb_array_elements(p_draft->'tasks') loop
   insert into public.tasks(project_id,title,description,area_id,role_tag,role_required,start_at,due_at,hard_deadline,estimated_minutes,critical,stipend_amount,origin,created_by)
   values(p_project_id,row->>'title',row->>'description',(area_ids->>(row->>'area_key'))::uuid,row->>'role_tag',(row->>'role_required')::boolean,
    p.starts_at+(row->>'start_offset_min')::integer*interval '1 minute',p.starts_at+(row->>'due_offset_min')::integer*interval '1 minute',
    (row->>'hard_deadline')::boolean,(row->>'estimated_minutes')::integer,(row->>'critical')::boolean,(row->>'stipend_amount')::bigint,'PLAN',actor) returning id into v;
   task_ids:=task_ids||jsonb_build_object(row->>'key',v);position:=0;
   for child in select value from jsonb_array_elements(row->'criteria') loop
    insert into public.task_criteria(project_id,task_id,position,description,critical,photo_expected) values(p_project_id,v,position,child->>'description',(child->>'critical')::boolean,(child->>'photo_expected')::boolean);position:=position+1;
   end loop;
  end loop;
  for row in select value from jsonb_array_elements(p_draft->'tasks') loop
   v:=(task_ids->>(row->>'key'))::uuid;
   for child in select value from jsonb_array_elements(row->'depends_on') loop
    insert into public.task_dependencies(project_id,predecessor_id,successor_id,kind) values(p_project_id,(task_ids->>(child->>'task_key'))::uuid,v,(child->>'kind')::public.dependency_kind);
   end loop;
   for child in select value from jsonb_array_elements(row->'needs') loop
    insert into public.task_resource_requirements(project_id,task_id,resource_id,category,hard) values(p_project_id,v,(resource_ids->>(child->>'resource_key'))::uuid,child->>'category',(child->>'hard')::boolean);
   end loop;
  end loop;
  update public.projects set status='ACTIVE',role_tags=array(select jsonb_array_elements_text(p_draft->'role_tags')) where id=p_project_id;
  update public.plan_drafts set status='PUBLISHED' where id=d.id;
 else
  update public.plan_drafts set draft=p_draft,revision=revision+1,last_error=null,
   reviewed_revision=case when coalesce((p_request->>'finalize')::boolean,false) then revision+1 else null end where id=d.id;
 end if;
 version:=weave_private.finish_project_mutation(p_project_id,p_expected_state_version,case when op='PUBLISH_PLAN' then 'PLAN_PUBLISHED' else 'PLAN_DRAFT_UPDATED' end,case when op='PUBLISH_PLAN' then 'ALL'::public.log_visibility else 'OWNER'::public.log_visibility end);
 result:=weave_private.plan_data(p_project_id);
 perform weave_private.save_idempotent_response(p_idempotency_key,op,h,200,result);
 return result;
exception when invalid_text_representation or numeric_value_out_of_range or not_null_violation or check_violation or unique_violation or foreign_key_violation then
 raise exception using errcode='P0001',message='VALIDATION_FAILED';
end; $$;
revoke all on function weave_private.plan_data(uuid), weave_private.validate_plan(jsonb,timestamptz,timestamptz) from public,anon,authenticated,service_role;
revoke all on function public.get_plan(uuid), public.mutate_plan(uuid,bigint,integer,jsonb,jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_plan(uuid), public.mutate_plan(uuid,bigint,integer,jsonb,jsonb,uuid) to authenticated;
