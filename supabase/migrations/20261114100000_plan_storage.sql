-- WP-0-DB: §7.3 plan storage and §12.2 owner-only reads.
-- Canonical PlanDraft JSON validation, compose/publish transitions, engine gaps
-- and locked-field merging remain guarded RPC/TypeScript responsibilities.
create table public.plan_drafts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  created_at timestamptz not null default now(),
  revision integer not null default 1 check (revision >= 1),
  draft jsonb not null,
  status public.draft_status not null default 'EDITING',
  ai_turns_used integer not null default 0 check (ai_turns_used >= 0),
  last_error text,
  unique (project_id),
  unique (project_id, id)
);

create table public.plan_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  created_at timestamptz not null default now(),
  draft_id uuid not null,
  role text not null check (role in ('ORGANIZER', 'AI', 'SYSTEM')),
  text text not null,
  payload jsonb,
  constraint plan_messages_draft_project_fk foreign key (project_id, draft_id)
    references public.plan_drafts(project_id, id)
);
create index plan_messages_draft_timeline_idx
  on public.plan_messages(project_id, draft_id, created_at, id);

alter table public.plan_drafts enable row level security;
alter table public.plan_messages enable row level security;
revoke all on table public.plan_drafts, public.plan_messages
  from public, anon, authenticated, service_role;
grant select on table public.plan_drafts, public.plan_messages to authenticated, service_role;
create policy plan_drafts_owner_read on public.plan_drafts for select to authenticated
  using (weave_private.is_owner(project_id));
create policy plan_messages_owner_read on public.plan_messages for select to authenticated
  using (weave_private.is_owner(project_id));
-- No application write policies or direct service mutations. Future definer
-- endpoints append messages only; deletion is reserved for project purge.
