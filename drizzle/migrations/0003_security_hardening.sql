create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin') $$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

drop policy if exists "Admins read owners" on public.tg_owners;
create policy "Admins read owners" on public.tg_owners for select to authenticated using (public.is_admin());
drop policy if exists "Admins read chats" on public.tg_chats;
create policy "Admins read chats" on public.tg_chats for select to authenticated using (public.is_admin());

create or replace function public.bootstrap_first_admin(_user_id uuid)
returns boolean language plpgsql security definer set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('bootstrap_first_admin'));
  if exists (select 1 from public.user_roles where role = 'admin') then
    return exists (select 1 from public.user_roles where user_id = _user_id and role = 'admin');
  end if;
  insert into public.user_roles (user_id, role) values (_user_id, 'admin') on conflict (user_id, role) do nothing;
  return true;
end $$;
revoke execute on function public.bootstrap_first_admin(uuid) from public, anon, authenticated;
grant execute on function public.bootstrap_first_admin(uuid) to service_role;

alter table public.tg_messages add column if not exists kind text not null default 'member_message';
create index if not exists tg_messages_owner_kind_idx on public.tg_messages (owner_id, kind, created_at desc);

alter table public.records add column if not exists data_type text not null default 'record';
update public.records r set data_type = case
  when o.niche in ('beauty','doctor','psychologist') then 'booking'
  when o.niche = 'logistics' then 'waybill'
  when o.niche = 'warehouse' then 'stock'
  else 'record' end
from public.tg_owners o where o.telegram_id = r.owner_id;
create index if not exists records_owner_type_idx on public.records (owner_id, data_type);

alter table public.tg_owners add column if not exists analysis_day date, add column if not exists analysis_runs int not null default 0;

create or replace function public.consume_analysis_slot(_owner bigint, _max int default 3)
returns boolean language plpgsql security definer set search_path = public
as $$
declare ok boolean;
begin
  update public.tg_owners
     set analysis_runs = case when analysis_day = current_date then analysis_runs + 1 else 1 end,
         analysis_day = current_date
   where telegram_id = _owner
     and (analysis_day is distinct from current_date or analysis_runs < _max)
  returning true into ok;
  return coalesce(ok, false);
end $$;
revoke execute on function public.consume_analysis_slot(bigint, int) from public, anon, authenticated;
grant execute on function public.consume_analysis_slot(bigint, int) to service_role;

create or replace function public.replace_question_clusters(_owner bigint, _rows jsonb)
returns void language plpgsql security definer set search_path = public
as $$
begin
  delete from public.question_clusters where owner_id = _owner and answer is null;
  insert into public.question_clusters (owner_id, question, ask_count, sources)
  select _owner, r->>'question', greatest(1, (r->>'ask_count')::int), coalesce(r->'sources', '[]'::jsonb)
  from jsonb_array_elements(_rows) r;
end $$;
revoke execute on function public.replace_question_clusters(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.replace_question_clusters(bigint, jsonb) to service_role;