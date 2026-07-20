import { create } from "zustand";

export type Theme = "light" | "dark" | "midnight";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
}

const THEME_ORDER: Theme[] = ["light", "dark", "midnight"];

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: (localStorage.getItem("hearmd-theme") as Theme) || "dark",

  setTheme: (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("hearmd-theme", theme);
    set({ theme });
  },

  cycleTheme: () => {
    const current = get().theme;
    const idx = THEME_ORDER.indexOf(current);
    const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    get().setTheme(next);
  },
}));

// Apply saved theme on load
const saved = (localStorage.getItem("hearmd-theme") as Theme) || "dark";
document.documentElement.setAttribute("data-theme", saved);
