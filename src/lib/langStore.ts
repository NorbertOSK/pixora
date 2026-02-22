import { create } from "zustand";
import { persist } from "zustand/middleware";
import { translations, type Lang } from "./i18n";

interface LangStore {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

function detectLang(): Lang {
  const nav = (navigator.language ?? navigator.languages?.[0] ?? "").toLowerCase();
  if (nav.startsWith("es")) return "es";
  if (nav.startsWith("pt")) return "pt";
  return "en";
}

export const useLangStore = create<LangStore>()(
  persist(
    (set) => ({
      lang: detectLang(),
      setLang: (lang) => set({ lang }),
    }),
    { name: "editimg-lang" }
  )
);

export function useT() {
  const lang = useLangStore((s) => s.lang);
  return translations[lang];
}
