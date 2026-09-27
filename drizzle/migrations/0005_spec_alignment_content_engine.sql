-- Owner profile, plan tier and content-engine settings
alter table public.tg_owners
  add column if not exists display_name text,
  add column if not exists plan_tier text not null default 'free',
  add column if not exists onboarded_at timestamptz,
  add column if not exists content_auto_publish boolean not null default false,
  add column if not exists content_footer_disabled boolean not null default false,
  add column if not exists content_chat_id bigint;

alter table public.tg_owners
  add constraint tg_owners_display_name_len check (display_name is null or char_length(display_name) between 1 and 60),
  add constraint tg_owners_plan_tier_chk check (plan_tier in ('free', 'start', 'pro')),
  add constraint tg_owners_plan_status_chk check (plan_status in ('trial', 'active', 'expired')),
  add constraint tg_owners_language_chk check (language in ('uz', 'ru', 'en'));

update public.tg_owners set onboarded_at = coalesce(onboarded_at, updated_at, now()) where step in ('ready', 'done');
update public.tg_owners set step = 'ready' where step = 'done';

-- MVP niche catalog is exactly 10 niches + "other"
update public.tg_owners set niche = 'other' where niche is not null
  and niche not in ('seller','tutor','vip','beauty','fitness','doctor','psychologist','realestate','logistics','educenter','other');

-- Modules without a working screen are removed everywhere
update public.tg_owners
   set modules = array(select m from unnest(modules) m where m not in ('confidential', 'reviews', 'catalog', 'inbound'));

-- Message classification + engagement signals for the content engine
alter table public.tg_messages
  add column if not exists reactions int not null default 0,
  add column if not exists replies int not null default 0,
  add column if not exists origin_chat_id bigint,
  add column if not exists origin_message_id bigint,
  add column if not exists ai_generated boolean not null default false;
alter table public.tg_messages
  add constraint tg_messages_kind_chk check (kind in ('member_message', 'owner_post', 'channel_post', 'service'));
create index if not exists tg_messages_origin_idx on public.tg_messages (origin_chat_id, origin_message_id) where origin_chat_id is not null;

create or replace function public.add_message_engagement(_chat bigint, _msg bigint, _reactions int, _replies int, _absolute_reactions boolean default false)
returns void language sql security definer set search_path = public as $$
  update public.tg_messages
     set reactions = greatest(0, case when _absolute_reactions then _reactions else reactions + _reactions end),
         replies = greatest(0, replies + _replies)
   where chat_id = _chat and message_id = _msg
$$;
revoke execute on function public.add_message_engagement(bigint, bigint, int, int, boolean) from public, anon, authenticated;
grant execute on function public.add_message_engagement(bigint, bigint, int, int, boolean) to service_role;

-- One atomic per-owner quota mechanism, shared by AI analysis limits and content cadence
create table public.usage_counters (
  owner_id bigint not null references public.tg_owners(telegram_id) on delete cascade,
  bucket text not null,
  period_key int not null,
  count int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (owner_id, bucket, period_key)
);
grant all on public.usage_counters to service_role;
alter table public.usage_counters enable row level security;

create or replace function public.consume_quota(_owner bigint, _bucket text, _period_days int, _max int)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  _key int := (current_date - date '2000-01-01') / greatest(_period_days, 1);
  _n int;
begin
  if _max <= 0 then return false; end if;
  insert into public.usage_counters as u (owner_id, bucket, period_key, count)
  values (_owner, _bucket, _key, 1)
  on conflict (owner_id, bucket, period_key)
    do update set count = u.count + 1, updated_at = now() where u.count < _max
  returning u.count into _n;
  return _n is not null;
end $$;
revoke execute on function public.consume_quota(bigint, text, int, int) from public, anon, authenticated;
grant execute on function public.consume_quota(bigint, text, int, int) to service_role;

create or replace function public.refund_quota(_owner bigint, _bucket text, _period_days int)
returns void language sql security definer set search_path = public as $$
  update public.usage_counters set count = greatest(0, count - 1), updated_at = now()
   where owner_id = _owner and bucket = _bucket
     and period_key = (current_date - date '2000-01-01') / greatest(_period_days, 1)
$$;
revoke execute on function public.refund_quota(bigint, text, int) from public, anon, authenticated;
grant execute on function public.refund_quota(bigint, text, int) to service_role;

-- AI Content Engine feed
create table public.content_suggestions (
  id uuid primary key default gen_random_uuid(),
  owner_id bigint not null references public.tg_owners(telegram_id) on delete cascade,
  kind text not null check (kind in ('post', 'fact', 'perf_digest', 'question_digest')),
  text text not null,
  status text not null default 'pending' check (status in ('pending', 'published', 'dismissed', 'info')),
  chat_id bigint,
  published_message_id bigint,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now(),
  published_at timestamptz
);
create index on public.content_suggestions (owner_id, created_at desc);
grant all on public.content_suggestions to service_role;
alter table public.content_suggestions enable row level security;

-- Demo accounts: align module sets with the shipped catalog
update public.tg_owners set modules = case niche
  when 'seller' then '{orders,debts,stock,broadcast,ai_pulse,ai_faq,ai_content}'::text[]
  when 'tutor' then '{payments,debts,activity,schedule,reminders,ai_pulse,ai_faq}'::text[]
  when 'vip' then '{subs,access,signals,reminders,broadcast,ai_pulse,ai_faq,ai_content}'::text[]
  when 'beauty' then '{bookings,deposits,no_shows,reminders,broadcast,ai_pulse,ai_faq}'::text[]
  when 'fitness' then '{membership,expiry,activity,programs,reminders,ai_pulse,ai_faq}'::text[]
  when 'doctor' then '{bookings,deposits,no_shows,reminders,ai_pulse,ai_faq}'::text[]
  when 'psychologist' then '{bookings,deposits,no_shows,reminders,ai_pulse}'::text[]
  when 'realestate' then '{listings,leads,broadcast,reminders,ai_pulse,ai_faq,ai_content}'::text[]
  when 'logistics' then '{waybill,dispatch,delivery_status,payments,debts,reminders}'::text[]
  when 'educenter' then '{payments,debts,activity,schedule,broadcast,reminders,ai_pulse,ai_faq}'::text[]
  else modules end,
  plan_tier = 'pro'
where is_demo;

delete from public.records r using public.tg_owners o
 where o.telegram_id = r.owner_id and o.is_demo and o.niche = 'logistics' and r.data_type = 'stock';

insert into public.records (owner_id, title, client, status, amount, data_type)
select o.telegram_id, x.t, null, x.s, x.a, 'stock'
from public.tg_owners o
cross join (values ('Qishki kurtka', 'in_stock', 450000), ('Krossovka Nike', 'low', 690000), ('Sumka charm', 'out', 180000)) x(t, s, a)
where o.is_demo and o.niche = 'seller'
  and not exists (select 1 from public.records r where r.owner_id = o.telegram_id and r.data_type = 'stock');

insert into public.tg_messages (owner_id, chat_id, message_id, from_name, text, kind, reactions, replies, created_at)
select o.telegram_id, -1000000000 + o.telegram_id, 900000 + p.n, o.first_name, p.t, 'channel_post', p.r, p.c, now() - (p.d || ' days')::interval
from public.tg_owners o
cross join (values
  (1, 'Yangi mavsum kolleksiyasi keldi! 🔥', 42, 11, 1),
  (2, 'Bugun soat 18:00 da jonli efir', 17, 3, 3),
  (3, 'Narxlar ro''yxati yangilandi', 8, 1, 5)) p(n, t, r, c, d)
where o.is_demo and 'ai_content' = any(o.modules)
on conflict (chat_id, message_id) do nothing;

insert into public.content_suggestions (owner_id, kind, text, status, meta, created_at)
select o.telegram_id, s.k, s.t, s.st, s.m::jsonb, now() - (s.h || ' hours')::interval
from public.tg_owners o
cross join (values
  ('post', 'Bilasizmi? Mijozlarning 68% i xaridni telefon orqali qiladi. Sizchi — qaysi qurilmadan buyurtma berasiz? 👇', 'pending', '{}', 2),
  ('perf_digest', 'Oxirgi 7 kun: eng yaxshi post — "Yangi mavsum kolleksiyasi" (42 reaksiya, 11 izoh). Qisqa, emojili e''lonlar 3 barobar ko''proq javob olmoqda.', 'info', '{"posts":3,"reactions":67,"replies":15}', 20)) s(k, t, st, m, h)
where o.is_demo and 'ai_content' = any(o.modules);
