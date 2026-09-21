"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/landing/theme-toggle";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header
      style={{
        backgroundColor: scrolled ? "var(--land-bg)" : "transparent",
        borderColor: "var(--land-border)",
      }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "backdrop-blur-sm border-b shadow-sm" : ""
      }`}
    >
      <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          style={{ color: "var(--land-ink)" }}
          className="font-semibold text-lg tracking-tight hover:opacity-60 transition-opacity"
        >
          Citeline
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8">
          <button
            onClick={() => scrollTo("how-it-works")}
            style={{ color: "var(--land-ink-muted)" }}
            className="text-sm hover:opacity-100 transition-opacity"
          >
            How it works
          </button>
          <button
            onClick={() => scrollTo("why-citeline")}
            style={{ color: "var(--land-ink-muted)" }}
            className="text-sm hover:opacity-100 transition-opacity"
          >
            Why Citeline
          </button>
        </div>

        {/* Desktop right */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/app"
            style={{ backgroundColor: "var(--land-forest)", color: "#fff" }}
            className="text-sm font-medium px-5 py-2 rounded-md hover:opacity-90 transition-opacity"
          >
            Open Citeline
          </Link>
        </div>

        {/* Mobile */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <Link
            href="/app"
            style={{ backgroundColor: "var(--land-forest)", color: "#fff" }}
            className="text-sm font-medium px-4 py-1.5 rounded-md hover:opacity-90 transition-opacity"
          >
            Open
          </Link>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            style={{ color: "var(--land-ink-muted)" }}
            className="p-1.5 hover:opacity-100 transition-opacity"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              {menuOpen ? (
                <>
                  <line x1="4" y1="4" x2="16" y2="16" />
                  <line x1="16" y1="4" x2="4" y2="16" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="17" y2="6" />
                  <line x1="3" y1="10" x2="17" y2="10" />
                  <line x1="3" y1="14" x2="17" y2="14" />
                </>
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          style={{ backgroundColor: "var(--land-bg)", borderColor: "var(--land-border)" }}
          className="md:hidden border-b px-6 pb-4 space-y-1"
        >
          <button
            onClick={() => scrollTo("how-it-works")}
            style={{ color: "var(--land-ink-muted)" }}
            className="block w-full text-left text-sm py-2.5 hover:opacity-100 transition-opacity"
          >
            How it works
          </button>
          <button
            onClick={() => scrollTo("why-citeline")}
            style={{ color: "var(--land-ink-muted)" }}
            className="block w-full text-left text-sm py-2.5 hover:opacity-100 transition-opacity"
          >
            Why Citeline
          </button>
        </div>
      )}
    </header>
  );
}
