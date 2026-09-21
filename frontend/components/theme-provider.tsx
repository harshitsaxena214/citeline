"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyTheme(t: Theme) {
  const root = document.documentElement;
  if (t === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
  }
}

function resolveInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem("citeline-theme");
    if (stored === "dark" || stored === "light") return stored;
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  } catch {}
  return "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start with "light" to match SSR; correct on mount
  const [theme, setTheme] = useState<Theme>("light");
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const resolved = resolveInitialTheme();
    applyTheme(resolved);
    // Defer the React state update to after the DOM class is already applied
    // so it never causes a cascading render on first paint
    setTheme(resolved);
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "light" ? "dark" : "light";
      applyTheme(next);
      try { localStorage.setItem("citeline-theme", next); } catch {}
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
