-- =====================================================================
-- Al Mashriq ERP — invoice branding (company contact, stamp, banks)
-- Run after 0003. Safe to re-run. Only fills settings that are still empty.
-- =====================================================================

alter table public.settings
  add column if not exists fax                text,
  add column if not exists mobile             text,
  add column if not exists stamp_url          text,
  add column if not exists intermediary_bank  text;

-- Company details from the existing Al Mashriq invoice (kept if already set)
update public.settings set
  company_name      = case when company_name in ('Al Mashriq Trading', '') then 'AL MASHRIQ TRADING CO., LTD.' else company_name end,
  company_name_ja   = coalesce(nullif(company_name_ja, ''), 'AL-MASHRIQ TRADING株式会社'),
  address           = coalesce(nullif(address, ''), E'2008-2 Hokunanmoro, Yuki-shi\nIbaraki-ken 307-0036, Japan'),
  phone             = coalesce(nullif(phone, ''), '+81-296-54-5270'),
  fax               = coalesce(nullif(fax, ''), '+81-296-54-5271'),
  mobile            = coalesce(nullif(mobile, ''), '+81-70-8980-1197'),
  email             = coalesce(nullif(email, ''), 'almashriqtradingjp@gmail.com'),
  bank_details      = coalesce(nullif(bank_details, ''), E'Bank Name: The Bank of Tokyo-Mitsubishi UFJ, Ltd.\nBranch: Kasukabe Branch (630)\nAddress: 1-3, Kasukabe Higashi 1-Chome, Kasukabe, Saitama, JP 344-0062\nAccount Holder: AL Mashriq Trading\nAccount Number: 0410366\nSWIFT Code: BOTKJPJT'),
  intermediary_bank = coalesce(nullif(intermediary_bank, ''), E'Bank Name: The Bank of Tokyo-Mitsubishi UFJ, Ltd.\nBranch: New York Branch\nAddress: 1251 Avenue of the Americas, New York, NY 10020-1104, USA\nSWIFT Code: BOTKUS33'),
  invoice_terms     = case
                        when invoice_terms is null or invoice_terms = ''
                          or invoice_terms = 'Payment due within 7 days. Vehicle will be shipped after full payment is received.'
                        then 'I agree to be bound by the terms and conditions. Payment must be cleared as soon as possible. Many thanks for your custom! We look forward to doing business with you again in due course.'
                        else invoice_terms end
where id = 1;

-- Invoice numbers: with a blank prefix, numbers are plain (e.g. 1079733),
-- matching the existing numbering. With a prefix: PREFIX-YYYY-0001.
create or replace function public.next_invoice_number()
returns text
language plpgsql security definer set search_path = public
as $$
declare
  n int;
  p text;
begin
  if public.auth_role() is null then
    raise exception 'not authorized';
  end if;
  update public.settings
     set next_invoice_no = next_invoice_no + 1
   where id = 1
  returning next_invoice_no - 1, invoice_prefix into n, p;
  if coalesce(trim(p), '') = '' then
    return n::text;
  end if;
  return p || '-' || to_char(current_date, 'YYYY') || '-' || lpad(n::text, 4, '0');
end $$;

-- =====================================================================
-- Shipment terms: FOB has no freight; C&F adds freight; CIF adds freight
-- and insurance. Shipment method: RoRo or container (20ft / 40ft).
-- =====================================================================
alter table public.invoices
  add column if not exists freight        numeric(14, 2) not null default 0,
  add column if not exists insurance      numeric(14, 2) not null default 0,
  add column if not exists shipment_type  text;

do $$ begin
  alter table public.invoices add constraint invoices_shipment_type_chk
    check (shipment_type is null or shipment_type in ('roro', 'container_20', 'container_40'));
exception when duplicate_object then null; end $$;

-- Older invoices used the label "CNF"; keep it, the app shows it as "C&F".
