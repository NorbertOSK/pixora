import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ThemeStore {
  dark: boolean;
  toggleTheme: () => void;
}

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
}

const systemDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

try {
  const stored = localStorage.getItem("editimg-theme");
  const dark = stored ? (JSON.parse(stored).state?.dark ?? systemDark()) : systemDark();
  applyTheme(dark);
} catch {
  applyTheme(systemDark());
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      dark: systemDark(),
      toggleTheme: () => {
        const next = !get().dark;
        applyTheme(next);
        set({ dark: next });
      },
    }),
    { name: "editimg-theme" }
  )
);
