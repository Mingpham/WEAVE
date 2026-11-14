-- WP-0-DB: resources storage, specification §7.3 / §12.2.
-- Condition/location are stored projections. Engine/RPC application follows;
-- no SQL inference or direct application writes are introduced here.
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  created_at timestamptz not null default now(),
  name text not null check (btrim(name) <> ''),
  category text not null check (btrim(category) <> ''),
  kind public.resource_kind not null,
  quantity integer,
  inventory_state public.inventory_state not null,
  condition public.resource_condition not null default 'UNKNOWN',
  area_id uuid,
  custodian_member_id uuid,
  notes text,
  version integer not null default 1 check (version >= 1),
  unique (project_id, id),
  constraint resources_supply_quantity check (
    (quantity is null or quantity >= 0) and (kind = 'SUPPLY' or quantity is null)
  ),
  constraint resources_area_project_fk foreign key (project_id, area_id)
    references public.areas(project_id, id),
  constraint resources_custodian_project_fk foreign key (project_id, custodian_member_id)
    references public.members(project_id, id)
);
create index resources_project_category_idx on public.resources(project_id, category);
create index resources_area_idx on public.resources(project_id, area_id)
  where area_id is not null;
create index resources_custodian_idx on public.resources(project_id, custodian_member_id)
  where custodian_member_id is not null;

alter table public.resources enable row level security;
revoke all on table public.resources from public, anon, authenticated, service_role;
grant select on table public.resources to authenticated, service_role;
create policy resources_member_read on public.resources for select to authenticated
  using (weave_private.is_member(project_id));
