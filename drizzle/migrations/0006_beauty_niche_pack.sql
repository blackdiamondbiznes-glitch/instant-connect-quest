-- Beauty niche pack: appointment deposit + time, reminder-to-booking link, richer demo.

alter table public.records
  add column if not exists deposit_paid boolean not null default false,
  add column if not exists due_time text;

alter table public.records drop constraint if exists records_due_time_format;
alter table public.records
  add constraint records_due_time_format check (due_time is null or due_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

alter table public.reminders
  add column if not exists record_id uuid references public.records(id) on delete cascade,
  add column if not exists kind text not null default 'manual';

alter table public.reminders drop constraint if exists reminders_kind_check;
alter table public.reminders
  add constraint reminders_kind_check check (kind in ('manual', 'appt_24h', 'appt_2h'));

create unique index if not exists reminders_record_kind_uidx
  on public.reminders (record_id, kind) where record_id is not null;

-- Beauty demo: salon story for a 30s walkthrough
update public.tg_owners
   set display_name = 'Malika Nail Studio',
       modules = '{bookings,deposits,no_shows,reminders,broadcast,ai_pulse,ai_faq}'::text[],
       onboarded_at = coalesce(onboarded_at, now()),
       step = 'ready'
 where telegram_id = -4 and is_demo;

delete from public.reminders where owner_id = -4;
delete from public.records where owner_id = -4;
delete from public.members where owner_id = -4;

insert into public.members (owner_id, name, phone, status, amount, note) values
 (-4, 'Aziza Karimova',  '+998901112233', 'regular', 0,      'Har 3 haftada manikyur'),
 (-4, 'Madina Yusupova', '+998977778899', 'regular', 0,      'Soch + kiprik'),
 (-4, 'Nilufar Saidova', '+998935551010', 'prepaid', 80000,  'Depozit: soch bo''yash'),
 (-4, 'Dilnoza Akbarova','+998911234567', 'new',     0,      'Birinchi tashrif — saksiya'),
 (-4, 'Shahlo Tursunova','+998909990011', 'new',     0,      'Telegramdan yozildi'),
 (-4, 'Gulnora Tosheva', '+998946667788', 'lost',    0,      '3 oydan beri kelmadi'),
 (-4, 'Malika Rahimova', '+998933334455', 'prepaid', 50000,  'Depozit: gel lak + dizayn'),
 (-4, 'Oydin Ergasheva', '+998997778899', 'regular', 0,      'Doimiy, 18:00 dan keyin');

insert into public.records (owner_id, title, client, status, amount, due_date, due_time, deposit_paid, data_type) values
 (-4, 'Manikyur + dizayn',     'Aziza Karimova',  'booked',  180000, current_date,              '11:00', false, 'booking'),
 (-4, 'Saksiya + bo''yash',    'Dilnoza Akbarova','booked',  220000, current_date,              '14:30', false, 'booking'),
 (-4, 'Gel lak',               'Oydin Ergasheva', 'done',    150000, current_date,              '09:30', true,  'booking'),
 (-4, 'Soch bo''yash',         'Nilufar Saidova', 'booked',  450000, current_date + 1,          '16:00', true,  'booking'),
 (-4, 'Kiprik o''stirish',     'Madina Yusupova', 'booked',  280000, current_date + 1,          '12:00', false, 'booking'),
 (-4, 'Manikyur',              'Shahlo Tursunova','no_show', 160000, current_date - 1,          '15:00', false, 'booking'),
 (-4, 'Gel lak + dizayn',      'Malika Rahimova', 'done',    200000, current_date - 2,          '17:00', true,  'booking'),
 (-4, 'Kiprik laminatsiya',    'Gulnora Tosheva', 'no_show', 180000, current_date - 7,          '13:00', false, 'booking'),
 (-4, 'Manikyur + pedikyur',   'Aziza Karimova',  'done',    320000, current_date - 21,         '11:00', false, 'booking');

-- Demo appointment reminders (owner DM is a negative id; the tick skips sending)
insert into public.reminders (owner_id, chat_id, text, send_at, repeat, active, kind, record_id)
select r.owner_id, r.owner_id,
       '💅 Ertaga ' || coalesce(r.due_time, '12:00') || ' da yozilish: ' || coalesce(r.client, '') || ' — ' || r.title || '.',
       ((r.due_date::text || ' ' || coalesce(r.due_time, '12:00') || ':00')::timestamp - interval '24 hours') at time zone 'Asia/Tashkent',
       'none', true, 'appt_24h', r.id
  from public.records r
 where r.owner_id = -4 and r.data_type = 'booking' and r.status = 'booked';

insert into public.reminders (owner_id, chat_id, text, send_at, repeat, active, kind, record_id)
select r.owner_id, r.owner_id,
       '💅 2 soatdan keyin: ' || coalesce(r.client, '') || ' — ' || r.title || ' (' || coalesce(r.due_time, '') || ').',
       ((r.due_date::text || ' ' || coalesce(r.due_time, '12:00') || ':00')::timestamp - interval '2 hours') at time zone 'Asia/Tashkent',
       'none', true, 'appt_2h', r.id
  from public.records r
 where r.owner_id = -4 and r.data_type = 'booking' and r.status = 'booked' and r.due_time is not null;
