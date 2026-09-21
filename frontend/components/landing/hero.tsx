"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

export function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    requestAnimationFrame(() => el.classList.add("hero-visible"));
  }, []);

  const scrollToHowItWorks = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      style={{ backgroundColor: "var(--land-bg)" }}
      className="relative min-h-screen overflow-hidden flex items-center"
    >
      {/* Radial accents */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 80%, var(--land-forest)18 0%, transparent 50%),
                            radial-gradient(circle at 80% 20%, var(--land-brass)12 0%, transparent 50%)`,
          opacity: 0.18,
        }}
      />

      <div className="relative max-w-6xl mx-auto px-6 pt-28 pb-24 w-full">
        <div ref={heroRef} className="grid lg:grid-cols-2 gap-12 xl:gap-20 items-start">

          {/* Left: Copy */}
          <div className="hero-content">
            {/* Eyebrow */}
            <div className="hero-eyebrow opacity-0 translate-y-4 transition-all duration-500 ease-out mb-8">
              <span style={{ color: "var(--land-forest)" }} className="text-xs font-semibold tracking-[0.2em] uppercase">
                Document Intelligence
              </span>
            </div>

            {/* Headline */}
            <h1 className="hero-headline opacity-0 translate-y-6 transition-all duration-700 ease-out delay-150 leading-[1.05] mb-6">
              <span
                style={{ color: "var(--land-ink)" }}
                className="block text-[clamp(2.5rem,5vw,4rem)] font-bold tracking-tight"
              >
                Read your documents.
              </span>
              <span
                style={{ color: "var(--land-forest)" }}
                className="block text-[clamp(2.5rem,5vw,4rem)] font-bold tracking-tight"
              >
                Understand what matters.
              </span>
            </h1>

            {/* Supporting copy */}
            <p
              style={{ color: "var(--land-ink-muted)" }}
              className="hero-body opacity-0 translate-y-4 transition-all duration-700 ease-out delay-300 text-lg leading-relaxed max-w-lg mb-10"
            >
              Citeline turns dense PDFs into clear answers, summaries, and comparisons grounded in the source.
            </p>

            {/* CTAs */}
            <div className="hero-ctas opacity-0 translate-y-4 transition-all duration-700 ease-out delay-500 flex flex-wrap gap-4 items-center">
              <Link
                href="/app"
                style={{ backgroundColor: "var(--land-ink)", color: "var(--land-bg)" }}
                className="inline-flex items-center gap-2 font-medium px-7 py-3.5 rounded-md hover:opacity-80 transition-opacity text-sm"
              >
                Open Citeline
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="2" y1="7" x2="12" y2="7" />
                  <polyline points="8,3 12,7 8,11" />
                </svg>
              </Link>
              <button
                onClick={scrollToHowItWorks}
                style={{ color: "var(--land-ink-muted)" }}
                className="text-sm hover:opacity-100 transition-opacity underline underline-offset-4"
              >
                How it works
              </button>
            </div>
          </div>

          {/* Right: Visual */}
          <div className="hero-visual opacity-0 translate-y-8 transition-all duration-1000 ease-out delay-700">
            {/* Image — in normal flow, wrapper clips with border-radius */}
            <div className="relative rounded-xl overflow-hidden shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/hero.png"
                alt="A warm research workspace with printed documents, a laptop, and a small brass lamp in natural daylight"
                className="w-full h-[420px] object-cover dark:opacity-75"
              />
            </div>

            {/* Floating product preview card — sits below the image */}
            <div
              style={{ backgroundColor: "var(--land-white)", borderColor: "var(--land-border)" }}
              className="relative -mt-8 ml-4 sm:ml-8 mr-8 border rounded-xl shadow-xl p-4 z-10"
            >
              <div style={{ borderColor: "var(--land-border)" }} className="flex items-center gap-2.5 mb-3 pb-3 border-b">
                <div style={{ backgroundColor: "var(--land-bg-stone)" }} className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0">
                  <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                    <rect x="1" y="1" width="10" height="12" rx="1" fill="var(--land-brass)" opacity="0.5" />
                    <line x1="3" y1="4.5" x2="9" y2="4.5" stroke="white" strokeWidth="0.9" />
                    <line x1="3" y1="7" x2="9" y2="7" stroke="white" strokeWidth="0.9" />
                    <line x1="3" y1="9.5" x2="7" y2="9.5" stroke="white" strokeWidth="0.9" />
                  </svg>
                </div>
                <span style={{ color: "var(--land-ink-muted)" }} className="text-xs font-medium truncate">annual_report_2025.pdf</span>
              </div>
              <div className="mb-3">
                <p style={{ color: "var(--land-ink-muted)", fontSize: "10px" }} className="uppercase tracking-wider mb-1">Question</p>
                <p style={{ color: "var(--land-ink)" }} className="text-xs font-semibold">What were the company&apos;s key priorities this year?</p>
              </div>
              <div style={{ backgroundColor: "var(--land-bg)" }} className="rounded-lg p-3 mb-3">
                <p style={{ color: "var(--land-ink)", opacity: 0.75 }} className="text-[11px] leading-relaxed">
                  Expansion into new markets, stronger operational efficiency, and continued investment in product development.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ backgroundColor: "var(--land-bg-stone)", color: "var(--land-ink-muted)", fontSize: "10px" }} className="px-2 py-0.5 rounded-full font-medium">Q&amp;A</span>
                <span style={{ color: "var(--land-forest)", fontSize: "10px" }} className="font-semibold">annual_report_2025.pdf, p. 12</span>
              </div>
            </div>
          </div>


        </div>
      </div>

      <style jsx>{`
        .hero-visible .hero-eyebrow,
        .hero-visible .hero-headline,
        .hero-visible .hero-body,
        .hero-visible .hero-ctas,
        .hero-visible .hero-visual {
          opacity: 1 !important;
          transform: translate(0, 0) !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-eyebrow, .hero-headline, .hero-body, .hero-ctas, .hero-visual {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </section>
  );
}
