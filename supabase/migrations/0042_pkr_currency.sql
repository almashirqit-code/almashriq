-- =====================================================================
-- PKR (Pakistani rupee) accepted everywhere a currency is stored.
-- Re-runnable: every currency check that lists THB but not PKR is rebuilt
-- with PKR added, and so is mark_commission_paid's currency guard.
-- =====================================================================

do $$
declare
  r record;
begin
  for r in
    select c.conrelid::regclass as tbl, c.conname, pg_get_constraintdef(c.oid) as def
      from pg_constraint c
      join pg_namespace n on n.oid = c.connamespace
     where n.nspname = 'public' and c.contype = 'c'
       and pg_get_constraintdef(c.oid) like '%''THB''::text]%'
       and pg_get_constraintdef(c.oid) not like '%''PKR''%'
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
    execute format('alter table %s add constraint %I %s', r.tbl, r.conname,
                   replace(r.def, '''THB''::text]', '''THB''::text, ''PKR''::text]'));
  end loop;
end $$;

do $$
declare
  src text;
begin
  select pg_get_functiondef(p.oid) into src
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'mark_commission_paid';
  if src is not null and src not like '%''PKR''%' then
    execute replace(src, '''TWD'', ''THB'')', '''TWD'', ''THB'', ''PKR'')');
  end if;
end $$;

-- Default rate (JPY per 1 PKR); edit in Configuration
update public.settings
   set exchange_rates = jsonb_build_object('PKR', 0.54) || coalesce(exchange_rates, '{}'::jsonb)
 where not (coalesce(exchange_rates, '{}'::jsonb) ? 'PKR');
