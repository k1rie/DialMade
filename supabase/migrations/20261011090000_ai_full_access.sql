-- Dialmade: «Acceso completo» to the hosted AI, per account.
--
-- Additive and idempotent: one new table and one insert that skips rows already there. Apply it after
-- 20261010150000_auth_designs.sql. Nothing existing is altered.
--
-- An account listed here gets, on the server's key (apps/web/src/lib/ai/fullAccess.ts):
-- - many more uses per month and requests per day than the free tier (the global monthly budget,
--   DIALMADE_AI_MONTHLY_BUDGET_USD, still caps everything: it is the hard spending limit);
-- - in «Diseño con IA», every finish (Maqueta · Presentable · Producto final) and every model (Haiku, Sonnet, Opus).
-- Anonymous devices never get it: the server checks the Better Auth session on every request.
--
-- Same rules as the other app tables: private schema, RLS on, no policies, only the web server reads it.

create table if not exists dialmade.ai_full_access (
  user_id text primary key references dialmade_auth."user" (id) on delete cascade,
  granted_at timestamptz not null default now(),
  note text
);

comment on table dialmade.ai_full_access is 'Accounts with full access to the hosted AI (more uses, every tier and model of «Diseño con IA»). Read by the web server only.';

alter table dialmade.ai_full_access enable row level security;
revoke all on table dialmade.ai_full_access from public, anon, authenticated;

-- Every account that exists when this runs (2026-10-11: only the owner's) gets it. New accounts do not.
insert into dialmade.ai_full_access (user_id, note)
select id, 'existing account when full access was created'
from dialmade_auth."user"
where not coalesce("isAnonymous", false)
on conflict (user_id) do nothing;
