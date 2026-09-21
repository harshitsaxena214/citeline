"use client";

export function Grounding() {
  const chain = [
    { label: "ANSWER", opacity: 1.0 },
    { label: "SOURCE", opacity: 0.7 },
    { label: "DOCUMENT", opacity: 0.45 },
    { label: "PAGE", opacity: 0.25 },
  ];

  return (
    <section style={{ backgroundColor: "var(--land-bg-dark)" }} className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Copy */}
          <div>
            <p style={{ color: "var(--land-forest)" }} className="text-xs font-semibold tracking-[0.2em] uppercase mb-4">
              Grounding
            </p>
            <h2 style={{ color: "var(--land-ink)" }} className="text-4xl md:text-5xl font-bold leading-tight mb-6">
              Answers should be{" "}
              <span style={{ color: "var(--land-brass)" }}>traceable.</span>
            </h2>
            <p style={{ color: "var(--land-ink-muted)" }} className="leading-relaxed max-w-md mb-4">
              Citeline connects every answer to the retrieved passages it came from. Citations point back to the document and page number, so you can read the source yourself.
            </p>
            <p style={{ color: "var(--land-ink-muted)", opacity: 0.5 }} className="text-sm leading-relaxed max-w-md">
              Citeline does not claim perfect accuracy. Always verify critical information against the original source.
            </p>
          </div>

          {/* Visual chain */}
          <div className="flex flex-col items-center">
            <div className="w-full max-w-xs space-y-0">
              {chain.map((item, i) => (
                <div key={item.label} className="flex flex-col items-center">
                  <div
                    className="w-full rounded-lg px-8 py-4 text-center"
                    style={{ backgroundColor: `color-mix(in srgb, var(--land-forest) ${Math.round(item.opacity * 100)}%, var(--land-bg-dark))` }}
                  >
                    <span
                      className="text-sm font-bold tracking-[0.2em]"
                      style={{ color: item.opacity > 0.5 ? "var(--land-bg)" : "var(--land-ink-muted)" }}
                    >
                      {item.label}
                    </span>
                  </div>
                  {i < chain.length - 1 && (
                    <div className="flex flex-col items-center py-1">
                      <div className="w-px h-3" style={{ backgroundColor: "var(--land-border)" }} />
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                        <path d="M1 1L5 5L9 1" stroke="var(--land-border)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
