create table if not exists sandbox_leases (
  user_id uuid primary key,
  lease_id uuid not null unique,
  workspace_id uuid not null unique,
  lesson_id text not null,
  state text not null check (state in ('ALLOCATING','ACTIVE','FAILED','DELETING','REMOVED')),
  operation_token uuid,
  command_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sandbox_leases_state_idx on sandbox_leases(state);
revoke all on sandbox_leases from anon, authenticated;
