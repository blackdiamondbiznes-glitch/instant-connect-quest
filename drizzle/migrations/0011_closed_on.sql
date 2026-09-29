-- A civil date the salon is closed for new client bookings. Tomorrow is unaffected.
alter table public.booking_settings
  add column if not exists closed_on date;
