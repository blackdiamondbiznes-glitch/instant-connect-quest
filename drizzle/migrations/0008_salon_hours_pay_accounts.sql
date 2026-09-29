-- Owner working hours, real booking deposits, platform subscription orders,
-- and more than one salon per Telegram account.
-- Existing owners keep telegram_id as their first salon. Extra salons use a
-- synthetic telegram_id and point account_telegram_id at the human.

alter table public.tg_owners add column if not exists account_telegram_id bigint;
update public.tg_owners
  set account_telegram_id = telegram_id
  where account_telegram_id is null and telegram_id > 0 and is_demo = false;
create index if not exists tg_owners_account_idx on public.tg_owners (account_telegram_id);

create table if not exists public.account_session (
  telegram_id bigint primary key,
  active_owner_id bigint not null references public.tg_owners(telegram_id) on delete cascade
);
grant all on public.account_session to service_role;
alter table public.account_session enable row level security;

alter table public.records add column if not exists customer_tg_id bigint;
create index if not exists records_customer_tg_idx on public.records (owner_id, customer_tg_id);

create table if not exists public.booking_settings (
  owner_id bigint primary key references public.tg_owners(telegram_id) on delete cascade,
  open_time text not null default '09:00',
  close_time text not null default '19:00',
  slot_minutes int not null default 60,
  closed_days text not null default '',
  deposit_amount numeric not null default 0,
  click_service_id text,
  click_merchant_id text,
  click_secret_key text,
  payme_merchant_id text,
  payme_key text,
  constraint booking_open_chk check (open_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  constraint booking_close_chk check (close_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  constraint booking_step_chk check (slot_minutes in (30, 60, 90)),
  constraint booking_deposit_chk check (deposit_amount >= 0)
);
grant all on public.booking_settings to service_role;
alter table public.booking_settings enable row level security;

create table if not exists public.booking_deposits (
  id uuid primary key default gen_random_uuid(),
  seq bigserial unique,
  owner_id bigint not null references public.tg_owners(telegram_id) on delete cascade,
  record_id uuid references public.records(id) on delete cascade,
  tg_user_id bigint not null,
  amount numeric not null,
  status text not null default 'pending',
  provider text,
  provider_tx text,
  payme_state int,
  payme_create_time bigint,
  payme_perform_time bigint,
  payme_cancel_time bigint,
  payme_reason int,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  constraint booking_deposits_status_chk check (status in ('pending', 'paid', 'cancelled'))
);
create index if not exists booking_deposits_owner_idx on public.booking_deposits (owner_id, created_at desc);
create index if not exists booking_deposits_tx_idx on public.booking_deposits (provider_tx);
create index if not exists booking_deposits_pending_idx on public.booking_deposits (status, created_at);
grant all on public.booking_deposits to service_role;
grant usage, select on sequence public.booking_deposits_seq_seq to service_role;
alter table public.booking_deposits enable row level security;

create table if not exists public.platform_orders (
  id uuid primary key default gen_random_uuid(),
  seq bigserial unique,
  owner_id bigint not null references public.tg_owners(telegram_id) on delete cascade,
  tier text not null,
  days int not null,
  amount numeric not null,
  status text not null default 'pending',
  provider text,
  provider_tx text,
  payme_state int,
  payme_create_time bigint,
  payme_perform_time bigint,
  payme_cancel_time bigint,
  payme_reason int,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  constraint platform_orders_status_chk check (status in ('pending', 'paid', 'cancelled')),
  constraint platform_orders_tier_chk check (tier in ('start', 'pro'))
);
create index if not exists platform_orders_owner_idx on public.platform_orders (owner_id, created_at desc);
create index if not exists platform_orders_tx_idx on public.platform_orders (provider_tx);
grant all on public.platform_orders to service_role;
grant usage, select on sequence public.platform_orders_seq_seq to service_role;
alter table public.platform_orders enable row level security;
