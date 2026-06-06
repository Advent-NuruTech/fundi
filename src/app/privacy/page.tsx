import { MarketingShell } from "@/components/marketing/marketing-shell";

const LAST_UPDATED = "5 June 2026";
const COMPANY = "Advent Nurutech";
const PRODUCT = "FundiFlow";
const EMAIL = "adventnurutech@gmail.com";
const PHONE = "0142 225 233";
const WEBSITE = "adventnurutech.xyz";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-xl font-bold text-slate-900">{title}</h2>
      <div className="space-y-3 text-slate-600 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        {/* Header */}
        <div className="mb-12 border-b border-slate-200 pb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-emerald-600">
            Legal
          </p>
          <h1 className="text-4xl font-black text-slate-900 sm:text-5xl">Privacy Policy</h1>
          <p className="mt-3 text-slate-500">
            Last updated: {LAST_UPDATED} &nbsp;·&nbsp; Effective immediately
          </p>
          <p className="mt-4 text-sm text-slate-600 leading-relaxed">
            {COMPANY} (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates {PRODUCT} — a business management platform for
            tailoring businesses. This Privacy Policy explains how we collect, use, disclose and
            protect your personal information when you use our services.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            By registering for or using {PRODUCT}, you agree to the terms of this Privacy Policy.
            If you do not agree, please do not use the platform.
          </p>
        </div>

        <Section title="1. Who We Are">
          <p>
            <strong>{PRODUCT}</strong> is a product of <strong>{COMPANY}</strong>, a technology company
            registered in Kenya. We build smart, affordable software tools for small and medium-sized
            businesses in the tailoring and fashion industry.
          </p>
          <p>
            <strong>Contact:</strong> {EMAIL} &nbsp;|&nbsp; {PHONE} &nbsp;|&nbsp; {WEBSITE}
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <p>We collect information in the following ways:</p>

          <p><strong>a) Information you provide to us:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Account registration details: name, email address, phone number, business name, location</li>
            <li>Customer records you create: customer names, contact details, body measurements, photos and order notes</li>
            <li>Employee records: staff names, roles, contact details, pay rates and schedules</li>
            <li>Financial data: income records, expenses, withdrawals, savings goals and investments you enter</li>
            <li>Order and production data: garment details, fabric selections, fitting notes and delivery records</li>
            <li>Inventory records: materials, stock levels, purchase orders and supplier information</li>
            <li>Profile information: profile photo, biography and preferences</li>
          </ul>

          <p><strong>b) Information collected automatically:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Device information: device type, operating system, browser type</li>
            <li>Usage data: pages visited, features used, session duration and interaction logs</li>
            <li>IP address and approximate location (city/country level)</li>
            <li>Cookies and local storage data (see our Cookie Policy)</li>
            <li>Error logs and crash reports to help us fix bugs</li>
          </ul>

          <p><strong>c) Information from third parties:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>If you sign in via Google, we receive your Google account email, name and profile photo</li>
            <li>Payment confirmation data from M-Pesa (we do not store your M-Pesa PIN or full account details)</li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Information">
          <p>We use your information to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide, operate and improve the {PRODUCT} platform</li>
            <li>Create and manage your business account and workspace</li>
            <li>Process customer orders, track inventory and generate reports within your account</li>
            <li>Send SMS and WhatsApp notifications to your customers on your behalf</li>
            <li>Generate AI-powered business insights based on your business data</li>
            <li>Send you essential service communications (account alerts, security notices, payment confirmations)</li>
            <li>Respond to your support requests and enquiries</li>
            <li>Detect and prevent fraud, abuse or security threats</li>
            <li>Comply with legal obligations under Kenyan law</li>
            <li>Improve platform performance through anonymised analytics</li>
          </ul>

          <p>
            <strong>We do not use your business or customer data for advertising purposes.</strong> Your
            customers&apos; data belongs to you and is only used to deliver the services you have
            explicitly configured.
          </p>
        </Section>

        <Section title="4. Data Ownership and Your Rights">
          <p>
            <strong>Your data is yours.</strong> As a {PRODUCT} subscriber, you own all the business
            data you create — customer records, orders, financial records and inventory. {COMPANY} acts
            as a data processor on your behalf.
          </p>
          <p>Under Kenyan data protection law and as a matter of principle, you have the right to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Access</strong> — request a copy of all personal data we hold about you</li>
            <li><strong>Correction</strong> — request correction of inaccurate or incomplete data</li>
            <li><strong>Deletion</strong> — request deletion of your account and associated data</li>
            <li><strong>Portability</strong> — export your business data in a standard format</li>
            <li><strong>Objection</strong> — object to certain uses of your data</li>
            <li><strong>Restriction</strong> — request that we limit how we process your data</li>
          </ul>
          <p>
            To exercise any of these rights, contact us at {EMAIL}. We will respond within 14
            business days.
          </p>
        </Section>

        <Section title="5. Data Sharing and Disclosure">
          <p>
            <strong>We do not sell your personal data.</strong> We only share data in the following
            limited circumstances:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Service providers:</strong> We use Supabase (database), Cloudinary (image storage),
              Africa&apos;s Talking (SMS), and Google (authentication). These providers process data only
              as instructed by us and are bound by data processing agreements.
            </li>
            <li>
              <strong>Within your workspace:</strong> Data you create is shared with the team members in
              your workspace according to the role-based access controls you configure.
            </li>
            <li>
              <strong>Legal requirements:</strong> We may disclose data if required by Kenyan law, court
              order or government authority.
            </li>
            <li>
              <strong>Business transfer:</strong> If {COMPANY} is acquired or merged, your data may be
              transferred to the new entity under the same privacy protections.
            </li>
          </ul>
        </Section>

        <Section title="6. Data Security">
          <p>We implement the following security measures to protect your data:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>All data is encrypted in transit using TLS/HTTPS</li>
            <li>Data at rest is encrypted using AES-256 encryption</li>
            <li>Database access uses row-level security — your data is isolated from other businesses</li>
            <li>Passwords are hashed using industry-standard bcrypt</li>
            <li>Access to production systems is restricted to authorised personnel only</li>
            <li>Regular security reviews and penetration testing</li>
          </ul>
          <p>
            Despite our best efforts, no system is 100% secure. If you discover a security
            vulnerability, please report it immediately to {EMAIL}.
          </p>
        </Section>

        <Section title="7. Data Retention">
          <p>
            We retain your data for as long as your account is active. When you close your account:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>We will delete your data within 30 days of account closure upon request</li>
            <li>Anonymised, aggregated analytics data may be retained indefinitely</li>
            <li>Financial transaction logs may be retained for up to 7 years to comply with Kenyan tax and financial regulations</li>
            <li>Backup copies may persist for up to 90 days before being permanently deleted</li>
          </ul>
        </Section>

        <Section title="8. Cookies and Tracking">
          <p>
            We use cookies and browser local storage to keep you logged in and remember your
            preferences. See our full{" "}
            <a href="/cookies" className="text-emerald-600 underline hover:text-emerald-500">
              Cookie Policy
            </a>{" "}
            for details.
          </p>
        </Section>

        <Section title="9. Children's Privacy">
          <p>
            {PRODUCT} is designed for business use by adults aged 18 and over. We do not knowingly
            collect personal data from children under 18. If you believe a child has provided us
            with personal information, contact us at {EMAIL} and we will delete it promptly.
          </p>
        </Section>

        <Section title="10. International Data Transfers">
          <p>
            Your data is primarily stored and processed in servers located within Africa (Supabase
            regional infrastructure). Some data may be processed by our service providers in other
            regions. When this occurs, we ensure appropriate safeguards are in place.
          </p>
        </Section>

        <Section title="11. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. When we make material changes, we
            will notify you by email and display a notice within the {PRODUCT} platform at least 14
            days before the changes take effect. Your continued use of {PRODUCT} after the effective
            date constitutes acceptance of the updated policy.
          </p>
        </Section>

        <Section title="12. Contact Us">
          <p>
            If you have any questions, concerns or requests regarding this Privacy Policy or your
            personal data, please contact us:
          </p>
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 not-prose">
            <p className="font-bold text-slate-900">{COMPANY}</p>
            <p>Product: {PRODUCT}</p>
            <p>Email: <a href={`mailto:${EMAIL}`} className="text-emerald-600 underline">{EMAIL}</a></p>
            <p>Phone: <a href={`tel:${PHONE.replace(/\s/g,"")}`} className="text-emerald-600 underline">{PHONE}</a></p>
            <p>Website: <a href={`https://${WEBSITE}`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline">{WEBSITE}</a></p>
          </div>
        </Section>
      </div>
    </MarketingShell>
  );
}
