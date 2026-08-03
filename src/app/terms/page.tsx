import { MarketingShell } from "@/components/marketing/marketing-shell";

const LAST_UPDATED = "3 August 2026";
const COMPANY = "Advent Nurutech";
const PRODUCT = "FundiFlow";
const EMAIL = "adventnurutech@gmail.com";
const PHONE = "0142 225 233";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-xl font-bold text-slate-900">{title}</h2>
      <div className="space-y-3 text-slate-600 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        {/* Header */}
        <div className="mb-12 border-b border-slate-200 pb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-emerald-600">
            Legal
          </p>
          <h1 className="text-4xl font-black text-slate-900 sm:text-5xl">Terms of Service</h1>
          <p className="mt-3 text-slate-500">
            Last updated: {LAST_UPDATED} &nbsp;·&nbsp; Effective immediately
          </p>
          <p className="mt-4 text-sm text-slate-600 leading-relaxed">
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of {PRODUCT}, a business
            management platform operated by <strong>{COMPANY}</strong>. Please read these Terms
            carefully before using our services. By creating an account or using {PRODUCT}, you agree
            to be bound by these Terms.
          </p>
          <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
            <strong>Important:</strong> If you are registering on behalf of a business, you confirm that you
            have the authority to bind that business to these Terms.
          </div>
        </div>

        <Section title="1. Definitions">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>&quot;{COMPANY}&quot;</strong> — the company operating {PRODUCT}, its employees, directors and agents</li>
            <li><strong>&quot;{PRODUCT}&quot; / &quot;Platform&quot; / &quot;Service&quot;</strong> — the web application, mobile PWA and API services provided by {COMPANY}</li>
            <li><strong>&quot;Subscriber&quot; / &quot;You&quot;</strong> — the individual or business that has registered an account on {PRODUCT}</li>
            <li><strong>&quot;Workspace&quot;</strong> — your isolated business environment within {PRODUCT}</li>
            <li><strong>&quot;Team Member&quot;</strong> — any user added to your Workspace by you or your designated administrators</li>
            <li><strong>&quot;Customer Data&quot;</strong> — information you input about your end customers, orders and business operations</li>
          </ul>
        </Section>

        <Section title="2. Eligibility and Account Registration">
          <p>To use {PRODUCT} you must:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Be at least 18 years old</li>
            <li>Be operating a legitimate business entity in Kenya or another recognised jurisdiction</li>
            <li>Provide accurate, complete and current registration information</li>
            <li>Have the legal authority to enter into this agreement</li>
          </ul>
          <p>
            You are responsible for maintaining the confidentiality of your login credentials and for
            all activity that occurs under your account. Notify us immediately at {EMAIL} if you
            suspect unauthorised access.
          </p>
        </Section>

        <Section title="3. Subscription Plans and Payment">
          <p>
            {PRODUCT} is offered on a subscription basis. By selecting a plan, you agree to pay the
            applicable monthly subscription fee. There are no installation or setup fees.
          </p>

          <p><strong>Current plans:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Sindano Plan</strong> — KES 690/month
            </li>
            <li>
              <strong>Fundi Plan</strong> — KES 3,399/month
            </li>
            <li>
              <strong>Dhahabu Plan</strong> — KES 8,999/month
            </li>
          </ul>

          <p><strong>Payment terms:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Your first month&apos;s subscription is due before account activation</li>
            <li>Monthly subscription fees are billed on the same date each month</li>
            <li>Accepted payment methods: M-Pesa, bank transfer</li>
            <li>All prices are in Kenya Shillings (KES) and inclusive of applicable taxes</li>
            <li>Late payments may result in account suspension after 7 days of non-payment</li>
            <li>We reserve the right to update pricing with 30 days written notice</li>
          </ul>

          <p>
            <strong>No refund policy:</strong> Monthly subscription fees are non-refundable for the
            current billing period. In exceptional circumstances, refund requests may be considered
            at our sole discretion — contact {EMAIL}.
          </p>
        </Section>

        <Section title="4. Permitted Use">
          <p>
            You may use {PRODUCT} solely for your legitimate tailoring or fashion business operations
            in accordance with these Terms and all applicable laws.
          </p>
          <p>You agree <strong>not</strong> to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Resell, sublicense or white-label {PRODUCT} without our written consent (except Dhahabu white-label subscribers)</li>
            <li>Attempt to reverse-engineer, decompile or extract source code from the platform</li>
            <li>Use the platform to store, transmit or process illegal content</li>
            <li>Attempt to gain unauthorised access to other subscribers&apos; workspaces</li>
            <li>Upload malicious code, viruses or disruptive data</li>
            <li>Use the SMS or WhatsApp notification features to send spam or unsolicited messages</li>
            <li>Misrepresent your identity or business</li>
            <li>Use automated bots or scraping tools against the platform</li>
            <li>Exceed fair usage limits that degrade service for other users</li>
          </ul>
        </Section>

        <Section title="5. Your Data and Content">
          <p>
            <strong>You retain full ownership</strong> of all Customer Data and content you input into
            {PRODUCT}. By using the platform, you grant {COMPANY} a limited, non-exclusive licence to
            process your data solely for the purpose of delivering the services you have subscribed to.
          </p>
          <p>
            You are responsible for ensuring that:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>You have the legal right to collect and store the personal data of your customers</li>
            <li>Your customers are aware their data is being stored in a digital system</li>
            <li>You comply with Kenya&apos;s Data Protection Act 2019 in your use of customer data</li>
          </ul>
        </Section>

        <Section title="6. Role-Based Access and Financial Privacy">
          <p>
            {PRODUCT} provides a role-based access control system. As the workspace Owner, you are
            solely responsible for:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Assigning appropriate roles and permissions to your team members</li>
            <li>Controlling which financial data is visible to managers and staff</li>
            <li>Ensuring that access is revoked when a team member leaves your business</li>
          </ul>
          <p>
            <strong>Financial data visibility:</strong> By default, sensitive financial data (including
            weekly/monthly revenue, net profit, inventory value, payroll liabilities and AI business
            insights) is accessible only to the workspace Owner. Owners may grant additional access to
            designated users through the Finance Access Settings panel.
          </p>
          <p>
            {COMPANY} bears no liability for data accessed by team members within your workspace
            according to the permissions you have configured.
          </p>
        </Section>

        <Section title="7. Service Availability and Uptime">
          <p>
            We strive to maintain {PRODUCT} as a reliable, always-available service. However:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>We do not guarantee 100% uptime except under Dhahabu plans (99.9% SLA)</li>
            <li>Scheduled maintenance windows will be communicated 24 hours in advance</li>
            <li>{PRODUCT} is an offline-first PWA — most features work without internet connectivity</li>
            <li>We are not liable for service interruptions caused by third-party infrastructure (internet providers, M-Pesa, SMS gateways)</li>
          </ul>
        </Section>

        <Section title="8. Intellectual Property">
          <p>
            All intellectual property in {PRODUCT} — including the software, design, trademarks,
            logos, AI models and documentation — belongs exclusively to {COMPANY}. Nothing in these
            Terms grants you any ownership of or licence to our intellectual property beyond the right
            to use the platform as described.
          </p>
          <p>
            You retain all intellectual property rights in your Customer Data and business content.
          </p>
        </Section>

        <Section title="9. Confidentiality">
          <p>
            Both parties agree to keep the other&apos;s confidential information private. {COMPANY} will not
            share your business data, financial information or customer records with any third party
            except as described in our Privacy Policy or required by law.
          </p>
        </Section>

        <Section title="10. Disclaimers and Limitation of Liability">
          <p>
            {PRODUCT} is provided &quot;as is&quot; without warranties of any kind, express or implied. To the
            maximum extent permitted by law:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>{COMPANY} is not liable for indirect, incidental, consequential or punitive damages</li>
            <li>Our total liability to you for any claim shall not exceed the subscription fees paid by you in the 3 months preceding the claim</li>
            <li>We are not liable for business decisions made based on reports, analytics or AI insights generated by the platform</li>
            <li>We are not liable for data loss caused by your own actions, device failure or events beyond our reasonable control</li>
          </ul>
          <p>
            <strong>AI Assistant disclaimer:</strong> AI-generated insights are provided for informational
            purposes only. They do not constitute financial, legal or professional advice. Always
            verify important business decisions independently.
          </p>
        </Section>

        <Section title="11. Termination">
          <p>
            <strong>By you:</strong> You may cancel your subscription at any time by contacting us at
            {EMAIL}. Access will continue until the end of the current billing period. No partial
            refunds for unused days.
          </p>
          <p>
            <strong>By us:</strong> We may suspend or terminate your account immediately if you:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Breach these Terms</li>
            <li>Fail to pay subscription fees within 14 days of the due date</li>
            <li>Use the platform for illegal purposes</li>
            <li>Engage in activity that harms other users or {COMPANY}</li>
          </ul>
          <p>
            Upon termination, we will provide you a 30-day window to export your data before
            permanent deletion.
          </p>
        </Section>

        <Section title="12. Governing Law and Disputes">
          <p>
            These Terms are governed by the laws of the Republic of Kenya. Any disputes arising
            from these Terms shall first be resolved through good-faith negotiation. If negotiation
            fails, disputes shall be submitted to the Kenyan courts with jurisdiction in Nairobi.
          </p>
        </Section>

        <Section title="13. Changes to These Terms">
          <p>
            We may update these Terms from time to time. Material changes will be communicated by
            email and in-app notice at least 14 days before they take effect. Your continued use of
            {PRODUCT} after the effective date of updated Terms constitutes acceptance.
          </p>
        </Section>

        <Section title="14. Contact">
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5">
            <p className="font-bold text-slate-900">{COMPANY} — {PRODUCT}</p>
            <p>Email: <a href={`mailto:${EMAIL}`} className="text-emerald-600 underline">{EMAIL}</a></p>
            <p>Phone: <a href={`tel:${PHONE.replace(/\s/g,"")}`} className="text-emerald-600 underline">{PHONE}</a></p>
          </div>
        </Section>
      </div>
    </MarketingShell>
  );
}
