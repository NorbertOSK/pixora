import { useState, useEffect } from "react";
import { FolderOpen, Globe, Sun, Moon, Heart } from "lucide-react";
import { getVersion } from "@tauri-apps/api/app";
import { useLangStore, useT } from "../lib/langStore";
import { useThemeStore } from "../lib/themeStore";
import { useImageStore } from "../lib/store";
import { cn } from "../lib/utils";
import logoUrl from "../assets/img/logo.png";
import { DonateModal } from "./DonateModal";

interface HeaderProps {
  onOpenFile: () => void;
}

export function Header({ onOpenFile }: HeaderProps) {
  const t = useT();
  const { lang, setLang } = useLangStore();
  const { dark, toggleTheme } = useThemeStore();
  const { isProcessing } = useImageStore();
  const [donateOpen, setDonateOpen] = useState(false);
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    getVersion().then((v) => setVersion(`v${v}`));
  }, []);

  return (
    <header className="shrink-0 z-20 border-b border-black/[0.06] dark:border-white/[0.06] backdrop-blur-xl bg-white/95 dark:bg-[#0c0b18]/90 shadow-sm dark:shadow-none">
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-blue-500 rounded-xl blur-md opacity-40" />
            <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center shadow-lg overflow-hidden">
              <img
                src={logoUrl}
                alt="Pixora"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
              pix<span className="text-violet-600 dark:text-violet-400 font-black">ora</span>
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-white/50 -mt-0.5">
              {t.header.subtitle} {version && <span className="opacity-70 ml-1">({version})</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.10] rounded-lg p-1 gap-0.5">
            <Globe size={11} className="text-slate-400 dark:text-white/40 mx-1.5 shrink-0" />
            <div className="w-px h-3 bg-black/10 dark:bg-white/10" />
            {(["es", "en", "pt"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={cn(
                  "text-[10px] font-semibold px-2.5 py-1 rounded-md transition-all uppercase tracking-wide",
                  lang === l
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-slate-500 dark:text-white/50 hover:text-slate-800 dark:hover:text-white/80 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                )}
              >
                {l}
              </button>
            ))}
            <div className="w-px h-3 bg-black/10 dark:bg-white/10 mx-0.5" />
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md transition-all text-slate-500 dark:text-white/50 hover:text-slate-800 dark:hover:text-white/80 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              title={dark ? "Light mode" : "Dark mode"}
            >
              {dark ? <Sun size={12} /> : <Moon size={12} />}
            </button>
          </div>

          <button
            onClick={() => setDonateOpen(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-pink-500 hover:from-amber-400 hover:to-pink-400 active:from-amber-600 active:to-pink-600 text-white text-xs font-bold px-3 py-2 rounded-lg transition-all shadow-md shadow-amber-500/30"
            title={t.donate.buttonTitle}
          >
            <Heart size={12} fill="currentColor" />
            <span>{t.donate.buttonLabel}</span>
          </button>

          <button
            onClick={onOpenFile}
            disabled={isProcessing}
            className={cn(
              "flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm",
              isProcessing
                ? "bg-violet-600/40 text-white/50 cursor-not-allowed shadow-none"
                : "bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white shadow-violet-900/20"
            )}
          >
            <FolderOpen size={13} />
            {t.header.openImages}
          </button>
        </div>
      </div>

      <DonateModal open={donateOpen} onClose={() => setDonateOpen(false)} />
    </header>
  );
}
