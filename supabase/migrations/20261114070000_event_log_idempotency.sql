-- WP-0-DB storage for §7.3 / §9.1 / §12.2; mutation RPCs follow separately.
-- Event types remain text per §7.3; future RPCs validate canonical §9.7 contracts.
create table public.event_log (
  id bigserial primary key,
  project_id uuid not null references public.projects(id),
  created_at timestamptz not null default now(),
  state_version bigint not null check (state_version >= 0),
  event_type text not null,
  actor_kind public.actor_kind not null,
  actor_member_id uuid,
  entity_type text,
  entity_id uuid,
  payload jsonb not null default '{}',
  visibility public.log_visibility not null,
  involved_member_ids uuid[] not null default '{}',
  constraint event_log_actor_project_fk foreign key (project_id, actor_member_id)
    references public.members(project_id, id)
);
create index event_log_project_timeline_idx on public.event_log(project_id, id desc);
create index event_log_project_version_idx on public.event_log(project_id, state_version);
create index event_log_actor_idx on public.event_log(project_id, actor_member_id)
  where actor_member_id is not null;
create index event_log_involved_members_idx on public.event_log using gin(involved_member_ids);

-- Array references have no native FK syntax. These integrity-only triggers
-- enforce same-project existence and retain historical references after removal.
create function weave_private.check_event_involved_members()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_member_id uuid;
begin
  for v_member_id in
    select distinct member_id from unnest(new.involved_member_ids) as ids(member_id)
    order by member_id
  loop
    if v_member_id is null then
      raise exception using errcode = '23502', message = 'Event involved member cannot be null',
        table = 'event_log', column = 'involved_member_ids';
    end if;
    perform 1 from public.members m
      where m.project_id = new.project_id and m.id = v_member_id for key share;
    if not found then
      raise exception using errcode = '23503', message = 'Event involved member must belong to its project',
        constraint = 'event_log_involved_member_project_fk';
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function weave_private.check_event_involved_members()
  from public, anon, authenticated, service_role;
create trigger event_log_check_involved_members
  before insert or update of project_id, involved_member_ids on public.event_log
  for each row execute function weave_private.check_event_involved_members();

create function weave_private.restrict_event_involved_member_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.id = old.id and new.project_id = old.project_id then
      return new;
    end if;
  end if;
  -- Native FKs have cross-snapshot machinery unavailable to this array check.
  -- Stronger transaction snapshots can miss a newly committed event reference.
  -- Future deletion/rekey RPCs must use READ COMMITTED; ordinary profile/status
  -- updates do not change these keys and are unaffected.
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception using errcode = '40001',
      message = 'Member identity changes require READ COMMITTED';
  end if;
  if exists (
    select 1 from public.event_log e where e.project_id = old.project_id
      and e.involved_member_ids @> array[old.id]
  ) then
    raise exception using errcode = '23503', message = 'Member is referenced by event history',
      constraint = 'event_log_involved_member_project_fk';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function weave_private.restrict_event_involved_member_change()
  from public, anon, authenticated, service_role;
create trigger members_restrict_event_involved_change
  before delete or update of project_id, id on public.members
  for each row execute function weave_private.restrict_event_involved_member_change();

create table public.idempotency_keys (
  user_id uuid not null,
  key uuid not null,
  created_at timestamptz not null default now(),
  operation text not null,
  request_hash text not null,
  response_status integer not null,
  response_body jsonb not null,
  primary key (user_id, key)
);
-- Supports the future POL.IDEMPOTENCY_TTL_HOURS cleanup; no TTL job is installed.
create index idempotency_keys_created_at_idx on public.idempotency_keys(created_at);

alter table public.event_log enable row level security;
alter table public.idempotency_keys enable row level security;
revoke all on table public.event_log, public.idempotency_keys
  from public, anon, authenticated, service_role;
revoke all on sequence public.event_log_id_seq from public, anon, authenticated, service_role;
grant select on table public.event_log to authenticated, service_role;
grant select on table public.idempotency_keys to service_role;

create policy event_log_scoped_read on public.event_log for select to authenticated
  using (
    weave_private.is_member(project_id) and (
      visibility = 'ALL' or weave_private.is_owner(project_id) or (
        visibility = 'INVOLVED' and exists (
          select 1 from public.members m
          where m.project_id = event_log.project_id and m.user_id = (select auth.uid())
            and m.id = any(event_log.involved_member_ids)
        )
      )
    )
  );
-- No policies on idempotency_keys: app roles cannot read even their own cached
-- responses. Only future guarded RPCs may write either table or use the sequence.
