import type { Metadata } from "next";
import Link from "next/link";
import { getCompany } from "@/lib/public-site";
import { LegalPage } from "@/components/site/legal-page";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Al Mashriq Trading collects, uses and protects your personal data when you browse our website, send an inquiry or use your customer account.",
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPage() {
  const c = await getCompany();
  const name = c.company_name;
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          This policy explains how {name} (&quot;we&quot;, &quot;us&quot;) handles personal data when you visit this website, contact us, buy a vehicle, part or machine from us,
          or use your customer account. We follow Japan&apos;s Act on the Protection of Personal Information (APPI) and, for visitors in the EU/UK, the GDPR.
        </p>
      }
    >
      <h2>1. Who we are</h2>
      <p>
        {name} is a Japanese exporter of used vehicles, spare parts and machinery and is the controller of your personal data.
        {c.address ? ` Address: ${c.address.replace(/\s*\n\s*/g, ", ")}.` : ""} {c.email ? <>Email: <a href={`mailto:${c.email}`}>{c.email}</a>.</> : null}
      </p>

      <h2>2. What we collect</h2>
      <ul>
        <li><b>Contact details</b> you give us in inquiries, quotation requests, chat or your account: name, company, email, phone/WhatsApp, country and destination port.</li>
        <li><b>Account data</b>: your sign-in email and a securely hashed password (we never see your password), plus your account status.</li>
        <li><b>Order and payment records</b>: quotations, invoices, reservations, the vehicles you buy, payments and bank transfer (TT) details, consignee/notify party and shipping documents.</li>
        <li><b>Messages and files</b> you send us through inquiries or the support chat, including attachments such as payment slips.</li>
        <li><b>Technical data</b>: IP address, browser and device information and sign-in events, used to keep the site secure and to stop abuse (for example, limiting repeated sign-in attempts).</li>
        <li><b>Usage data</b>: pages viewed and similar statistics, only if you allow analytics cookies (see our <Link href="/cookies">Cookie Policy</Link>).</li>
      </ul>

      <h2>3. Why we use it</h2>
      <ul>
        <li>To answer your inquiries and send quotations (our legitimate interest, or steps you asked for before a contract).</li>
        <li>To sell and export your order: invoices, payments, reservations, shipping, inspection, export certificates and documents (performance of our contract with you).</li>
        <li>To run your customer account, support chat and document downloads.</li>
        <li>To keep records required by law, such as accounting, tax and export records (legal obligation).</li>
        <li>To protect the website and our customers against fraud and misuse (legitimate interest).</li>
        <li>To understand how the website is used and improve it, only with your consent.</li>
      </ul>
      <p>We do not sell your personal data and we do not use it for automated decisions with legal effect.</p>

      <h2>4. Who we share it with</h2>
      <ul>
        <li><b>Service providers</b> that host and run our systems for us: Supabase (database, sign-in and file storage), Vercel (website hosting), and, only with your consent, Google Analytics (statistics), Tawk.to (live chat) and Trustpilot (reviews).</li>
        <li><b>Partners needed to deliver your order</b>: shipping lines, freight forwarders, inspection agencies, couriers and banks.</li>
        <li><b>Authorities</b> when the law requires it, for example customs or tax authorities.</li>
      </ul>

      <h2>5. International transfers</h2>
      <p>
        Our providers may process data in Japan, the United States and other countries. Where data leaves your country we rely on the providers&apos; contractual safeguards
        (such as standard contractual clauses) and the protections required by APPI.
      </p>

      <h2>6. How long we keep it</h2>
      <ul>
        <li>Order, invoice and payment records: as long as the law requires (in Japan, generally 7 years).</li>
        <li>Inquiries that did not lead to an order: up to 2 years.</li>
        <li>Your customer account, chat and documents: while your account is open, then deleted or anonymised unless we must keep them by law.</li>
      </ul>

      <h2>7. Your rights</h2>
      <p>
        You can ask to see, correct or delete your data, object to or restrict its use, receive a copy, and withdraw consent at any time (you can change cookie choices with
        &quot;Cookie settings&quot; at the bottom of every page). You may also complain to your data protection authority — in Japan, the Personal Information Protection Commission.
        To make a request, contact us at the address below. We may need to confirm your identity first.
      </p>

      <h2>8. Security</h2>
      <p>
        We use encrypted connections, access controls so that staff only see what their role needs, private storage with short-lived download links, and limits on
        repeated sign-in attempts. No system is perfectly secure, so please keep your password private and tell us if you suspect misuse of your account.
      </p>
      <p>
        <b>Payment safety:</b> we will never ask you to pay to a different bank account by email or chat. Always pay using the bank details on our official invoice, and scan the
        QR code on the invoice to confirm it is genuine.
      </p>

      <h2>9. Children</h2>
      <p>Our services are for businesses and adults. We do not knowingly collect data from anyone under 16.</p>

      <h2>10. Changes and contact</h2>
      <p>
        We may update this policy; the date at the top shows the latest version. Questions or requests:{" "}
        {c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : <Link href="/contact">our contact page</Link>}.
      </p>
    </LegalPage>
  );
}
