-- =====================================================================
-- 0021: invoice document types, QR verification, automatic reference numbers
--
--  * invoices.doc_type: 'invoice' (sales invoice, as before), 'quotation'
--    (QT-YYYY-0001, valid-until date, never takes payments, can be converted
--    into an invoice) and 'auction_deposit' (AD-YYYY-0001: car still at
--    auction, customer pays only the deposit).
--    Only real invoices drive vehicle status (reserved/sold).
--  * invoices.verify_token: random token printed as a QR code; anyone can scan
--    it to check the document is genuine and whether it is paid
--    (public_verify_document).
--  * next_ref(kind): next stock / part / machine reference number.
-- =====================================================================

alter table public.invoices
  add column if not exists doc_type       text not null default 'invoice',
  add column if not exists valid_until    date,
  add column if not exists converted_from uuid references public.invoices (id) on delete set null,
  add column if not exists verify_token   text not null default replace(gen_random_uuid()::text, '-', '');

do $$ begin
  alter table public.invoices add constraint invoices_doc_type_chk
    check (doc_type in ('invoice', 'quotation', 'auction_deposit'));
exception when duplicate_object then null; end $$;

create unique index if not exists invoices_verify_token_key on public.invoices (verify_token);
create index if not exists invoices_doc_type_idx on public.invoices (doc_type, issue_date desc);
create index if not exists invoices_converted_from_idx on public.invoices (converted_from);

alter table public.settings
  add column if not exists next_quotation_no int not null default 1,
  add column if not exists next_deposit_no   int not null default 1;

-- ---------------------------------------------------------------------
-- Numbering per document type
-- ---------------------------------------------------------------------
create or replace function public.next_document_number(p_kind text)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  n int;
begin
  if public.auth_role() is null then
    raise exception 'not authorized';
  end if;
  if p_kind = 'quotation' then
    update public.settings set next_quotation_no = next_quotation_no + 1 where id = 1
    returning next_quotation_no - 1 into n;
    return 'QT-' || to_char(current_date, 'YYYY') || '-' || lpad(n::text, 4, '0');
  elsif p_kind = 'auction_deposit' then
    update public.settings set next_deposit_no = next_deposit_no + 1 where id = 1
    returning next_deposit_no - 1 into n;
    return 'AD-' || to_char(current_date, 'YYYY') || '-' || lpad(n::text, 4, '0');
  end if;
  return public.next_invoice_number();
end $$;
revoke all on function public.next_document_number(text) from public, anon;
grant execute on function public.next_document_number(text) to authenticated;

-- ---------------------------------------------------------------------
-- Vehicle status: only real invoices count (quotations / auction deposits do not)
-- ---------------------------------------------------------------------
create or replace function public.sync_vehicle_status(v_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  best public.invoice_status;
  cur  public.vehicle_status;
  has_res boolean;
begin
  if v_id is null then return; end if;
  select status into cur from public.vehicles where id = v_id;
  if cur = 'shipped' then return; end if;

  select i.status into best
    from public.invoice_items it
    join public.invoices i on i.id = it.invoice_id
   where it.vehicle_id = v_id and i.status <> 'cancelled' and i.doc_type = 'invoice'
   order by case i.status when 'paid' then 1 when 'partially_paid' then 2 when 'issued' then 3 else 4 end
   limit 1;

  select exists (select 1 from public.reservations r where r.vehicle_id = v_id and r.status = 'active') into has_res;

  update public.vehicles
     set status = case
                    when best is null and has_res then 'reserved'::public.vehicle_status
                    when best is null then 'in_stock'::public.vehicle_status
                    when best = 'draft' then 'reserved'::public.vehicle_status
                    else 'sold'::public.vehicle_status
                  end
   where id = v_id;
end $$;

-- ---------------------------------------------------------------------
-- Quotations never take payments
-- ---------------------------------------------------------------------
create or replace function public.trg_payments_doc_guard()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if exists (select 1 from public.invoices i where i.id = new.invoice_id and i.doc_type = 'quotation') then
    raise exception 'A quotation cannot take payments. Convert it to an invoice first.';
  end if;
  return new;
end $$;

drop trigger if exists payments_doc_guard on public.payments;
create trigger payments_doc_guard before insert or update on public.payments
  for each row execute function public.trg_payments_doc_guard();

-- ---------------------------------------------------------------------
-- QR verification (public). Returns only what a buyer/bank needs to confirm the
-- document: number, type, dates, total, paid status. Customer name is masked.
-- Drafts are not verifiable.
-- ---------------------------------------------------------------------
create or replace function public.public_verify_document(p_token text)
returns table (
  doc_type text, invoice_no text, issue_date date, due_date date, valid_until date,
  currency text, total numeric, amount_paid numeric, status text,
  customer text, company text, units int
)
language sql stable security definer set search_path = public
as $$
  select i.doc_type, i.invoice_no, i.issue_date, i.due_date, i.valid_until,
         i.currency, i.total, i.amount_paid, i.status::text,
         (select string_agg(left(w, 1) || repeat('*', greatest(length(w) - 1, 2)), ' ')
            from unnest(regexp_split_to_array(trim(coalesce(c.name, '')), '\s+')) as w
           where w <> ''),
         (select s.company_name from public.settings s where s.id = 1),
         (select count(*)::int from public.invoice_items it where it.invoice_id = i.id and it.vehicle_id is not null)
    from public.invoices i
    left join public.customers c on c.id = i.customer_id
   where length(p_token) = 32 and i.verify_token = p_token and i.status <> 'draft'
   limit 1;
$$;
revoke all on function public.public_verify_document(text) from public;
grant execute on function public.public_verify_document(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Automatic reference numbers: next free number after the highest existing one
--   vehicle   -> AM-36167   (vehicles.stock_no)
--   part      -> P-1001     (parts.part_no)
--   machinery -> M-2002     (machinery.stock_no)
-- ---------------------------------------------------------------------
create or replace function public.next_ref(p_kind text)
returns text
language plpgsql stable security definer set search_path = public
as $$
declare
  n bigint;
begin
  if public.auth_role() is null then
    raise exception 'not authorized';
  end if;
  if p_kind = 'vehicle' then
    select coalesce(max((substring(stock_no from '^AM-(\d+)$'))::bigint), 10000) + 1 into n
      from public.vehicles where stock_no ~ '^AM-\d+$';
    return 'AM-' || n;
  elsif p_kind = 'part' then
    select coalesce(max((substring(part_no from '^P-(\d+)$'))::bigint), 1000) + 1 into n
      from public.parts where part_no ~ '^P-\d+$';
    return 'P-' || n;
  elsif p_kind = 'machinery' then
    select coalesce(max((substring(stock_no from '^M-(\d+)$'))::bigint), 2000) + 1 into n
      from public.machinery where stock_no ~ '^M-\d+$';
    return 'M-' || n;
  end if;
  raise exception 'unknown kind %', p_kind;
end $$;
revoke all on function public.next_ref(text) from public, anon;
grant execute on function public.next_ref(text) to authenticated;
