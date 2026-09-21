"use client";

import Link from "next/link";

export function FinalCta() {
  return (
    <section style={{ backgroundColor: "var(--land-bg)" }} className="py-40 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <p style={{ color: "var(--land-forest)" }} className="text-xs font-semibold tracking-[0.2em] uppercase mb-6">
          Get Started
        </p>
        <h2 style={{ color: "var(--land-ink)" }} className="text-5xl md:text-6xl font-bold leading-tight mb-6">
          Bring clarity to your next PDF.
        </h2>
        <p style={{ color: "var(--land-ink-muted)" }} className="text-lg leading-relaxed mb-12">
          Upload a document and start asking questions.
        </p>
        <Link
          href="/app"
          style={{ backgroundColor: "var(--land-ink)", color: "var(--land-bg)" }}
          className="inline-flex items-center gap-3 font-semibold px-10 py-4 rounded-md hover:opacity-80 transition-opacity text-base"
        >
          Open Citeline
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="2" y1="8" x2="14" y2="8" />
            <polyline points="9,3 14,8 9,13" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
