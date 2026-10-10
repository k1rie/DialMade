-- Dialmade: «Diseño con IA» design sessions (docs/design/diseno-con-ia-spec.md §5.2, user decision 2).
--
-- One free use opens a session: 1 «Generar con IA» of up to 3 screens (plus its art direction) and up to 10 block
-- actions within 24 h. Each paid call inside the session reserves its own worst case against the global monthly
-- budget WITHOUT another free use or IP request, and is settled or released like any other reservation.
-- Additive and idempotent; same privacy and grants as 20261010120000_ai_ledger.sql. Not applied automatically:
-- `supabase db push` before deploying the render routes.

create table if not exists dialmade.ai_render_sessions (
  id uuid primary key default gen_random_uuid(),
  device_id text not null check (char_length(device_id) between 1 and 128),
  month text not null references dialmade.ai_ledger_month (month),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  directions_used integer not null default 0 check (directions_used >= 0),
  directions_max integer not null check (directions_max >= 0),
  screens_used integer not null default 0 check (screens_used >= 0),
  screens_max integer not null check (screens_max >= 0),
  actions_used integer not null default 0 check (actions_used >= 0),
  actions_max integer not null check (actions_max >= 0)
);
comment on table dialmade.ai_render_sessions is '«Diseño con IA»: what one free use opened (screens and block actions left until it expires).';
create index if not exists ai_render_sessions_expires_idx on dialmade.ai_render_sessions (expires_at);
alter table dialmade.ai_render_sessions enable row level security;
revoke all on dialmade.ai_render_sessions from public, anon, authenticated;

alter table dialmade.ai_reservations add column if not exists session_id uuid references dialmade.ai_render_sessions (id);

create or replace function dialmade.ai_session_json(p dialmade.ai_render_sessions)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'directions_used', p.directions_used, 'directions_max', p.directions_max,
    'screens_used', p.screens_used, 'screens_max', p.screens_max,
    'actions_used', p.actions_used, 'actions_max', p.actions_max,
    'expires_at', p.expires_at
  );
$$;
revoke all on function dialmade.ai_session_json(dialmade.ai_render_sessions) from public;

-- Atomic: the same checks and counters as dialmade_ai_reserve (one free use, one IP request), plus the budget check
-- of the session's worst case (not reserved: each call reserves its own). Returns {ok, session_id?, session?, reason?, usage}.
create or replace function public.dialmade_ai_session_open(
  p_device_id text,
  p_ip_hash text,
  p_model text,
  p_amount_usd numeric,
  p_monthly_budget_usd numeric,
  p_free_uses_per_month integer,
  p_max_requests_per_ip_per_day integer,
  p_ttl_seconds integer,
  p_directions integer,
  p_screens integer,
  p_actions integer
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_month text := to_char(v_now at time zone 'utc', 'YYYY-MM');
  v_day date := (v_now at time zone 'utc')::date;
  v_amount numeric := round(p_amount_usd, 6);
  v_spent numeric;
  v_reserved numeric;
  v_used integer;
  v_ip integer;
  v_reason text;
  v_session dialmade.ai_render_sessions%rowtype;
begin
  if p_device_id is null or char_length(p_device_id) not between 1 and 128
     or p_ip_hash is null or char_length(p_ip_hash) not between 1 and 128
     or p_model is null or char_length(p_model) not between 1 and 100 then
    raise exception 'invalid caller' using errcode = '22023';
  end if;
  if p_amount_usd is null or p_amount_usd < 0 or p_monthly_budget_usd is null or p_monthly_budget_usd < 0
     or p_free_uses_per_month is null or p_free_uses_per_month < 0
     or p_max_requests_per_ip_per_day is null or p_max_requests_per_ip_per_day < 0
     or p_ttl_seconds is null or p_ttl_seconds not between 60 and 172800
     or p_directions is null or p_directions not between 0 and 10
     or p_screens is null or p_screens not between 0 and 24
     or p_actions is null or p_actions not between 0 and 100 then
    raise exception 'invalid limits' using errcode = '22023';
  end if;

  perform public.dialmade_ai_expire_reservations(600);

  insert into dialmade.ai_ledger_month (month) values (v_month) on conflict (month) do nothing;
  select m.spent_usd, m.reserved_usd into v_spent, v_reserved from dialmade.ai_ledger_month m where m.month = v_month for update;
  insert into dialmade.ai_usage (month, device_id) values (v_month, p_device_id) on conflict (month, device_id) do nothing;
  select u.free_uses_used into v_used from dialmade.ai_usage u where u.month = v_month and u.device_id = p_device_id for update;
  insert into dialmade.ai_ip_day (day, ip_hash) values (v_day, p_ip_hash) on conflict (day, ip_hash) do nothing;
  select d.requests into v_ip from dialmade.ai_ip_day d where d.day = v_day and d.ip_hash = p_ip_hash for update;

  if v_used >= p_free_uses_per_month then
    v_reason := 'free-tier-exhausted';
  elsif v_ip >= p_max_requests_per_ip_per_day then
    v_reason := 'daily-limit';
  elsif v_spent + v_reserved >= p_monthly_budget_usd or v_spent + v_reserved + v_amount > p_monthly_budget_usd then
    v_reason := 'budget-exceeded';
  end if;
  if v_reason is not null then
    return jsonb_build_object('ok', false, 'reason', v_reason, 'usage', dialmade.ai_usage_of(v_month, p_device_id, v_day, p_ip_hash));
  end if;

  update dialmade.ai_usage set free_uses_used = free_uses_used + 1, updated_at = v_now where month = v_month and device_id = p_device_id;
  update dialmade.ai_ip_day set requests = requests + 1 where day = v_day and ip_hash = p_ip_hash;
  insert into dialmade.ai_render_sessions (device_id, month, expires_at, directions_max, screens_max, actions_max)
  values (p_device_id, v_month, v_now + make_interval(secs => p_ttl_seconds), p_directions, p_screens, p_actions)
  returning * into v_session;

  return jsonb_build_object(
    'ok', true,
    'session_id', v_session.id,
    'session', dialmade.ai_session_json(v_session),
    'usage', dialmade.ai_usage_of(v_month, p_device_id, v_day, p_ip_hash)
  );
end;
$$;

-- Atomic: counts one direction/screen/action of a live session of this device, then reserves the call's worst case
-- against the monthly budget (no free use, no IP request). Returns {ok, reservation_id?, session?, reason?, usage?}.
create or replace function public.dialmade_ai_session_reserve(
  p_session_id uuid,
  p_device_id text,
  p_kind text,
  p_model text,
  p_amount_usd numeric,
  p_monthly_budget_usd numeric
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_month text := to_char(v_now at time zone 'utc', 'YYYY-MM');
  v_day date := (v_now at time zone 'utc')::date;
  v_amount numeric := round(p_amount_usd, 6);
  v_session dialmade.ai_render_sessions%rowtype;
  v_spent numeric;
  v_reserved numeric;
  v_id uuid;
begin
  if p_session_id is null or p_kind not in ('direction', 'screen', 'action') or p_model is null or char_length(p_model) not between 1 and 100
     or p_amount_usd is null or p_amount_usd < 0 or p_monthly_budget_usd is null or p_monthly_budget_usd < 0 then
    raise exception 'invalid session reserve arguments' using errcode = '22023';
  end if;

  perform public.dialmade_ai_expire_reservations(600);

  select * into v_session from dialmade.ai_render_sessions s where s.id = p_session_id for update;
  if not found or v_session.device_id <> p_device_id then
    return jsonb_build_object('ok', false, 'reason', 'not-found');
  end if;
  if v_session.expires_at <= v_now then
    return jsonb_build_object('ok', false, 'reason', 'expired', 'session', dialmade.ai_session_json(v_session));
  end if;
  if (p_kind = 'direction' and v_session.directions_used >= v_session.directions_max)
     or (p_kind = 'screen' and v_session.screens_used >= v_session.screens_max)
     or (p_kind = 'action' and v_session.actions_used >= v_session.actions_max) then
    return jsonb_build_object('ok', false, 'reason', p_kind || 's-exhausted', 'session', dialmade.ai_session_json(v_session));
  end if;

  insert into dialmade.ai_ledger_month (month) values (v_month) on conflict (month) do nothing;
  select m.spent_usd, m.reserved_usd into v_spent, v_reserved from dialmade.ai_ledger_month m where m.month = v_month for update;
  if v_spent + v_reserved >= p_monthly_budget_usd or v_spent + v_reserved + v_amount > p_monthly_budget_usd then
    return jsonb_build_object('ok', false, 'reason', 'budget-exceeded', 'session', dialmade.ai_session_json(v_session),
      'usage', dialmade.ai_usage_of(v_month, p_device_id, v_day, null));
  end if;

  update dialmade.ai_render_sessions
     set directions_used = directions_used + (p_kind = 'direction')::integer,
         screens_used = screens_used + (p_kind = 'screen')::integer,
         actions_used = actions_used + (p_kind = 'action')::integer
   where id = p_session_id
  returning * into v_session;
  update dialmade.ai_ledger_month set reserved_usd = reserved_usd + v_amount, updated_at = v_now where month = v_month;
  insert into dialmade.ai_reservations (device_id, ip_hash, model, month, day, reserved_usd, session_id)
  values (p_device_id, null, p_model, v_month, v_day, v_amount, p_session_id)
  returning id into v_id;

  return jsonb_build_object(
    'ok', true,
    'reservation_id', v_id,
    'session', dialmade.ai_session_json(v_session),
    'usage', dialmade.ai_usage_of(v_month, p_device_id, v_day, null)
  );
end;
$$;

-- A failed screen or action gives its slot back (the retry does not spend another one).
create or replace function public.dialmade_ai_session_refund(p_session_id uuid, p_device_id text, p_kind text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_session dialmade.ai_render_sessions%rowtype;
begin
  if p_kind not in ('direction', 'screen', 'action') then
    raise exception 'invalid p_kind' using errcode = '22023';
  end if;
  update dialmade.ai_render_sessions
     set directions_used = greatest(0, directions_used - (p_kind = 'direction')::integer),
         screens_used = greatest(0, screens_used - (p_kind = 'screen')::integer),
         actions_used = greatest(0, actions_used - (p_kind = 'action')::integer)
   where id = p_session_id and device_id = p_device_id
  returning * into v_session;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not-found');
  end if;
  return jsonb_build_object('ok', true, 'session', dialmade.ai_session_json(v_session));
end;
$$;

-- Releasing a reservation made inside a session gives no free use back (the session took it).
create or replace function public.dialmade_ai_release(p_reservation_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_res dialmade.ai_reservations%rowtype;
begin
  if p_reservation_id is null then
    raise exception 'invalid p_reservation_id' using errcode = '22023';
  end if;

  select * into v_res from dialmade.ai_reservations r where r.id = p_reservation_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not-found');
  end if;

  if v_res.status = 'reserved' then
    update dialmade.ai_ledger_month
       set reserved_usd = greatest(0, reserved_usd - v_res.reserved_usd), updated_at = now()
     where month = v_res.month;
  elsif v_res.status = 'expired' then
    update dialmade.ai_ledger_month
       set spent_usd = greatest(0, spent_usd - coalesce(v_res.settled_usd, 0)), updated_at = now()
     where month = v_res.month;
  else
    return jsonb_build_object(
      'ok', false,
      'reason', 'already-' || v_res.status,
      'usage', dialmade.ai_usage_of(v_res.month, v_res.device_id, v_res.day, v_res.ip_hash)
    );
  end if;

  if v_res.session_id is null then
    update dialmade.ai_usage
       set free_uses_used = greatest(0, free_uses_used - 1), updated_at = now()
     where month = v_res.month and device_id = v_res.device_id;
  end if;
  update dialmade.ai_reservations
     set status = 'released', settled_usd = 0, settled_at = now()
   where id = p_reservation_id;

  return jsonb_build_object(
    'ok', true,
    'usage', dialmade.ai_usage_of(v_res.month, v_res.device_id, v_res.day, v_res.ip_hash)
  );
end;
$$;

revoke all on function public.dialmade_ai_session_open(text, text, text, numeric, numeric, integer, integer, integer, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.dialmade_ai_session_reserve(uuid, text, text, text, numeric, numeric) from public, anon, authenticated;
revoke all on function public.dialmade_ai_session_refund(uuid, text, text) from public, anon, authenticated;
revoke all on function public.dialmade_ai_release(uuid) from public, anon, authenticated;
grant execute on function public.dialmade_ai_session_open(text, text, text, numeric, numeric, integer, integer, integer, integer, integer, integer) to service_role;
grant execute on function public.dialmade_ai_session_reserve(uuid, text, text, text, numeric, numeric) to service_role;
grant execute on function public.dialmade_ai_session_refund(uuid, text, text) to service_role;
grant execute on function public.dialmade_ai_release(uuid) to service_role;

notify pgrst, 'reload schema';
