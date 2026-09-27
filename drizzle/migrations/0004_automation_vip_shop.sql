create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  owner_id bigint not null references public.tg_owners(telegram_id) on delete cascade,
  chat_id bigint,
  text text not null,
  send_at timestamptz not null,
  repeat text not null default 'none',
  active boolean not null default true,
  last_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.reminders (active, send_at);
grant all on public.reminders to service_role;
alter table public.reminders enable row level security;

create table public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  owner_id bigint not null references public.tg_owners(telegram_id) on delete cascade,
  text text not null,
  sent int not null default 0,
  failed int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.broadcasts (owner_id, created_at desc);
grant all on public.broadcasts to service_role;
alter table public.broadcasts enable row level security;

create table public.vip_settings (
  owner_id bigint primary key references public.tg_owners(telegram_id) on delete cascade,
  chat_id bigint,
  price numeric not null default 0,
  days int not null default 30,
  click_service_id text,
  click_merchant_id text,
  click_secret_key text,
  payme_merchant_id text,
  payme_key text,
  updated_at timestamptz not null default now()
);
grant all on public.vip_settings to service_role;
alter table public.vip_settings enable row level security;

create table public.vip_orders (
  id uuid primary key default gen_random_uuid(),
  seq bigserial unique,
  owner_id bigint not null references public.tg_owners(telegram_id) on delete cascade,
  tg_user_id bigint not null,
  user_name text,
  amount numeric not null,
  days int not null,
  status text not null default 'pending',
  provider text,
  provider_tx text,
  payme_state int,
  payme_create_time bigint,
  payme_perform_time bigint,
  payme_cancel_time bigint,
  payme_reason int,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index on public.vip_orders (owner_id, created_at desc);
create index on public.vip_orders (provider_tx);
grant all on public.vip_orders to service_role;
grant usage, select on sequence public.vip_orders_seq_seq to service_role;
alter table public.vip_orders enable row level security;

create table public.vip_subs (
  owner_id bigint not null references public.tg_owners(telegram_id) on delete cascade,
  tg_user_id bigint not null,
  user_name text,
  chat_id bigint not null,
  ends_at timestamptz not null,
  status text not null default 'active',
  notified_at timestamptz,
  primary key (owner_id, tg_user_id)
);
create index on public.vip_subs (status, ends_at);
grant all on public.vip_subs to service_role;
alter table public.vip_subs enable row level security;

create table public.bot_customers (
  tg_user_id bigint primary key,
  owner_id bigint references public.tg_owners(telegram_id) on delete cascade,
  mode text,
  pending jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
grant all on public.bot_customers to service_role;
alter table public.bot_customers enable row level security;

alter table public.members add column if not exists tg_user_id bigint;
alter table public.members add constraint members_owner_tg_user_unique unique (owner_id, tg_user_id);