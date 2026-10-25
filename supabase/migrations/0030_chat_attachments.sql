-- =====================================================================
-- 0030: support chat attachments (photos / PDFs, e.g. TT slips)
--
--  * support_messages gets attachment_path/name/type/size. A message may
--    have an empty body when it carries a file.
--  * Files live in the private 'support-files' bucket under
--    <thread_id>/<random>.<ext>. Only the server (service key) uploads and
--    signs them; there are no storage policies, so nobody reads the bucket
--    directly.
--  * The send functions only accept a file path inside the sender's own
--    thread folder, so a message can't point at another conversation's file.
--  * portal_open_thread: returns (creating if needed) the customer's open
--    thread, so a file can be uploaded into its folder before sending.
--  * Tidy-up: pin search_path on portal_doc_kinds (security advisor).
-- Safe to re-run.
-- =====================================================================

alter table public.support_messages
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text,
  add column if not exists attachment_size int;

alter table public.support_messages drop constraint if exists support_messages_body_chk;
alter table public.support_messages add constraint support_messages_body_chk
  check (char_length(body) <= 4000 and (char_length(body) >= 1 or attachment_path is not null));

do $$ begin
  alter table public.support_messages add constraint support_messages_attachment_chk check (
    attachment_path is null or (
      attachment_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')
      and attachment_size between 1 and 10485760
      and char_length(coalesce(attachment_name, '')) between 1 and 200));
exception when duplicate_object then null; end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('support-files', 'support-files', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Customer's open thread (created on demand). Shared by open + send.
-- ---------------------------------------------------------------------
create or replace function public.portal_thread_for_me()
returns public.support_threads
language plpgsql security definer set search_path = public
as $$
declare
  acct public.portal_accounts;
  cust public.customers;
  t    public.support_threads;
begin
  select * into acct from public.portal_accounts where user_id = auth.uid();
  if not found or acct.status = 'rejected' then raise exception 'not authorized'; end if;
  select * into t from public.support_threads where portal_user_id = auth.uid() and status = 'open' for update;
  if found then return t; end if;
  if acct.status = 'active' then select * into cust from public.customers where id = acct.customer_id; end if;
  insert into public.support_threads (portal_user_id, customer_id, assigned_to, display_name, email)
  values (auth.uid(), cust.id, cust.assigned_to,
          left(coalesce(nullif(cust.name, ''), acct.full_name, split_part(acct.email, '@', 1)), 120), acct.email)
  returning * into t;
  return t;
end $$;
revoke all on function public.portal_thread_for_me() from public, anon, authenticated;

create or replace function public.portal_open_thread()
returns uuid
language sql security definer set search_path = public
as $$ select (public.portal_thread_for_me()).id $$;

-- ---------------------------------------------------------------------
-- Send (customer) — now with an optional attachment.
-- ---------------------------------------------------------------------
drop function if exists public.portal_send_message(text);
create or replace function public.portal_send_message(
  p_body text, p_file_path text default null, p_file_name text default null, p_file_type text default null, p_file_size int default null)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  t   public.support_threads;
  msg public.support_messages;
  b   text := left(trim(coalesce(p_body, '')), 4000);
  who text;
begin
  t := public.portal_thread_for_me();
  if p_file_path is not null and p_file_path not like t.id::text || '/%' then raise exception 'Invalid file'; end if;
  if b = '' and p_file_path is null then raise exception 'Empty message'; end if;
  if (select count(*) from public.support_messages
       where thread_id = t.id and sender_kind = 'customer' and created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'Too many messages, please slow down';
  end if;
  select left(coalesce(nullif(c.name, ''), pa.full_name, split_part(pa.email, '@', 1)), 120) into who
    from public.portal_accounts pa left join public.customers c on c.id = pa.customer_id and pa.status = 'active'
   where pa.user_id = auth.uid();

  insert into public.support_messages (thread_id, sender_id, sender_kind, sender_name, body, attachment_path, attachment_name, attachment_type, attachment_size)
  values (t.id, auth.uid(), 'customer', who, b, p_file_path, left(p_file_name, 200), p_file_type, p_file_size)
  returning * into msg;
  update public.support_threads
     set last_message = left(coalesce(nullif(b, ''), '📎 ' || p_file_name), 140), last_message_at = msg.created_at,
         staff_unread = staff_unread + 1, customer_unread = 0
   where id = t.id;
  return jsonb_build_object('thread_id', t.id, 'message', to_jsonb(msg) - 'sender_id' - 'attachment_path');
end $$;

-- ---------------------------------------------------------------------
-- Send (staff) — now with an optional attachment.
-- ---------------------------------------------------------------------
drop function if exists public.staff_send_message(uuid, text);
create or replace function public.staff_send_message(
  p_thread uuid, p_body text, p_file_path text default null, p_file_name text default null, p_file_type text default null, p_file_size int default null)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  t   public.support_threads;
  msg public.support_messages;
  b   text := left(trim(coalesce(p_body, '')), 4000);
  who text;
begin
  select * into t from public.support_threads where id = p_thread for update;
  if not found or not public.staff_can_see_thread(t.customer_id, t.assigned_to) then raise exception 'not authorized'; end if;
  if t.status <> 'open' then raise exception 'This conversation is closed'; end if;
  if p_file_path is not null and p_file_path not like t.id::text || '/%' then raise exception 'Invalid file'; end if;
  if b = '' and p_file_path is null then raise exception 'Empty message'; end if;
  select left(coalesce(nullif(full_name, ''), split_part(email, '@', 1)), 120) into who from public.profiles where id = auth.uid();

  insert into public.support_messages (thread_id, sender_id, sender_kind, sender_name, body, attachment_path, attachment_name, attachment_type, attachment_size)
  values (t.id, auth.uid(), 'staff', coalesce(who, 'Al Mashriq'), b, p_file_path, left(p_file_name, 200), p_file_type, p_file_size)
  returning * into msg;
  update public.support_threads
     set last_message = left(coalesce(nullif(b, ''), '📎 ' || p_file_name), 140), last_message_at = msg.created_at,
         customer_unread = customer_unread + 1, staff_unread = 0,
         assigned_to = coalesce(assigned_to, auth.uid())
   where id = t.id;
  return jsonb_build_object('thread_id', t.id, 'message', to_jsonb(msg) - 'sender_id' - 'attachment_path');
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.portal_open_thread()',
    'public.portal_send_message(text, text, text, text, int)',
    'public.staff_send_message(uuid, text, text, text, text, int)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- Security advisor: pin the search path on the 0027 helper.
alter function public.portal_doc_kinds() set search_path = public;
