import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  MessageCircle,
  Scissors,
  Ruler,
  Lightbulb,
  Hammer,
  Rocket,
  Quote,
} from "lucide-react";
import { MarketingShell } from "@/components/marketing/marketing-shell";

const SITE_URL = "https://www.fundiflow.co.ke";
const STORY_URL = `${SITE_URL}/story`;
const IMAGE_URL = `${SITE_URL}/images/story.jpg`;

export const metadata: Metadata = {
  title: "The Founder Story — How One Forgotten Order Became FundiFlow",
  description:
    "Byron Otieno Onyango, founder of FundiFlow, shares how a tailor who forgot his order sparked a mission to build Kenya's business operating system for tailors and fashion businesses.",
  keywords: [
    "FundiFlow founder story",
    "Byron Otieno Onyango",
    "why FundiFlow was built",
    "tailoring software founder Kenya",
    "fundiflow.co.ke story",
    "African startup founder story",
    "tailor business technology Kenya",
    "tailoring software founder Kenya",
  ],
  alternates: {
    canonical: STORY_URL,
  },
  openGraph: {
    type: "article",
    locale: "en_KE",
    url: STORY_URL,
    siteName: "FundiFlow",
    title: "The Founder Story — How One Forgotten Order Became FundiFlow",
    description:
      "Byron Otieno Onyango shares how a tailor who forgot his order sparked a conviction that changed everything: Nothing is impossible when you're willing to build the solution.",
    images: [
      {
        url: IMAGE_URL,
        width: 1122,
        height: 1402,
        alt: "Byron Otieno Onyango — founder of FundiFlow",
      },
    ],
    authors: ["Byron Otieno Onyango"],
    publishedTime: "2026-08-11T00:00:00.000Z",
    modifiedTime: "2026-08-11T00:00:00.000Z",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Founder Story — How One Forgotten Order Became FundiFlow",
    description:
      "Byron Otieno Onyango's story: how one forgotten tailor order became Kenya's tailoring business OS, FundiFlow.",
    images: [IMAGE_URL],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "The Founder Story — How One Forgotten Order Became FundiFlow",
  description:
    "Byron Otieno Onyango, founder of FundiFlow, shares how a tailor who forgot his order sparked a mission to build Kenya's business operating system for tailors and fashion businesses.",
  image: [IMAGE_URL],
  datePublished: "2026-08-11T00:00:00.000Z",
  dateModified: "2026-08-11T00:00:00.000Z",
  author: {
    "@type": "Person",
    name: "Byron Otieno Onyango",
    url: STORY_URL,
    jobTitle: "Founder, FundiFlow",
    worksFor: {
      "@type": "Organization",
      name: "FundiFlow",
      url: SITE_URL,
    },
  },
  publisher: {
    "@type": "Organization",
    name: "FundiFlow",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/logo.png`,
    },
  },
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": STORY_URL,
  },
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Byron Otieno Onyango",
  url: STORY_URL,
  image: IMAGE_URL,
  jobTitle: "Founder",
  worksFor: {
    "@type": "Organization",
    name: "FundiFlow",
    url: SITE_URL,
  },
  brand: {
    "@type": "Brand",
    name: "FundiFlow",
    url: SITE_URL,
  },
  description:
    "Founder of FundiFlow (fundiflow.co.ke), Kenya's business operating system for tailors, fashion designers and garment businesses.",
};

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

const DEMO_URL =
  "https://wa.me/254142225233?text=Hi%2C%20I'd%20like%20to%20request%20a%20demo%20of%20FundiFlow";

const CHAPTERS = [
  {
    icon: Scissors,
    label: "Chapter one",
    title: "Not a software idea — a personal experience",
    paragraphs: [
      "FundiFlow was not born from a software idea. It was born from a personal experience.",
      "I was leveling up — not just in ambition, but in how I carried myself. I'd outgrown off-the-rack. I wanted clothes that fit the person I was becoming, not just the person I was. So I went looking for a tailor who could make that happen — someone whose work spoke before he did.",
      "I asked around. One tailor pointed me to another — a fundi whose name came with a reputation. People spoke of his work the way you speak of something rare. So I went to him.",
    ],
  },
  {
    icon: Ruler,
    label: "Chapter two",
    title: "The order that was forgotten",
    paragraphs: [
      "He took my measurements carefully. I gave him the reference materials, walked him through the design, and paid in full — no shortcuts, no half-measures. I trusted the process.",
      "Three days later, I came back, sure the piece would be ready.",
      "It wasn't. He'd forgotten the order entirely.",
      "I gave him grace — one more day. Surely that would be enough.",
      "When I returned, there was a garment waiting for me. Just not the one I'd ordered. Wrong design. Wrong everything, except the fact that it existed.",
    ],
  },
  {
    icon: Lightbulb,
    label: "Chapter three",
    title: "A question that wouldn't let go",
    paragraphs: [
      "I was disappointed. But instead of walking away, I got curious — I started thinking about the tailor, not just my ruined order. This wasn't a bad tailor. This was clearly a skilled man, buried under a system that had no memory, no structure, no way of holding on to details once a customer walked out the door.",
      "How many other tailors are losing customers this exact way? How many other customers are walking away disappointed, right now, for the same reason?",
    ],
  },
  {
    icon: Hammer,
    label: "Chapter four",
    title: "The spark",
    paragraphs: [
      "That question was the spark.",
      "I started asking myself: what if a tailor could have a simple system that remembers every customer, every measurement, every order, every design reference, every payment, every deadline, and every stage of production? What if the business could actually know what needs to be done, when it needs to be done, and for whom?",
      "That was the beginning of FundiFlow — and it clicked right there, standing in his shop.",
      "I proposed the idea to him on the spot. His reaction was almost disbelief — the kind of excitement that comes with not quite letting yourself believe something like this could exist for someone like him. He asked, in essence, whether it could really be real.",
      "I told him: \u201cNothing is impossible.\u201d",
    ],
  },
  {
    icon: Hammer,
    label: "Chapter five",
    title: "Building with more conviction than skill",
    paragraphs: [
      "The irony was that I had no idea how I was going to build it. I'd never stitched a single seam in my life. I wasn't a tailor. I didn't understand the technical details of running a tailoring workshop. All I had was a problem I'd personally lived through, a conversation with one fundi, and a conviction that there had to be a better way.",
      "That night, I started brainstorming.",
      "I thought about the tailor's daily challenges — customers forgetting what they'd ordered, tailors forgetting deadlines, measurements getting lost, payments becoming impossible to track, fabric being mismanaged, orders moving through production with no clear system watching over them.",
    ],
  },
  {
    icon: Rocket,
    label: "Chapter six",
    title: "Prototypes, redraws, and a bigger vision",
    paragraphs: [
      "I built prototypes. The early versions weren't good enough. I kept going back to the drawing board — I could have shipped something small and called it done, but every version left me unsatisfied. I didn't want a patch. I wanted something remarkable.",
      "Eventually I realized FundiFlow couldn't just be another app that helps a tailor jot down orders. It had to become something bigger: technology that helps tailoring businesses operate professionally, serve customers better, grow sustainably, and compete at a higher level.",
      "That's what FundiFlow is becoming. Not simply a tool for managing tailoring orders — but a way of giving the people behind the craft the systems, visibility, and tools they need to build remarkable businesses.",
      "And this is only the beginning. Tailoring is where the story started; it isn't where it ends. There's a much bigger vision ahead, with more already in the pipeline.",
    ],
  },
];

export default function FounderStoryPage() {
  return (
    <MarketingShell>
      <JsonLd data={articleJsonLd} />
      <JsonLd data={personJsonLd} />

      <article>
        {/* ── HERO ── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-24">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-300">
              <Sparkles className="h-4 w-4" />
              Founder Profile
            </span>
            <h1 className="mb-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
              The story behind{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                FundiFlow
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-slate-300">
              How one unfinished order became a conviction, a company, and a mission to give the
              people behind the craft the systems they deserve.
            </p>
            <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-emerald-400">
              By Byron Otieno Onyango
            </p>
            <p className="mt-1 text-xs text-slate-400">Founder, FundiFlow · fundiflow.co.ke</p>
          </div>
        </section>

        {/* ── FOUNDER IMAGE ── */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="grid items-center gap-10 lg:grid-cols-5">
              <figure className="mx-auto w-full max-w-sm lg:col-span-2">
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl shadow-xl ring-1 ring-slate-200">
                  <Image
                    src="/images/story.jpg"
                    alt="Byron Otieno Onyango, founder of FundiFlow"
                    fill
                    sizes="(min-width: 1024px) 30vw, 90vw"
                    className="object-cover"
                    priority
                  />
                </div>
                <figcaption className="mt-3 text-center text-sm text-slate-500">
                  Byron Otieno Onyango — founder of FundiFlow
                </figcaption>
              </figure>

              <div className="lg:col-span-3">
                <blockquote className="rounded-2xl border-l-4 border-emerald-500 bg-emerald-50 p-6">
                  <Quote className="mb-2 h-6 w-6 text-emerald-500" />
                  <p className="text-xl font-bold leading-relaxed text-slate-800">
                    Nothing is impossible when you&apos;re willing to build the solution.
                  </p>
                </blockquote>
                <p className="mt-6 leading-relaxed text-slate-600">
                  FundiFlow wasn&apos;t born because I wanted to build software for tailors. It was
                  born because I experienced a problem, saw that others were almost certainly
                  experiencing it too, and decided something had to change.
                </p>
                <p className="mt-4 leading-relaxed text-slate-600">
                  What started with one unfinished order has become a conviction I still carry today.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── THE STORY ── */}
        <section className="bg-slate-50 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            {CHAPTERS.map(({ icon: Icon, label, title, paragraphs }) => (
              <div key={title} className="mb-14">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">
                      {label}
                    </span>
                    <h2 className="text-2xl font-black text-slate-900">{title}</h2>
                  </div>
                </div>
                <div className="space-y-4 text-lg leading-relaxed text-slate-600">
                  {paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </div>
            ))}

            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-8 text-center">
              <p className="text-2xl font-black leading-snug text-slate-900 sm:text-3xl">
                &ldquo;Nothing is impossible when you&apos;re willing to build the solution.&rdquo;
              </p>
              <p className="mt-4 text-sm font-semibold text-emerald-700">
                — Byron Otieno Onyango
              </p>
              <p className="text-xs text-slate-500">Founder, FundiFlow · fundiflow.co.ke</p>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 py-20 text-center text-white">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="mb-4 text-3xl font-black sm:text-4xl">
              This story is just the beginning
            </h2>
            <p className="mx-auto mb-9 max-w-2xl text-lg leading-relaxed text-slate-300">
              Tailoring is where the story started; it isn&apos;t where it ends. See what we&apos;re
              building for the people behind the craft.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 hover:bg-emerald-400"
              >
                Start free
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href={DEMO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-8 py-4 text-base font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                <MessageCircle className="h-5 w-5" />
                Request a demo
              </a>
            </div>
          </div>
        </section>
      </article>
    </MarketingShell>
  );
}
