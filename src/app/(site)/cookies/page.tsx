import type { Metadata } from "next";
import Link from "next/link";
import { getCompany } from "@/lib/public-site";
import { LegalPage } from "@/components/site/legal-page";
import { CookieSettingsLink } from "@/components/site/consent";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "The cookies Al Mashriq Trading uses, why, and how to change your choices.",
  alternates: { canonical: "/cookies" },
};

export default async function CookiesPage() {
  const c = await getCompany();
  return (
    <LegalPage
      title="Cookie Policy"
      intro={
        <p>
          Cookies are small files a website stores in your browser. {c.company_name} uses only the cookies the site needs unless you choose otherwise. Analytics and chat/review
          cookies are set only after you allow them in our cookie banner.
        </p>
      }
    >
      <h2>Your choices</h2>
      <p>
        You can change or withdraw your consent at any time: <CookieSettingsLink className="font-semibold text-brand-700 underline" />. You can also delete cookies in your
        browser settings. Blocking necessary cookies may stop sign-in from working.
      </p>

      <h2>Necessary (always on)</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Purpose</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>sb-…-auth-token</td>
            <td>Keeps you signed in to your customer account (Supabase).</td>
            <td>Session / until sign-out</td>
          </tr>
          <tr>
            <td>locale</td>
            <td>Remembers your language.</td>
            <td>1 year</td>
          </tr>
          <tr>
            <td>am_consent (local storage)</td>
            <td>Remembers your cookie choices.</td>
            <td>1 year</td>
          </tr>
        </tbody>
      </table>

      <h2>Analytics (only with your consent)</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Purpose</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>_ga, _ga_*</td>
            <td>Google Analytics: counts visits and shows which pages are useful, so we can improve the site. Not used on customer account pages.</td>
            <td>Up to 2 years</td>
          </tr>
        </tbody>
      </table>

      <h2>Chat &amp; reviews (only with your consent)</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Purpose</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>__tawkuuid, TawkConnectionTime, twk_*</td>
            <td>Tawk.to live chat: keeps your chat conversation connected.</td>
            <td>Session to 6 months</td>
          </tr>
          <tr>
            <td>Trustpilot cookies</td>
            <td>Shows our Trustpilot review widget.</td>
            <td>Set by Trustpilot</td>
          </tr>
        </tbody>
      </table>
      <p>
        Without these, you can still reach us by WhatsApp, email or the inquiry form, and see our reviews on Trustpilot&apos;s own website.
      </p>

      <h2>More information</h2>
      <p>
        See our <Link href="/privacy">Privacy Policy</Link> for how we handle personal data.
      </p>
    </LegalPage>
  );
}
