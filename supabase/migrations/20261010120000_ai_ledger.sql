-- Dialmade: persistent ledger of the hosted AI (free tier + hard monthly budget).
--
-- Additive and idempotent: safe to run again (`supabase db push` after it was applied by hand).
-- The tables live in the private schema `dialmade`, which the Data API does not expose. RLS is on and
-- there are no policies: anon / authenticated (publishable key) cannot read or write anything. The web
-- server (secret key = service_role) only calls the `public.dialmade_ai_*` security definer functions.
--
-- No personal data: `device_id` is a random id from a signed anonymous cookie, and `ip_hash` is an
-- HMAC of the IP salted with a server secret and the UTC day. Hashed IPs are dropped after 7 days
-- (daily counters) and 30 days (reservations).
--
-- Accounting (UTC months): `spent_usd` is what the API billed, `reserved_usd` the worst case of the
-- requests in flight. A request fits when spent + reserved + its worst case <= the monthly budget.

create schema if not exists dialmade;
revoke all on schema dialmade from public;
revoke all on schema dialmade from anon, authenticated;

create table if not exists dialmade.ai_ledger_month (
  month text primary key check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  spent_usd numeric(14, 6) not null default 0 check (spent_usd >= 0),
  reserved_usd numeric(14, 6) not null default 0 check (reserved_usd >= 0),
  updated_at timestamptz not null default now()
);
comment on table dialmade.ai_ledger_month is 'Hosted AI spend per UTC month (global): billed and reserved by requests in flight.';

create table if not exists dialmade.ai_usage (
  month text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  device_id text not null check (char_length(device_id) between 1 and 128),
  free_uses_used integer not null default 0 check (free_uses_used >= 0),
  updated_at timestamptz not null default now(),
  primary key (month, device_id)
);
comment on table dialmade.ai_usage is 'Free AI uses per anonymous device (later: account) per UTC month.';

create table if not exists dialmade.ai_ip_day (
  day date not null,
  ip_hash text not null check (char_length(ip_hash) between 1 and 128),
  requests integer not null default 0 check (requests >= 0),
  primary key (day, ip_hash)
);
comment on table dialmade.ai_ip_day is 'Hosted AI requests per salted IP hash per UTC day. Rows older than 7 days are deleted.';

create table if not exists dialmade.ai_reservations (
  id uuid primary key default gen_random_uuid(),
  device_id text not null check (char_length(device_id) between 1 and 128),
  ip_hash text check (ip_hash is null or char_length(ip_hash) between 1 and 128),
  model text not null check (char_length(model) between 1 and 100),
  month text not null references dialmade.ai_ledger_month (month),
  day date not null,
  reserved_usd numeric(14, 6) not null check (reserved_usd >= 0),
  settled_usd numeric(14, 6) check (settled_usd is null or settled_usd >= 0),
  status text not null default 'reserved' check (status in ('reserved', 'settled', 'released', 'expired')),
  created_at timestamptz not null default now(),
  settled_at timestamptz
);
comment on table dialmade.ai_reservations is 'One row per paid AI call: worst case reserved up front, then settled with the real usage, released (not billed) or expired (unknown outcome, charged in full).';

create index if not exists ai_reservations_open_idx on dialmade.ai_reservations (created_at) where status = 'reserved';
create index if not exists ai_reservations_ip_idx on dialmade.ai_reservations (created_at) where ip_hash is not null;

alter table dialmade.ai_ledger_month enable row level security;
alter table dialmade.ai_usage enable row level security;
alter table dialmade.ai_ip_day enable row level security;
alter table dialmade.ai_reservations enable row level security;

revoke all on all tables in schema dialmade from public;
revoke all on all tables in schema dialmade from anon, authenticated;

-- Internal: usage counters as JSON. Not callable through the API (the schema is private).
create or replace function dialmade.ai_usage_of(p_month text, p_device_id text, p_day date, p_ip_hash text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'month', p_month,
    'spent_usd', coalesce((select m.spent_usd from dialmade.ai_ledger_month m where m.month = p_month), 0),
    'reserved_usd', coalesce((select m.reserved_usd from dialmade.ai_ledger_month m where m.month = p_month), 0),
    'free_uses_used', coalesce((select u.free_uses_used from dialmade.ai_usage u where u.month = p_month and u.device_id = p_device_id), 0),
    'ip_requests', coalesce((select d.requests from dialmade.ai_ip_day d where d.day = p_day and d.ip_hash = p_ip_hash), 0)
  );
$$;
revoke all on function dialmade.ai_usage_of(text, text, date, text) from public;

-- Reservations older than the TTL never got an answer (crash, timeout): their outcome is unknown, so
-- they are charged in full. A late settle still corrects them to the real cost. Also drops old IP hashes.
create or replace function public.dialmade_ai_expire_reservations(p_ttl_seconds integer default 600)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_ttl_seconds is null or p_ttl_seconds < 60 then
    raise exception 'p_ttl_seconds must be >= 60' using errcode = '22023';
  end if;

  with stale as (
    update dialmade.ai_reservations r
       set status = 'expired', settled_usd = r.reserved_usd, settled_at = now()
     where r.status = 'reserved'
       and r.created_at < now() - make_interval(secs => p_ttl_seconds)
    returning r.month, r.reserved_usd
  ), per_month as (
    select s.month, sum(s.reserved_usd) as amount, count(*) as n
      from stale s
     group by s.month
  ), moved as (
    update dialmade.ai_ledger_month m
       set spent_usd = m.spent_usd + p.amount,
           reserved_usd = greatest(0, m.reserved_usd - p.amount),
           updated_at = now()
      from per_month p
     where m.month = p.month
    returning p.n
  )
  select coalesce(sum(moved.n), 0)::integer into v_count from moved;

  delete from dialmade.ai_ip_day where day < (now() at time zone 'utc')::date - 7;
  update dialmade.ai_reservations
     set ip_hash = null
   where ip_hash is not null
     and created_at < now() - interval '30 days';

  return v_count;
end;
$$;

-- Read only: this month's spend, the device's free uses and the IP's requests today.
create or replace function public.dialmade_ai_usage(p_device_id text, p_ip_hash text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select dialmade.ai_usage_of(
    to_char(now() at time zone 'utc', 'YYYY-MM'),
    p_device_id,
    (now() at time zone 'utc')::date,
    p_ip_hash
  );
$$;

-- Atomic: checks the device's free uses, the IP's daily limit and the global monthly budget under row
-- locks, then reserves the worst case, takes one free use and one IP request, and records the
-- reservation. Returns {ok, reservation_id?, reason?, usage}. reason: free-tier-exhausted | daily-limit
-- | budget-exceeded.
create or replace function public.dialmade_ai_reserve(
  p_device_id text,
  p_ip_hash text,
  p_model text,
  p_amount_usd numeric,
  p_monthly_budget_usd numeric,
  p_free_uses_per_month integer,
  p_max_requests_per_ip_per_day integer
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
  v_id uuid;
begin
  if p_device_id is null or char_length(p_device_id) not between 1 and 128 then
    raise exception 'invalid p_device_id' using errcode = '22023';
  end if;
  if p_ip_hash is null or char_length(p_ip_hash) not between 1 and 128 then
    raise exception 'invalid p_ip_hash' using errcode = '22023';
  end if;
  if p_model is null or char_length(p_model) not between 1 and 100 then
    raise exception 'invalid p_model' using errcode = '22023';
  end if;
  if p_amount_usd is null or p_amount_usd < 0 or p_monthly_budget_usd is null or p_monthly_budget_usd < 0
     or p_free_uses_per_month is null or p_free_uses_per_month < 0
     or p_max_requests_per_ip_per_day is null or p_max_requests_per_ip_per_day < 0 then
    raise exception 'invalid limits' using errcode = '22023';
  end if;

  perform public.dialmade_ai_expire_reservations(600);

  -- Lock order everywhere: reservation rows, month, device, IP.
  insert into dialmade.ai_ledger_month (month) values (v_month) on conflict (month) do nothing;
  select m.spent_usd, m.reserved_usd into v_spent, v_reserved
    from dialmade.ai_ledger_month m where m.month = v_month for update;

  insert into dialmade.ai_usage (month, device_id) values (v_month, p_device_id) on conflict (month, device_id) do nothing;
  select u.free_uses_used into v_used
    from dialmade.ai_usage u where u.month = v_month and u.device_id = p_device_id for update;

  insert into dialmade.ai_ip_day (day, ip_hash) values (v_day, p_ip_hash) on conflict (day, ip_hash) do nothing;
  select d.requests into v_ip
    from dialmade.ai_ip_day d where d.day = v_day and d.ip_hash = p_ip_hash for update;

  if v_used >= p_free_uses_per_month then
    v_reason := 'free-tier-exhausted';
  elsif v_ip >= p_max_requests_per_ip_per_day then
    v_reason := 'daily-limit';
  elsif v_spent + v_reserved >= p_monthly_budget_usd or v_spent + v_reserved + v_amount > p_monthly_budget_usd then
    v_reason := 'budget-exceeded';
  end if;

  if v_reason is not null then
    return jsonb_build_object(
      'ok', false,
      'reason', v_reason,
      'usage', dialmade.ai_usage_of(v_month, p_device_id, v_day, p_ip_hash)
    );
  end if;

  update dialmade.ai_ledger_month
     set reserved_usd = reserved_usd + v_amount, updated_at = v_now
   where month = v_month;
  update dialmade.ai_usage
     set free_uses_used = free_uses_used + 1, updated_at = v_now
   where month = v_month and device_id = p_device_id;
  update dialmade.ai_ip_day
     set requests = requests + 1
   where day = v_day and ip_hash = p_ip_hash;
  insert into dialmade.ai_reservations (device_id, ip_hash, model, month, day, reserved_usd)
  values (p_device_id, p_ip_hash, p_model, v_month, v_day, v_amount)
  returning id into v_id;

  return jsonb_build_object(
    'ok', true,
    'reservation_id', v_id,
    'usage', dialmade.ai_usage_of(v_month, p_device_id, v_day, p_ip_hash)
  );
end;
$$;

-- The call was billed: charge its real cost and free the rest of the reservation. An expired
-- reservation (charged in full) is corrected to the real cost. Idempotent: a second call is a no-op.
create or replace function public.dialmade_ai_settle(p_reservation_id uuid, p_cost_usd numeric)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_res dialmade.ai_reservations%rowtype;
  v_cost numeric;
begin
  if p_reservation_id is null or p_cost_usd is null or p_cost_usd < 0 then
    raise exception 'invalid settle arguments' using errcode = '22023';
  end if;
  v_cost := round(p_cost_usd, 6);

  select * into v_res from dialmade.ai_reservations r where r.id = p_reservation_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not-found');
  end if;

  if v_res.status = 'reserved' then
    update dialmade.ai_ledger_month
       set spent_usd = spent_usd + v_cost,
           reserved_usd = greatest(0, reserved_usd - v_res.reserved_usd),
           updated_at = now()
     where month = v_res.month;
  elsif v_res.status = 'expired' then
    update dialmade.ai_ledger_month
       set spent_usd = greatest(0, spent_usd + v_cost - coalesce(v_res.settled_usd, 0)),
           updated_at = now()
     where month = v_res.month;
  else
    return jsonb_build_object(
      'ok', false,
      'reason', 'already-' || v_res.status,
      'usage', dialmade.ai_usage_of(v_res.month, v_res.device_id, v_res.day, v_res.ip_hash)
    );
  end if;

  update dialmade.ai_reservations
     set status = 'settled', settled_usd = v_cost, settled_at = now()
   where id = p_reservation_id;

  return jsonb_build_object(
    'ok', true,
    'usage', dialmade.ai_usage_of(v_res.month, v_res.device_id, v_res.day, v_res.ip_hash)
  );
end;
$$;

-- The call was not billed (the API answered with an error status): free the reservation and give the
-- free use back. The IP request stays counted (it limits attempts). Idempotent.
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

  update dialmade.ai_usage
     set free_uses_used = greatest(0, free_uses_used - 1), updated_at = now()
   where month = v_res.month and device_id = v_res.device_id;
  update dialmade.ai_reservations
     set status = 'released', settled_usd = 0, settled_at = now()
   where id = p_reservation_id;

  return jsonb_build_object(
    'ok', true,
    'usage', dialmade.ai_usage_of(v_res.month, v_res.device_id, v_res.day, v_res.ip_hash)
  );
end;
$$;

-- Only the server (service_role, i.e. the secret key) may call them.
revoke all on function public.dialmade_ai_expire_reservations(integer) from public, anon, authenticated;
revoke all on function public.dialmade_ai_usage(text, text) from public, anon, authenticated;
revoke all on function public.dialmade_ai_reserve(text, text, text, numeric, numeric, integer, integer) from public, anon, authenticated;
revoke all on function public.dialmade_ai_settle(uuid, numeric) from public, anon, authenticated;
revoke all on function public.dialmade_ai_release(uuid) from public, anon, authenticated;

grant execute on function public.dialmade_ai_expire_reservations(integer) to service_role;
grant execute on function public.dialmade_ai_usage(text, text) to service_role;
grant execute on function public.dialmade_ai_reserve(text, text, text, numeric, numeric, integer, integer) to service_role;
grant execute on function public.dialmade_ai_settle(uuid, numeric) to service_role;
grant execute on function public.dialmade_ai_release(uuid) to service_role;

notify pgrst, 'reload schema';
