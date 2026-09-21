"use client";

import Link from "next/link";

export function Footer() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer
      className="border-t px-6 py-12"
      style={{ backgroundColor: "var(--land-bg-dark)", borderColor: "var(--land-border)" }}
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div>
          <p style={{ color: "var(--land-ink)" }} className="font-semibold text-lg mb-1">Citeline</p>
          <p style={{ color: "var(--land-ink-muted)" }} className="text-sm">Document intelligence, grounded in your sources.</p>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <Link href="/app" style={{ color: "var(--land-ink-muted)" }} className="text-sm hover:opacity-100 transition-opacity">
            Open Citeline
          </Link>
          <button
            onClick={() => scrollTo("how-it-works")}
            style={{ color: "var(--land-ink-muted)" }}
            className="text-sm hover:opacity-100 transition-opacity"
          >
            How it works
          </button>
        </div>
      </div>
    </footer>
  );
}
