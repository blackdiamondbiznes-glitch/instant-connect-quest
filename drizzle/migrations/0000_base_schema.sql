create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create table public.tg_owners (
  telegram_id bigint primary key,
  first_name text,
  username text,
  language text not null default 'uz',
  step text not null default 'lang',
  niche text,
  workspace_type text,
  modules text[] not null default '{}',
  cabinet_token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant all on public.tg_owners to service_role;
grant select on public.tg_owners to authenticated;
alter table public.tg_owners enable row level security;
create policy "Admins read owners" on public.tg_owners for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create table public.tg_chats (
  chat_id bigint primary key,
  owner_id bigint not null references public.tg_owners(telegram_id) on delete cascade,
  title text,
  chat_type text,
  created_at timestamptz not null default now()
);
grant all on public.tg_chats to service_role;
grant select on public.tg_chats to authenticated;
alter table public.tg_chats enable row level security;
create policy "Admins read chats" on public.tg_chats for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create table public.tg_messages (
  id uuid primary key default gen_random_uuid(),
  owner_id bigint not null references public.tg_owners(telegram_id) on delete cascade,
  chat_id bigint not null,
  message_id bigint not null,
  from_name text,
  text text not null,
  is_question boolean not null default false,
  created_at timestamptz not null default now(),
  unique (chat_id, message_id)
);
create index on public.tg_messages (owner_id, created_at desc);
grant all on public.tg_messages to service_role;
alter table public.tg_messages enable row level security;

create table public.members (
  id uuid primary key default gen_random_uuid(),
  owner_id bigint not null references public.tg_owners(telegram_id) on delete cascade,
  name text not null,
  phone text,
  status text not null default 'active',
  amount numeric not null default 0,
  note text,
  created_at timestamptz not null default now()
);
create index on public.members (owner_id);
grant all on public.members to service_role;
alter table public.members enable row level security;

create table public.records (
  id uuid primary key default gen_random_uuid(),
  owner_id bigint not null references public.tg_owners(telegram_id) on delete cascade,
  title text not null,
  client text,
  amount numeric not null default 0,
  status text not null default 'new',
  due_date date,
  created_at timestamptz not null default now()
);
create index on public.records (owner_id);
grant all on public.records to service_role;
alter table public.records enable row level security;

create table public.insights (
  id uuid primary key default gen_random_uuid(),
  owner_id bigint not null references public.tg_owners(telegram_id) on delete cascade,
  positive int not null default 0,
  neutral int not null default 0,
  negative int not null default 0,
  topics jsonb not null default '[]',
  positive_drivers jsonb not null default '[]',
  negative_drivers jsonb not null default '[]',
  summary text,
  message_count int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.insights (owner_id, created_at desc);
grant all on public.insights to service_role;
alter table public.insights enable row level security;

create table public.question_clusters (
  id uuid primary key default gen_random_uuid(),
  owner_id bigint not null references public.tg_owners(telegram_id) on delete cascade,
  question text not null,
  ask_count int not null default 1,
  sources jsonb not null default '[]',
  answer text,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.question_clusters (owner_id);
grant all on public.question_clusters to service_role;
alter table public.question_clusters enable row level security;