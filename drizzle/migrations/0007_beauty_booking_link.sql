-- Per-salon service menu for the client booking link (t.me/bot?start=book_<owner>).

create table public.booking_services (
  id uuid primary key default gen_random_uuid(),
  owner_id bigint not null references public.tg_owners(telegram_id) on delete cascade,
  title text not null,
  price numeric not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint booking_services_title_len check (char_length(title) between 1 and 80)
);
create index on public.booking_services (owner_id, active);
grant all on public.booking_services to service_role;
alter table public.booking_services enable row level security;

-- One booked appointment per clock slot. Done/no-show free the slot.
create unique index if not exists records_booking_slot_uidx
  on public.records (owner_id, due_date, due_time)
  where data_type = 'booking' and status = 'booked' and due_date is not null and due_time is not null;

insert into public.booking_services (owner_id, title, price)
select -4, x.t, x.p
from (values
  ('Manikyur', 120000),
  ('Manikyur + dizayn', 180000),
  ('Gel lak', 150000),
  ('Soch bo''yash', 450000),
  ('Kiprik o''stirish', 280000)
) x(t, p)
where exists (select 1 from public.tg_owners o where o.telegram_id = -4 and o.is_demo)
  and not exists (select 1 from public.booking_services s where s.owner_id = -4);
