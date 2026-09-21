"use client";

export function ProductShowcase() {
  return (
    <section style={{ backgroundColor: "var(--land-bg-stone)" }} className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p style={{ color: "var(--land-forest)" }} className="text-xs font-semibold tracking-[0.2em] uppercase mb-4">
            The Product
          </p>
          <h2 style={{ color: "var(--land-ink)" }} className="text-4xl md:text-5xl font-bold leading-tight mb-4">
            The answer comes with the source.
          </h2>
          <p style={{ color: "var(--land-ink-muted)" }} className="max-w-xl mx-auto leading-relaxed">
            Citeline keeps answers connected to the documents they came from, so you can trace every answer back to the page.
          </p>
        </div>

        {/* Product mock */}
        <div
          className="max-w-4xl mx-auto rounded-2xl shadow-2xl overflow-hidden border"
          style={{ backgroundColor: "var(--land-white)", borderColor: "var(--land-border)" }}
        >
          {/* Chrome header */}
          <div
            className="flex items-center justify-between px-5 py-3.5 border-b"
            style={{ backgroundColor: "var(--land-bg)", borderColor: "var(--land-border)" }}
          >
            <div className="flex items-center gap-1.5">
              {["bg-red-300", "bg-yellow-300", "bg-green-300"].map((c) => (
                <div key={c} className={`w-3 h-3 rounded-full ${c} opacity-60`} />
              ))}
            </div>
            <span style={{ color: "var(--land-ink-muted)", fontSize: "12px" }} className="font-medium">Citeline</span>
            <div className="w-16" />
          </div>

          <div className="flex h-[480px]">
            {/* Sidebar */}
            <aside
              className="w-64 flex-shrink-0 border-r p-4 flex flex-col"
              style={{ backgroundColor: "var(--land-bg)", borderColor: "var(--land-border)" }}
            >
              <h3 style={{ color: "var(--land-ink-muted)", fontSize: "11px" }} className="font-semibold uppercase tracking-wider mb-3">
                Documents
              </h3>

              {[
                { name: "harshit_devops.pdf", pages: "4 pages", selected: true },
                { name: "q3_report_2024.pdf", pages: "12 pages", selected: false },
              ].map((doc) => (
                <div
                  key={doc.name}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg mb-1.5 border"
                  style={{
                    backgroundColor: doc.selected ? `color-mix(in srgb, var(--land-forest) 10%, transparent)` : "transparent",
                    borderColor: doc.selected ? `color-mix(in srgb, var(--land-forest) 20%, transparent)` : "transparent",
                  }}
                >
                  <div
                    className="w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center"
                    style={{
                      backgroundColor: doc.selected ? "var(--land-forest)" : "transparent",
                      borderColor: doc.selected ? "var(--land-forest)" : "var(--land-border)",
                    }}
                  >
                    {doc.selected && (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <polyline points="1.5,4 3,5.5 6.5,2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p style={{ color: "var(--land-ink)" }} className="text-xs font-medium truncate">{doc.name}</p>
                    <p style={{ color: "var(--land-ink-muted)", fontSize: "10px" }}>{doc.pages}</p>
                  </div>
                </div>
              ))}

              <div className="mt-auto pt-4 border-t" style={{ borderColor: "var(--land-border)" }}>
                <div className="flex items-center justify-center gap-1.5 w-full py-2 border border-dashed rounded-lg" style={{ borderColor: "var(--land-border)" }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--land-ink)" strokeWidth="1.5" opacity="0.3">
                    <line x1="6" y1="1" x2="6" y2="11" />
                    <line x1="1" y1="6" x2="11" y2="6" />
                  </svg>
                  <span style={{ color: "var(--land-ink-muted)", fontSize: "10px" }} className="font-medium">Upload Document</span>
                </div>
              </div>
            </aside>

            {/* Chat */}
            <main className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 overflow-hidden p-5 space-y-4">
                {/* User bubble */}
                <div className="flex justify-end">
                  <div
                    className="text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-xs"
                    style={{ backgroundColor: "var(--land-ink)", color: "var(--land-bg)" }}
                  >
                    What are the main technical skills listed?
                  </div>
                </div>

                {/* Assistant bubble */}
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-tl-sm max-w-sm p-4" style={{ backgroundColor: "var(--land-bg)" }}>
                    <p style={{ color: "var(--land-ink)" }} className="text-sm leading-relaxed mb-3">
                      The document lists the following technical skill areas:
                    </p>
                    <ul className="text-sm space-y-1 mb-3">
                      {["Cloud & IaC: AWS, Terraform, Ansible", "Containers & Orchestration: Docker, Kubernetes", "CI/CD & DevOps: GitHub Actions, Jenkins"].map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span style={{ color: "var(--land-forest)" }} className="mt-0.5">—</span>
                          <span style={{ color: "var(--land-ink-muted)" }}>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center gap-2 pt-3 border-t" style={{ borderColor: "var(--land-border)" }}>
                      <span style={{ backgroundColor: "var(--land-bg-stone)", color: "var(--land-ink-muted)", fontSize: "10px" }} className="px-2 py-0.5 rounded-full">Q&amp;A</span>
                      <span style={{ color: "var(--land-forest)", fontSize: "10px" }} className="font-medium">harshit_devops.pdf, p. 1</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Composer */}
              <div className="flex-shrink-0 p-4 border-t" style={{ borderColor: "var(--land-border)" }}>
                <div className="flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ backgroundColor: "var(--land-bg)" }}>
                  <span style={{ color: "var(--land-ink-muted)", fontSize: "12px" }} className="flex-1">Ask a question about the selected documents...</span>
                  <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 opacity-40" style={{ backgroundColor: "var(--land-forest)" }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="1.5">
                      <line x1="2" y1="6" x2="10" y2="6" />
                      <polyline points="7,3 10,6 7,9" />
                    </svg>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </section>
  );
}
