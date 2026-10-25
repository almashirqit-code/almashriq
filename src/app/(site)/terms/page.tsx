import type { Metadata } from "next";
import Link from "next/link";
import { getCompany } from "@/lib/public-site";
import { LegalPage } from "@/components/site/legal-page";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms for using the Al Mashriq Trading website, quotations, orders, payment and shipping of Japanese used vehicles.",
  alternates: { canonical: "/terms" },
};

export default async function TermsPage() {
  const c = await getCompany();
  const name = c.company_name;
  return (
    <LegalPage
      title="Terms of Use"
      intro={
        <p>
          These terms apply to your use of this website and your customer account, operated by {name} in Japan. Each order is also governed by the quotation or invoice we issue
          for it; if they differ, the invoice wins.
        </p>
      }
    >
      <h2>1. Listings and information</h2>
      <ul>
        <li>We describe vehicles, parts and machinery in good faith using auction sheets, inspections and photos, but descriptions, mileage and specifications may contain errors.</li>
        <li>Stock is offered subject to prior sale. A listing is not an offer we are bound to accept.</li>
        <li>Prices on the website are FOB (free on board, Japan) unless stated otherwise, in the currency shown, and may change without notice. The price that applies is the one on your quotation or invoice.</li>
      </ul>

      <h2>2. Quotations, reservations and orders</h2>
      <ul>
        <li>A quotation is an estimate valid until the date shown and is not binding until we issue an invoice.</li>
        <li>A vehicle is reserved for you only once we confirm the reservation, and for the period stated. Reservations not paid in time may be released.</li>
        <li>Ownership passes to you once we have received full payment.</li>
      </ul>

      <h2>3. Payment</h2>
      <ul>
        <li>Payment is by bank transfer (TT) to the company bank account printed on our official invoice. Bank charges on your side are your responsibility.</li>
        <li>
          <b>We never change our bank details by email, chat or phone.</b> If you receive a message asking you to pay elsewhere, do not pay — contact us. Scan the QR code on our
          invoice to confirm it is genuine.
        </li>
        <li>Deposits and refunds follow the terms on your invoice.</li>
      </ul>

      <h2>4. Shipping and import</h2>
      <ul>
        <li>We ship by RoRo or container under the agreed term (FOB, C&amp;F or CIF). Risk passes to you as that term provides.</li>
        <li>Shipping dates depend on shipping lines and ports; we are not liable for delays they cause, but we will keep you informed.</li>
        <li>You are responsible for meeting your country&apos;s import rules (age limits, inspections, permits) and for import duties, taxes and port charges at destination.</li>
      </ul>

      <h2>5. Your customer account</h2>
      <ul>
        <li>Give accurate details and keep your password private. You are responsible for activity on your account.</li>
        <li>We may suspend or close an account that is misused or used fraudulently.</li>
      </ul>

      <h2>6. Using this website</h2>
      <ul>
        <li>Do not misuse the site: no attempts to break in, overload it, copy listings in bulk (scraping) or use it for anything unlawful.</li>
        <li>Photos, text and the Al Mashriq name and logo belong to us or our licensors and may not be reused without permission.</li>
      </ul>

      <h2>7. Liability</h2>
      <p>
        To the extent the law allows, we are not liable for indirect or consequential loss, and our total liability for an order is limited to the price you paid us for it.
        Nothing in these terms limits liability that cannot be limited by law.
      </p>

      <h2>8. Law and disputes</h2>
      <p>These terms are governed by the laws of Japan. Disputes will be handled by the courts of Japan with jurisdiction over our registered office, unless the law requires otherwise.</p>

      <h2>9. Changes and contact</h2>
      <p>
        We may update these terms; the date at the top shows the latest version. See also our <Link href="/privacy">Privacy Policy</Link> and{" "}
        <Link href="/cookies">Cookie Policy</Link>. Questions: {c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : <Link href="/contact">contact us</Link>}.
      </p>
    </LegalPage>
  );
}
