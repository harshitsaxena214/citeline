"use client";

import { useEffect, useRef } from "react";

const capabilities = [
  {
    label: "ASK",
    heading: "Your documents, answered.",
    body: "Ask questions in plain language and get answers pulled directly from the relevant paragraphs of your PDF.",
  },
  {
    label: "SUMMARIZE",
    heading: "Dense pages, clear summaries.",
    body: "Turn long documents into concise, accurate summaries without losing what the source actually said.",
  },
  {
    label: "COMPARE",
    heading: "Side by side, precisely.",
    body: "Understand differences and similarities across two documents — Citeline retrieves from both simultaneously.",
  },
];

export function Capabilities() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    const items = ref.current?.querySelectorAll(".reveal-item");
    items?.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="why-citeline"
      style={{ backgroundColor: "var(--land-bg-dark)" }}
      className="py-32 px-6"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-20">
          <p style={{ color: "var(--land-forest)" }} className="text-xs font-semibold tracking-[0.2em] uppercase mb-4">
            Capabilities
          </p>
          <h2 className="text-4xl md:text-5xl font-bold leading-tight max-w-lg" style={{ color: "var(--land-ink)" }}>
            From dense pages to{" "}
            <span style={{ color: "var(--land-brass)" }}>clear answers.</span>
          </h2>
        </div>

        {/* Grid */}
        <div ref={ref} className="grid md:grid-cols-3 gap-px" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
          {capabilities.map((cap, i) => (
            <div
              key={cap.label}
              className="reveal-item opacity-0 translate-y-6 transition-all duration-700 ease-out p-10"
              style={{ backgroundColor: "var(--land-bg-dark)", transitionDelay: `${i * 120}ms` }}
            >
              <p style={{ color: "var(--land-forest)" }} className="text-xs font-bold tracking-[0.25em] mb-6">
                {cap.label}
              </p>
              <h3 style={{ color: "var(--land-ink)" }} className="text-xl font-semibold mb-4 leading-snug">
                {cap.heading}
              </h3>
              <p style={{ color: "var(--land-ink-muted)" }} className="text-sm leading-relaxed">
                {cap.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .revealed { opacity: 1 !important; transform: translate(0, 0) !important; }
        @media (prefers-reduced-motion: reduce) {
          .reveal-item { opacity: 1 !important; transform: none !important; transition: none !important; }
        }
      `}</style>
    </section>
  );
}
