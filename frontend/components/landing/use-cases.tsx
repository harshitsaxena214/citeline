"use client";

const useCases = [
  { category: "Research", body: "Find relevant information inside long academic papers and reports without reading everything cover to cover." },
  { category: "Technical documentation", body: "Ask questions across specifications, API docs, and technical manuals and get direct answers with references." },
  { category: "Reports", body: "Summarize dense quarterly or annual reports without losing the source context behind the numbers." },
  { category: "Multiple documents", body: "Compare information across two related documents — Citeline retrieves from both simultaneously." },
];

export function UseCases() {
  return (
    <section
      style={{ backgroundColor: "var(--land-bg)", borderTopColor: "var(--land-border)" }}
      className="py-32 px-6 border-t"
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-16 items-start">
          <div className="lg:sticky lg:top-24">
            <p style={{ color: "var(--land-forest)" }} className="text-xs font-semibold tracking-[0.2em] uppercase mb-4">
              Use Cases
            </p>
            <h2 style={{ color: "var(--land-ink)" }} className="text-4xl font-bold leading-tight">
              Built for documents that deserve attention.
            </h2>
          </div>

          <div style={{ borderColor: "var(--land-border)" }} className="space-y-0 divide-y">
            {useCases.map((uc) => (
              <div key={uc.category} className="py-8 group">
                <div className="flex items-start gap-4">
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-2.5 flex-shrink-0 group-hover:scale-150 transition-transform duration-200"
                    style={{ backgroundColor: "var(--land-forest)" }}
                  />
                  <div>
                    <h3 style={{ color: "var(--land-ink)" }} className="text-lg font-semibold mb-2">{uc.category}</h3>
                    <p style={{ color: "var(--land-ink-muted)" }} className="leading-relaxed">{uc.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
