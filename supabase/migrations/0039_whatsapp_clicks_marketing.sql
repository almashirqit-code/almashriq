-- =====================================================================
-- 0039: WhatsApp click log + marketing consent
--
--  * whatsapp_clicks: one row per click on a "WhatsApp us" link on the
--    website (page, stock no, visitor country, UTM tags, referrer). No IP
--    or other personal data. Written only through log_whatsapp_click
--    (called by /wa before it redirects to wa.me); admin/manager read.
--  * inquiries / portal_accounts get marketing_consent (+ when). Set only
--    from an unticked-by-default opt-in checkbox on the website forms.
--  * submit_inquiry takes p_marketing; handle_new_user reads the sign-up
--    "marketing" flag.
-- Safe to re-run.
-- =====================================================================

create table if not exists public.whatsapp_clicks (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),
  page         text,
  stock_no     text,
  country      text,
  utm_source   text,
  utm_campaign text,
  referrer     text
);
create index if not exists whatsapp_clicks_created_idx on public.whatsapp_clicks (created_at desc);

alter table public.whatsapp_clicks enable row level security;
drop policy if exists whatsapp_clicks_staff on public.whatsapp_clicks;
create policy whatsapp_clicks_staff on public.whatsapp_clicks for select to authenticated
  using ((select public.is_staff(array['admin', 'manager']::public.user_role[])));

create or replace function public.log_whatsapp_click(
  p_page text, p_stock_no text, p_country text, p_utm_source text, p_utm_campaign text, p_referrer text
)
returns void
language sql volatile security definer set search_path = public
as $$
  insert into public.whatsapp_clicks (page, stock_no, country, utm_source, utm_campaign, referrer)
  values (left(nullif(trim(p_page), ''), 300), left(upper(nullif(trim(p_stock_no), '')), 40),
          left(upper(nullif(trim(p_country), '')), 2), left(lower(nullif(trim(p_utm_source), '')), 80),
          left(nullif(trim(p_utm_campaign), ''), 120), left(nullif(trim(p_referrer), ''), 300))
$$;
revoke all on function public.log_whatsapp_click(text, text, text, text, text, text) from public;
grant execute on function public.log_whatsapp_click(text, text, text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Marketing consent
-- ---------------------------------------------------------------------
alter table public.inquiries add column if not exists marketing_consent boolean not null default false;
alter table public.inquiries add column if not exists marketing_consent_at timestamptz;
alter table public.portal_accounts add column if not exists marketing_consent boolean not null default false;
alter table public.portal_accounts add column if not exists marketing_consent_at timestamptz;

drop function if exists public.submit_inquiry(text, text, text, text, text, text, text, text, text);
create or replace function public.submit_inquiry(
  p_name text, p_email text, p_phone text, p_country text, p_port text, p_message text, p_stock_no text, p_page_url text, p_source text,
  p_marketing boolean default false
)
returns bigint
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_id uuid;
  n bigint;
  em text := nullif(lower(trim(coalesce(p_email, ''))), '');
  ph text := nullif(trim(coalesce(p_phone, '')), '');
  mk boolean := coalesce(p_marketing, false);
begin
  if coalesce(trim(p_name), '') = '' then raise exception 'Name is required'; end if;
  if em is null and ph is null then raise exception 'Email or phone is required'; end if;
  if em is not null and em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Invalid email'; end if;
  -- simple flood guard: max 5 inquiries per contact per hour
  if (select count(*) from public.inquiries
       where created_at > now() - interval '1 hour'
         and ((em is not null and email = em) or (ph is not null and phone = ph))) >= 5 then
    raise exception 'Too many inquiries, please try again later';
  end if;
  if nullif(trim(coalesce(p_stock_no, '')), '') is not null then
    select id into v_id from public.vehicles where upper(stock_no) = upper(trim(p_stock_no)) and show_on_website limit 1;
  end if;
  insert into public.inquiries (name, email, phone, country, port, message, vehicle_id, stock_no, page_url, source, marketing_consent, marketing_consent_at)
  values (left(trim(p_name), 120), left(em, 200), left(ph, 50), left(nullif(trim(coalesce(p_country, '')), ''), 80),
          left(nullif(trim(coalesce(p_port, '')), ''), 80), left(nullif(trim(coalesce(p_message, '')), ''), 4000),
          v_id, left(nullif(trim(coalesce(p_stock_no, '')), ''), 40), left(p_page_url, 500), coalesce(nullif(p_source, ''), 'website'),
          mk, case when mk then now() end)
  returning inquiry_no into n;
  return n;
end $$;
revoke all on function public.submit_inquiry(text, text, text, text, text, text, text, text, text, boolean) from public;
grant execute on function public.submit_inquiry(text, text, text, text, text, text, text, text, text, boolean) to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  is_first boolean;
  is_staff boolean;
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  mk boolean := coalesce(meta ->> 'marketing', '') = 'true';
begin
  select not exists (select 1 from public.profiles) into is_first;
  is_staff := coalesce(new.raw_app_meta_data ->> 'staff', '') = 'true';

  if not (is_first or is_staff) then
    insert into public.portal_accounts (user_id, email, full_name, company, phone, whatsapp, country, port, marketing_consent, marketing_consent_at)
    values (
      new.id,
      coalesce(new.email, ''),
      left(nullif(trim(meta ->> 'full_name'), ''), 120),
      left(nullif(trim(meta ->> 'company'), ''), 120),
      left(nullif(trim(meta ->> 'phone'), ''), 40),
      left(nullif(trim(meta ->> 'whatsapp'), ''), 40),
      left(nullif(trim(meta ->> 'country'), ''), 80),
      left(nullif(trim(meta ->> 'port'), ''), 80),
      mk,
      case when mk then now() end
    )
    on conflict (user_id) do nothing;
    return new;
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(meta ->> 'full_name', split_part(new.email, '@', 1)),
    case when is_first then 'admin'::public.user_role else 'sales'::public.user_role end
  )
  on conflict (id) do nothing;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
