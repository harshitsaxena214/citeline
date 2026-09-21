"use client";

import { useEffect, useRef } from "react";
import { MessageSquareText, FileText, Columns2 } from "lucide-react";

const capabilities = [
  {
    icon: MessageSquareText,
    label: "ASK",
    heading: "Your documents, answered.",
    body: "Ask questions in plain language and get answers pulled directly from the relevant paragraphs of your PDF.",
  },
  {
    icon: FileText,
    label: "SUMMARIZE",
    heading: "Dense pages, distilled.",
    body: "Turn long documents into concise, accurate summaries without losing what the source actually said.",
  },
  {
    icon: Columns2,
    label: "COMPARE",
    heading: "Side by side, precisely.",
    body: "Understand differences and similarities across two documents — Citeline retrieves from both simultaneously.",
  },
];

export function Capabilities() {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("cap-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    listRef.current?.querySelectorAll(".cap-item").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="why-citeline"
      aria-labelledby="capabilities-heading"
      style={{ backgroundColor: "var(--land-bg-dark)" }}
      className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="mb-16">
          <p
            id="capabilities-heading"
            style={{ color: "var(--land-forest)" }}
            className="text-xs font-semibold tracking-[0.2em] uppercase mb-4"
          >
            Capabilities
          </p>
          <h2
            className="text-4xl md:text-5xl font-bold leading-tight max-w-lg"
            style={{ color: "var(--land-ink)" }}
          >
            From dense pages to{" "}
            <span style={{ color: "var(--land-brass)" }}>clear answers.</span>
          </h2>
        </div>

        {/* Cards grid */}
        <ul
          ref={listRef}
          role="list"
          className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6"
        >
          {capabilities.map((cap, i) => {
            const Icon = cap.icon;
            return (
              <li
                key={cap.label}
                className="cap-item opacity-0 translate-y-6 transition-all duration-700 ease-out"
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                <div
                  className="capability-card h-full rounded-xl border p-8 flex flex-col gap-5 transition-all duration-200"
                  style={{
                    borderColor: "rgba(255,255,255,0.08)",
                    backgroundColor: "rgba(255,255,255,0.02)",
                  }}
                  tabIndex={0}
                >
                  {/* Icon + label row */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: "rgba(63,104,77,0.25)" }}
                    >
                      <Icon
                        aria-hidden="true"
                        className="w-4 h-4"
                        style={{ color: "var(--land-forest)" }}
                      />
                    </div>
                    <p
                      className="text-xs font-semibold uppercase tracking-[0.2em]"
                      style={{ color: "var(--land-forest)" }}
                    >
                      {cap.label}
                    </p>
                  </div>

                  {/* Title */}
                  <h3
                    className="text-xl font-semibold leading-snug"
                    style={{ color: "var(--land-ink)", textWrap: "balance" } as React.CSSProperties}
                  >
                    {cap.heading}
                  </h3>

                  {/* Body */}
                  <p
                    className="text-sm sm:text-base leading-relaxed"
                    style={{ color: "rgba(229,225,216,0.72)" }}
                  >
                    {cap.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <style jsx>{`
        .cap-revealed {
          opacity: 1 !important;
          transform: translate(0, 0) !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .cap-item {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }
        }
        .capability-card:hover,
        .capability-card:focus-within {
          border-color: rgba(90, 140, 104, 0.4) !important;
          background-color: rgba(255, 255, 255, 0.05) !important;
          transform: translateY(-2px);
          outline: none;
        }
        .capability-card:focus {
          outline: 2px solid rgba(90, 140, 104, 0.6);
          outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .capability-card:hover,
          .capability-card:focus-within {
            transform: none;
          }
        }
      `}</style>
    </section>
  );
}
