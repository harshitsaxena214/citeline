"use client";

import { useEffect, useRef } from "react";

const steps = [
  { number: "01", title: "Upload", body: "Upload a PDF and Citeline chunks and indexes it for precise retrieval." },
  { number: "02", title: "Ask", body: "Ask a question in natural language — or request a summary or comparison." },
  { number: "03", title: "Retrieve", body: "Relevant passages from your document are retrieved based on semantic similarity." },
  { number: "04", title: "Verify", body: "The answer is grounded in retrieved context and returned with page-level citations." },
];

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) { entry.target.classList.add("revealed"); observer.unobserve(entry.target); }
        });
      },
      { threshold: 0.1 }
    );
    ref.current?.querySelectorAll(".reveal-step").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="how-it-works"
      style={{ backgroundColor: "var(--land-bg)", borderColor: "var(--land-border)" }}
      className="py-32 px-6"
    >
      <div className="max-w-6xl mx-auto">
        <div className="mb-20">
          <p style={{ color: "var(--land-forest)" }} className="text-xs font-semibold tracking-[0.2em] uppercase mb-4">
            Process
          </p>
          <h2 style={{ color: "var(--land-ink)" }} className="text-4xl md:text-5xl font-bold leading-tight max-w-md">
            Four steps. Clear results.
          </h2>
        </div>

        <div ref={ref} className="relative">
          {/* Vertical connector line (desktop) */}
          <div
            className="hidden md:block absolute left-[3.75rem] top-0 bottom-0 w-px"
            style={{ backgroundColor: "var(--land-border)" }}
          />

          <div className="space-y-0">
            {steps.map((step, i) => (
              <div
                key={step.number}
                className="reveal-step opacity-0 translate-y-6 transition-all duration-700 ease-out relative md:pl-36 pb-16 last:pb-0"
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                {/* Number circle */}
                <div className="md:absolute md:left-0 md:top-0 flex items-center gap-6 mb-4 md:mb-0">
                  <div
                    className="w-[3.75rem] h-[3.75rem] rounded-full border flex items-center justify-center flex-shrink-0 relative z-10"
                    style={{ borderColor: "var(--land-border)", backgroundColor: "var(--land-bg)" }}
                  >
                    <span style={{ color: "var(--land-forest)" }} className="text-xs font-bold tracking-widest">{step.number}</span>
                  </div>
                  <div className="md:hidden">
                    <h3 style={{ color: "var(--land-ink)" }} className="text-2xl font-bold">{step.title}</h3>
                  </div>
                </div>

                <div className="hidden md:block mb-2">
                  <h3 style={{ color: "var(--land-ink)" }} className="text-2xl font-bold">{step.title}</h3>
                </div>
                <p style={{ color: "var(--land-ink-muted)" }} className="leading-relaxed max-w-md">{step.body}</p>

                {/* Mobile connector */}
                {i < steps.length - 1 && (
                  <div
                    className="md:hidden absolute left-[1.875rem] top-[3.75rem] w-px h-16"
                    style={{ backgroundColor: "var(--land-border)" }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .revealed { opacity: 1 !important; transform: translate(0,0) !important; }
        @media (prefers-reduced-motion: reduce) {
          .reveal-step { opacity: 1 !important; transform: none !important; transition: none !important; }
        }
      `}</style>
    </section>
  );
}
