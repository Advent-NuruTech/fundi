import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/features/auth/components/auth-context";
import { Toaster } from "@/components/ui/sonner";
import { PWARegister } from "@/components/pwa/pwa-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const SITE_URL = "https://www.fundiflow.co.ke";
const SITE_NAME = "FundiFlow";
const TITLE_DEFAULT = "FundiFlow – Kenya's #1 Tailoring & SME Business Software";
const DESCRIPTION =
  "Kenya's leading business OS for tailors, wholesalers, retailers & hardware stores. Orders, measurements, inventory, finance & M-Pesa payments — offline-first. Free 14-day trial.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE_DEFAULT,
    template: "%s | FundiFlow",
  },
  description: DESCRIPTION,
  keywords: [
    "tailoring management software Kenya",
    "tailor shop management app",
    "fashion workshop management system",
    "business management software Kenya",
    "POS system for tailors",
    "M-Pesa business software",
    "SME inventory management Kenya",
    "multi-branch business software Kenya",
    "custom tailoring order tracking",
    "hardware store management software Kenya",
  ],
  applicationName: SITE_NAME,
  category: "business software",
  authors: [{ name: "Advent Nurutech Services (ANTS)", url: "https://adventnurutech.xyz" }],
  creator: "Advent Nurutech Services (ANTS)",
  publisher: "Advent Nurutech Services (ANTS)",
  manifest: "/manifest.json",
  formatDetection: {
    telephone: false,
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default",
  },
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    locale: "en_KE",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "FundiFlow – The Leading Business OS for Tailors & SMEs in Kenya",
    description:
      "Manage orders, measurements, inventory, staff, finance and M-Pesa payments from one offline-first platform built for Kenyan tailors, retailers, wholesalers and hardware stores.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "FundiFlow — Business Operating System for African SMEs",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FundiFlow – The Leading Business OS for Tailors & SMEs in Kenya",
    description:
      "Orders, measurements, inventory, finance & M-Pesa payments — one offline-first platform for Kenyan tailors and SMEs.",
    images: ["/og-image.png"],
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
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    other: [{ rel: "mask-icon", url: "/favicon.ico", color: "#059669" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  // TODO: add once verified in Google Search Console / Bing Webmaster Tools
  // verification: { google: "your-real-verification-code" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#059669",
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "FundiFlow",
  alternateName: "FundiFlow by Advent Nurutech",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description: DESCRIPTION,
  sameAs: [
    // TODO: replace with FundiFlow's real social profile URLs (remove any that don't exist)
    "https://www.facebook.com/fundiflow",
    "https://www.instagram.com/fundiflow",
    "https://www.linkedin.com/company/fundiflow",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+254142225233",
    email: "adventnurutech@gmail.com",
    contactType: "customer service",
    areaServed: "KE",
    availableLanguage: ["en", "sw"],
  },
};

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "FundiFlow",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, Android, iOS",
  url: SITE_URL,
  description:
    "Business management software for tailors, fashion workshops, retailers, wholesalers and hardware stores in Kenya. Track orders, measurements, inventory, staff and finances, with M-Pesa payments and offline-first sync.",
  offers: {
    "@type": "Offer",
    price: "690",
    priceCurrency: "KES",
    availability: "https://schema.org/InStock",
    url: `${SITE_URL}/pricing`,
  },
  publisher: {
    "@type": "Organization",
    name: "Advent Nurutech Services (ANTS)",
  },
  // Add aggregateRating only once you have real, verifiable review counts —
  // fabricated ratings violate Google's structured data guidelines and can get the site penalized.
};

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <head>
        <JsonLd data={organizationJsonLd} />
        <JsonLd data={softwareApplicationJsonLd} />
      </head>
      <body className="min-h-full bg-slate-50 text-slate-900 antialiased">
        <AuthProvider>{children}</AuthProvider>
        <Toaster />
        <PWARegister />
      </body>
    </html>
  );
}