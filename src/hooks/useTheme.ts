import { useEffect, useState } from "react";
import { themes, Theme } from "../lib/themes";

const THEME_LOCAL_STORAGE_KEY = "opptrack_theme";

export type ThemeLevel = keyof typeof themes;

export function useTheme() {
  const [themeName, setThemeName] = useState<ThemeLevel>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(THEME_LOCAL_STORAGE_KEY) as ThemeLevel | null;
      if (saved && themes[saved]) return saved;
    }
    return "intermediate";
  });
  const theme = themes[themeName];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(THEME_LOCAL_STORAGE_KEY) as ThemeLevel | null;
    if (saved && themes[saved]) setThemeName(saved);
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_LOCAL_STORAGE_KEY && e.newValue && themes[e.newValue as ThemeLevel]) {
        setThemeName(e.newValue as ThemeLevel);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_LOCAL_STORAGE_KEY, themeName);
    }
  }, [themeName]);

  return { themeName, setThemeName, theme };
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  // Custom theme variables used in globals.css
  root.style.setProperty("--bg-background", theme.colors.background);
  root.style.setProperty("--text-primary", theme.colors.text);
  root.style.setProperty("--color-primary", theme.colors.primary);
  root.style.setProperty("--color-secondary", theme.colors.secondary);
  root.style.setProperty("--color-accent", theme.colors.accent);
  root.style.setProperty("--bg-surface", theme.colors.surface);
  root.style.setProperty("--border-color", theme.colors.border);
  root.style.setProperty("--border-radius", `${theme.borderRadius}px`);

  // Map to Tailwind design tokens so components also shift
  root.style.setProperty("--background", theme.colors.background);
  root.style.setProperty("--foreground", theme.colors.text);
  root.style.setProperty("--card", theme.colors.surface);
  root.style.setProperty("--card-foreground", theme.colors.text);
  root.style.setProperty("--primary", theme.colors.primary);
  root.style.setProperty("--primary-foreground", "#ffffff");
  root.style.setProperty("--secondary", theme.colors.secondary);
  root.style.setProperty("--secondary-foreground", theme.colors.text);
  root.style.setProperty("--border", theme.colors.border);
}

