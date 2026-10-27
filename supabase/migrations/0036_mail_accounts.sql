-- =====================================================================
-- 0036: ERP inbox — connected Zoho Mail mailboxes
--
--  * mail_accounts: one row per Zoho mailbox an admin connected (sales@,
--    support@...). Holds the OAuth refresh token, so the table has RLS on
--    and NO policies: only the server (service key) reads or writes it.
--  * staff_mailboxes(): the mailboxes the signed-in staff member may use
--    (id, address, name only — never the token). `roles` decides who:
--    by default every staff role.
-- Safe to re-run.
-- =====================================================================

create table if not exists public.mail_accounts (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  display_name    text,
  zoho_account_id text not null,
  mail_domain     text not null,          -- e.g. https://mail.zoho.com (data centre of the account)
  accounts_server text not null,          -- e.g. https://accounts.zoho.com
  refresh_token   text not null,
  roles           public.user_role[] not null default array['admin', 'manager', 'sales']::public.user_role[],
  sort_order      int not null default 0,
  connected_by    uuid references public.profiles (id) on delete set null,
  connected_at    timestamptz not null default now()
);
create index if not exists mail_accounts_connected_by_idx on public.mail_accounts (connected_by);

alter table public.mail_accounts enable row level security;
-- No policies on purpose: tokens are server-only.

create or replace function public.staff_mailboxes()
returns table (id uuid, email text, display_name text, roles public.user_role[])
language sql stable security definer set search_path = public
as $$
  select m.id, m.email, m.display_name, m.roles
    from public.mail_accounts m
   where public.auth_role() = any (m.roles)
   order by m.sort_order, m.email
$$;
revoke all on function public.staff_mailboxes() from public, anon;
grant execute on function public.staff_mailboxes() to authenticated;
