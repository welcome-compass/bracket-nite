-- Bracket Nite: one row per tournament. The whole aggregate (entries, order,
-- matches, guests, votes) lives in `data`; `revision` serializes writes.
--
-- The Next.js server uses the service role key, which bypasses RLS.
-- anon and authenticated get no grants and no policies, so the public
-- Data API cannot read brackets, guest hashes or votes.

create table public.tournaments (
  id uuid primary key,
  owner text not null,
  data jsonb not null,
  revision integer not null default 0,
  created timestamptz not null default now(),
  constraint tournaments_owner_email check (owner = lower(owner) and owner like '%@%'),
  constraint tournaments_revision check (revision >= 0)
);

create index tournaments_owner_created_idx on public.tournaments (owner, created desc);

alter table public.tournaments enable row level security;
alter table public.tournaments force row level security;

revoke all on table public.tournaments from anon, authenticated;
grant select, insert, update, delete on table public.tournaments to service_role;

create policy tournaments_service_role on public.tournaments
  for all to service_role using (true) with check (true);
