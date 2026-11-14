-- WP-0-DB: §7.3 foundation; §12.1–12.2 read isolation.
-- No mutation RPCs or engine inference. Writes remain unavailable to app roles.
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  owner_user_id uuid not null references auth.users(id),
  title text not null check (char_length(title) between 3 and 80),
  brief text not null check (char_length(brief) between 40 and 4000),
  venue_name text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null,
  expected_team_size integer not null check (expected_team_size >= 2),
  expected_attendees integer check (expected_attendees >= 0),
  currency text not null default 'VND',
  status public.project_status not null default 'DRAFT',
  state_version bigint not null default 0 check (state_version >= 0),
  role_tags text[] not null default '{}',
  settings jsonb not null check (jsonb_typeof(settings) = 'object'),
  closed_at timestamptz,
  deleted_at timestamptz,
  constraint projects_event_window check (
    ends_at > starts_at and ends_at <= starts_at + interval '72 hours'
  )
);
create index projects_owner_user_id_idx on public.projects(owner_user_id);

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  created_at timestamptz not null default now(),
  name text not null check (btrim(name) <> ''),
  name_norm text generated always as (lower(btrim(name))) stored not null,
  notes text,
  unique (project_id, id),
  unique (project_id, name_norm)
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id),
  role public.member_role not null,
  status public.member_status not null,
  nickname text not null check (char_length(btrim(nickname)) between 2 and 24),
  nickname_norm text generated always as (lower(btrim(nickname))) stored not null,
  role_tags text[] not null default '{}',
  availability jsonb not null check (jsonb_typeof(availability) = 'object'),
  presence public.member_presence not null default 'NOT_ARRIVED',
  current_area_id uuid,
  consent_at timestamptz,
  consent_version text,
  decided_by uuid,
  decided_at timestamptz,
  version integer not null default 1 check (version >= 1),
  unique (project_id, id),
  unique (project_id, user_id),
  constraint members_owner_approved check (role <> 'OWNER' or status = 'APPROVED'),
  constraint members_current_area_project_fk foreign key (project_id, current_area_id)
    references public.areas(project_id, id),
  constraint members_decided_by_project_fk foreign key (project_id, decided_by)
    references public.members(project_id, id)
);
create unique index members_active_nickname_idx on public.members(project_id, nickname_norm)
  where status in ('PENDING', 'APPROVED');
create unique index members_one_owner_idx on public.members(project_id) where role = 'OWNER';
create index members_user_id_idx on public.members(user_id);
create index members_current_area_idx on public.members(project_id, current_area_id)
  where current_area_id is not null;
create index members_decided_by_idx on public.members(project_id, decided_by)
  where decided_by is not null;

-- Helpers live outside the exposed API schemas. Their definer bypasses RLS
-- solely to inspect the caller's membership, avoiding projects/members recursion.
create schema if not exists weave_private;
revoke all on schema weave_private from public, anon, authenticated, service_role;
grant usage on schema weave_private to authenticated, service_role;

create function weave_private.is_member(p_project_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.members m
    join public.projects p on p.id = m.project_id
    where m.project_id = p_project_id and m.user_id = (select auth.uid())
      and m.status = 'APPROVED' and p.deleted_at is null
  );
$$;

create function weave_private.is_owner(p_project_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.members m
    join public.projects p on p.id = m.project_id
    where m.project_id = p_project_id and m.user_id = (select auth.uid())
      and m.role = 'OWNER' and m.status = 'APPROVED'
      and p.owner_user_id = m.user_id and p.deleted_at is null
  );
$$;

create function weave_private.can_read_member(p_member_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.members m
    join public.projects p on p.id = m.project_id
    where m.id = p_member_id and p.deleted_at is null
      and (
        (m.status = 'APPROVED' and weave_private.is_member(m.project_id))
        or (m.status <> 'APPROVED' and (
          m.user_id = (select auth.uid()) or weave_private.is_owner(m.project_id)
        ))
      )
  );
$$;

revoke all on function weave_private.is_member(uuid) from public, anon, authenticated, service_role;
revoke all on function weave_private.is_owner(uuid) from public, anon, authenticated, service_role;
revoke all on function weave_private.can_read_member(uuid) from public, anon, authenticated, service_role;
grant execute on function weave_private.is_member(uuid) to authenticated, service_role;
grant execute on function weave_private.is_owner(uuid) to authenticated, service_role;
grant execute on function weave_private.can_read_member(uuid) to authenticated, service_role;

alter table public.projects enable row level security;
alter table public.members enable row level security;
alter table public.areas enable row level security;
revoke all on table public.projects, public.members, public.areas
  from public, anon, authenticated, service_role;
grant select on table public.projects, public.members, public.areas to authenticated, service_role;

create policy projects_member_read on public.projects for select to authenticated
  using (weave_private.is_member(id));
create policy areas_member_read on public.areas for select to authenticated
  using (weave_private.is_member(project_id));
-- Self access to a non-approved membership is the explicit §12.2 exception;
-- it exposes that own membership row, never a project or area row.
create policy members_scoped_read on public.members for select to authenticated
  using (weave_private.can_read_member(id));
