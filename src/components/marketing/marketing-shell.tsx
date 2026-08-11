"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Scissors, MessageCircle, Globe } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/story", label: "Our Story" },
  { href: "/about", label: "About" },
  { href: "/globalsell", label: "Marketplace" },
];

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/cookies", label: "Cookie Policy" },
];

const DEMO_URL =
  "https://wa.me/254142225233?text=Hi%2C%20I'd%20like%20to%20request%20a%20demo%20of%20FundiFlow";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
              <Scissors className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight text-slate-900">
                FundiFlow
              </span>
              <span className="ml-1.5 hidden rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 sm:inline-block">
                Pro
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={
                  l.href === "/globalsell"
                    ? "flex items-center gap-1.5 text-sm font-semibold text-emerald-700 transition-colors hover:text-emerald-600"
                    : "text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
                }
              >
                {l.href === "/globalsell" && <Globe className="h-3.5 w-3.5" />}
                {l.label}
              </Link>
            ))}
            <a
              href={DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-600"
            >
              <MessageCircle className="h-4 w-4" />
              Request Demo
            </a>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              Log In
            </Link>

            {/*
            <Link
              href="/register"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500"
            >
              Get Started Free
            </Link>
*/}
          </div>

          {/* Mobile toggle */}
          <button
            className="rounded-lg border border-slate-200 p-2 md:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="border-t border-slate-100 bg-white px-4 py-4 md:hidden">
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {l.label}
                </Link>
              ))}
              <a
                href={DEMO_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
              >
                <MessageCircle className="h-4 w-4" />
                Request Demo via WhatsApp
              </a>
            </div>
            <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Log In
              </Link>
             {/*
<Link
  href="/register"
  onClick={() => setOpen(false)}
  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-emerald-500"
>
  Get Started Free
</Link>
*/}
            </div>
          </div>
        )}
      </header>

      {/* ── PAGE CONTENT ── */}
      <main className="flex-1">{children}</main>

      {/* ── FOOTER ── */}
      <footer className="bg-slate-900 py-14 text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
                  <Scissors className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-white">FundiFlow</span>
              </div>
              <p className="text-sm leading-relaxed">
                The complete operating system for modern Kenyan tailoring
                businesses. Work smart. Deliver perfect. Grow faster.
              </p>
              <p className="mt-4 text-sm">
                Powered by{" "}
                <span className="font-semibold text-emerald-400">
                  Advent Nurutech
                </span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Servant of God and friend to man
              </p>
            </div>

            {/* Product */}
            <div>
              <h3 className="mb-4 font-semibold text-white">Product</h3>
              <ul className="space-y-2.5 text-sm">
                {NAV_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="transition-colors hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <a
                    href={DEMO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-white"
                  >
                    Request a Demo
                  </a>
                </li>
                <li>
                  <Link href="/register" className="transition-colors hover:text-white">
                    Get Started
                  </Link>
                </li>
                <li>
                  <Link href="/globalsell" className="flex items-center gap-1.5 text-emerald-400 transition-colors hover:text-emerald-300">
                    <Globe className="h-3.5 w-3.5" />
                    Global Sell Marketplace
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="mb-4 font-semibold text-white">Legal</h3>
              <ul className="space-y-2.5 text-sm">
                {LEGAL_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="transition-colors hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="mb-4 font-semibold text-white">Contact Us</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-base">📞</span>
                  <a href="tel:0142225233" className="hover:text-white transition-colors">
                    0142 225 233
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-base">✉️</span>
                  <a
                    href="mailto:adventnurutech@gmail.com"
                    className="hover:text-white transition-colors"
                  >
                    adventnurutech@gmail.com
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-base">🌐</span>
                  <a
                    href="https://adventnurutech.xyz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    adventnurutech.xyz
                  </a>
                </li>
                <li className="pt-2">
                  <a
                    href={DEMO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp Us
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-6 text-sm sm:flex-row">
            <p>
              © {new Date().getFullYear()} FundiFlow by Advent Nurutech. All
              rights reserved.
            </p>
            <div className="flex gap-5">
              {LEGAL_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="transition-colors hover:text-white"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
