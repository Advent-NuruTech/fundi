import { MarketingShell } from "@/components/marketing/marketing-shell";

const LAST_UPDATED = "5 June 2026";
const COMPANY = "Advent Nurutech";
const PRODUCT = "FundiFlow";
const EMAIL = "adventnurutech@gmail.com";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-xl font-bold text-slate-900">{title}</h2>
      <div className="space-y-3 text-slate-600 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

const COOKIE_TABLE = [
  {
    name: "sb-auth-token",
    type: "Essential",
    purpose: "Keeps you logged in to your FundiFlow account securely",
    duration: "Session / 7 days",
    provider: "Supabase",
  },
  {
    name: "sb-refresh-token",
    type: "Essential",
    purpose: "Refreshes your authentication session without requiring re-login",
    duration: "30 days",
    provider: "Supabase",
  },
  {
    name: "fundi-session",
    type: "Essential",
    purpose: "Maintains your active workspace session and preferences",
    duration: "Session",
    provider: "FundiFlow",
  },
  {
    name: "fundi-theme",
    type: "Functional",
    purpose: "Remembers your display preferences (theme, language)",
    duration: "1 year",
    provider: "FundiFlow",
  },
  {
    name: "fundi-sidebar",
    type: "Functional",
    purpose: "Remembers whether the sidebar is open or collapsed",
    duration: "1 year",
    provider: "FundiFlow",
  },
  {
    name: "_ga",
    type: "Analytics",
    purpose: "Distinguishes users for anonymous usage analytics",
    duration: "2 years",
    provider: "Google Analytics (optional)",
  },
];

export default function CookiesPage() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        {/* Header */}
        <div className="mb-12 border-b border-slate-200 pb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-emerald-600">
            Legal
          </p>
          <h1 className="text-4xl font-black text-slate-900 sm:text-5xl">Cookie Policy</h1>
          <p className="mt-3 text-slate-500">
            Last updated: {LAST_UPDATED} &nbsp;·&nbsp; Effective immediately
          </p>
          <p className="mt-4 text-sm text-slate-600 leading-relaxed">
            This Cookie Policy explains how <strong>{COMPANY}</strong> uses cookies and similar
            technologies on the <strong>{PRODUCT}</strong> platform. By using {PRODUCT}, you agree
            to the use of cookies as described in this policy.
          </p>
        </div>

        <Section title="1. What Are Cookies?">
          <p>
            Cookies are small text files stored on your device (computer, phone or tablet) when you
            visit a website or use a web application. They help the service remember information about
            your visit, making your next visit easier and the service more useful.
          </p>
          <p>
            {PRODUCT} also uses <strong>browser local storage</strong> and{" "}
            <strong>IndexedDB</strong> — similar technologies that allow us to store data on your device
            for offline functionality. These are not cookies in the traditional sense, but they serve
            similar purposes.
          </p>
        </Section>

        <Section title="2. Why We Use Cookies">
          <p>We use cookies and local storage for the following purposes:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Authentication:</strong> To keep you logged in to your account securely
            </li>
            <li>
              <strong>Session management:</strong> To maintain your active workspace and preferences
              across pages
            </li>
            <li>
              <strong>Offline functionality:</strong> IndexedDB is used to store your business data
              locally so {PRODUCT} works without an internet connection
            </li>
            <li>
              <strong>User preferences:</strong> To remember your settings, sidebar state and display
              preferences
            </li>
            <li>
              <strong>Performance:</strong> To help us understand how the platform is used so we can
              improve it
            </li>
          </ul>
        </Section>

        <Section title="3. Types of Cookies We Use">
          <p>
            <strong>Essential Cookies</strong> — These are necessary for {PRODUCT} to function.
            Without them, you cannot log in or access your workspace. You cannot opt out of essential
            cookies while using the platform.
          </p>
          <p>
            <strong>Functional Cookies</strong> — These remember your preferences and settings to
            improve your experience. Disabling these means some personalisation features will not work.
          </p>
          <p>
            <strong>Analytics Cookies</strong> — These help us understand how users interact with
            {PRODUCT} so we can improve the platform. We use anonymised, aggregated data only. These
            are optional and can be declined.
          </p>
          <p>
            <strong>We do not use advertising or tracking cookies.</strong> {PRODUCT} does not serve
            advertisements and does not track you across other websites.
          </p>
        </Section>

        <Section title="4. Specific Cookies We Set">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="py-3 pl-3 pr-2 text-left font-semibold">Cookie Name</th>
                  <th className="px-2 py-3 text-left font-semibold">Type</th>
                  <th className="px-2 py-3 text-left font-semibold">Purpose</th>
                  <th className="px-2 py-3 text-left font-semibold">Duration</th>
                  <th className="px-2 py-3 pr-3 text-left font-semibold">Provider</th>
                </tr>
              </thead>
              <tbody>
                {COOKIE_TABLE.map(({ name, type, purpose, duration, provider }, i) => (
                  <tr
                    key={name}
                    className={`border-t border-slate-200 ${i % 2 === 0 ? "bg-white" : "bg-slate-50"}`}
                  >
                    <td className="py-3 pl-3 pr-2 font-mono font-medium text-slate-800">{name}</td>
                    <td className={`px-2 py-3 font-semibold ${type === "Essential" ? "text-rose-600" : type === "Functional" ? "text-blue-600" : "text-amber-600"}`}>
                      {type}
                    </td>
                    <td className="px-2 py-3 text-slate-600">{purpose}</td>
                    <td className="px-2 py-3 text-slate-500">{duration}</td>
                    <td className="px-2 py-3 pr-3 text-slate-500">{provider}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="5. Local Storage and IndexedDB (Offline Data)">
          <p>
            Because {PRODUCT} is an <strong>offline-first Progressive Web App (PWA)</strong>, we store
            certain data directly on your device using browser local storage and IndexedDB. This allows
            the application to work fully without an internet connection.
          </p>
          <p>Data stored locally on your device includes:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Your Zustand session store (user profile, authentication state)</li>
            <li>Offline order queue (orders created without internet, pending sync)</li>
            <li>Cached customer, inventory and order data for offline access</li>
            <li>UI preferences and application state</li>
          </ul>
          <p>
            This local data is synced to our secure cloud database when connectivity is restored.
            You can clear this data at any time by clearing your browser storage or logging out.
          </p>
        </Section>

        <Section title="6. Third-Party Cookies">
          <p>Some third-party services we use may set their own cookies:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Supabase</strong> — sets cookies to manage authentication sessions
            </li>
            <li>
              <strong>Google Sign-In</strong> — if you use &quot;Continue with Google&quot;, Google may set
              authentication cookies. See{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 underline"
              >
                Google&apos;s Privacy Policy
              </a>
            </li>
          </ul>
          <p>
            We do not use Facebook Pixel, advertising networks, retargeting services or social media
            tracking cookies.
          </p>
        </Section>

        <Section title="7. Managing Your Cookie Preferences">
          <p>
            <strong>Browser settings:</strong> You can control and delete cookies through your browser
            settings. Be aware that disabling essential cookies will prevent you from logging into
            {PRODUCT}.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Chrome: Settings → Privacy &amp; Security → Cookies</li>
            <li>Firefox: Options → Privacy &amp; Security → Cookies</li>
            <li>Safari: Preferences → Privacy → Cookies</li>
            <li>Edge: Settings → Cookies and site permissions</li>
          </ul>
          <p>
            <strong>Clearing local data:</strong> To clear all locally stored {PRODUCT} data from
            your device, use your browser&apos;s &quot;Clear Site Data&quot; function (usually in Developer
            Tools → Application → Storage). Note: this will log you out and remove any unsynced
            offline data.
          </p>
        </Section>

        <Section title="8. Updates to This Policy">
          <p>
            We may update this Cookie Policy from time to time as we add new features or third-party
            services. We will notify you of material changes through the platform or by email.
          </p>
        </Section>

        <Section title="9. Contact">
          <p>
            Questions about this Cookie Policy? Contact us at:
          </p>
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5">
            <p className="font-bold text-slate-900">{COMPANY} — {PRODUCT}</p>
            <p>Email: <a href={`mailto:${EMAIL}`} className="text-emerald-600 underline">{EMAIL}</a></p>
          </div>
        </Section>
      </div>
    </MarketingShell>
  );
}
