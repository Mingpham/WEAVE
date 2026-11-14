-- WP-0-DB: §7.3 project invite storage; FR-MEM-01 / §12.2.
-- Generation, rotation, expiry resolution, joining and rate limits follow in
-- guarded RPCs. Expiry alone does not release the partial unique code index.
create table public.project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  created_at timestamptz not null default now(),
  code text not null check (code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$'),
  expires_at timestamptz not null,
  disabled_at timestamptz,
  created_by uuid,
  constraint project_invites_creator_project_fk foreign key (project_id, created_by)
    references public.members(project_id, id)
);
create unique index project_invites_enabled_code_idx on public.project_invites(code)
  where disabled_at is null;
create index project_invites_project_idx on public.project_invites(project_id);
create index project_invites_creator_idx on public.project_invites(project_id, created_by)
  where created_by is not null;

alter table public.project_invites enable row level security;
revoke all on table public.project_invites from public, anon, authenticated, service_role;
grant select on table public.project_invites to authenticated, service_role;
create policy project_invites_owner_read on public.project_invites for select to authenticated
  using (weave_private.is_owner(project_id));
