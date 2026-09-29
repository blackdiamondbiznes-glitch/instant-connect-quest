-- How early the client gets the appointment reminder. 2 hours is the default; 24 is optional.
alter table public.booking_settings
  add column if not exists reminder_hours integer not null default 2;

alter table public.booking_settings
  drop constraint if exists booking_settings_reminder_hours_check;

alter table public.booking_settings
  add constraint booking_settings_reminder_hours_check check (reminder_hours in (2, 24));
