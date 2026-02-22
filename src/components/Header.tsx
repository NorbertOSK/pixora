import { useState, useEffect } from "react";
import { FolderOpen, Globe, Sun, Moon, Heart } from "lucide-react";
import { getVersion } from "@tauri-apps/api/app";
import { useLangStore, useT } from "../lib/langStore";
import { useThemeStore } from "../lib/themeStore";
import { useImageStore } from "../lib/store";
import { cn } from "../lib/utils";
import logoUrl from "../assets/img/logo.png";
import { DonateModal } from "./DonateModal";

import { Share2 } from "lucide-react";
import { Tooltip } from "./ui/Tooltip";

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
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    getVersion().then((v) => setVersion(`v${v}`));
  }, []);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t.share.title,
          text: t.share.text,
          url: t.share.url,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      await navigator.clipboard.writeText(t.share.url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  return (
    <header className="shrink-0 z-20 border-b border-black/[0.06] dark:border-white/[0.06] backdrop-blur-2xl bg-white/80 dark:bg-obsidian-950/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between px-6 py-2.5">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-prism-500 rounded-px blur-lg opacity-15 group-hover:opacity-30 transition-opacity" />
            <div className="relative h-9 w-9 rounded-px bg-slate-900 dark:bg-obsidian-950 flex items-center justify-center border border-white/10 dark:border-white/10 shadow-lg overflow-hidden">
              <img
                src={logoUrl}
                alt="Pixora"
                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110"
              />
            </div>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-baseline">
              pix<span className="text-prism-500 font-extrabold uppercase text-[10px] tracking-[0.2em] ml-1 mt-0.5">ora</span>
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-obsidian-400 font-medium -mt-0.5">
              {t.header.subtitle} {version && <span className="opacity-50 ml-1">({version})</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] rounded-px p-1 gap-1">
            {(["es", "en", "pt"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={cn(
                  "text-[10px] font-bold px-3 py-1 rounded-px transition-all uppercase tracking-widest",
                  lang === l
                    ? "bg-white dark:bg-obsidian-800 text-prism-600 dark:text-prism-400 shadow-satin border border-black/[0.05] dark:border-white/[0.05]"
                    : "text-slate-400 dark:text-obsidian-500 hover:text-slate-600 dark:hover:text-obsidian-300"
                )}
              >
                {l}
              </button>
            ))}
            <div className="w-px h-3 bg-black/10 dark:bg-white/10 mx-0.5" />
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-px transition-all text-slate-400 dark:text-obsidian-500 hover:text-slate-600 dark:hover:text-obsidian-300 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
              title={dark ? "Light mode" : "Dark mode"}
            >
              {dark ? <Sun size={12} strokeWidth={2.5} /> : <Moon size={12} strokeWidth={2.5} />}
            </button>
          </div>

          <Tooltip
            content={t.share.copied}
            show={shareCopied}
            onHide={() => setShareCopied(false)}
          >
            <button
              onClick={handleShare}
              className="flex items-center justify-center bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.06] dark:hover:bg-white/[0.06] text-slate-600 dark:text-obsidian-400 p-2 rounded-px border border-black/[0.08] dark:border-white/[0.08] transition-all shadow-satin"
              title={t.share.button}
            >
              <Share2 size={12} strokeWidth={2.5} />
            </button>
          </Tooltip>

          <button
            onClick={() => setDonateOpen(true)}
            className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold px-3 py-2 rounded-px border border-rose-500/20 transition-all uppercase tracking-wider"
          >
            <Heart size={10} fill="currentColor" />
            <span>{t.donate.buttonLabel}</span>
          </button>

          <button
            onClick={onOpenFile}
            disabled={isProcessing}
            className={cn(
              "flex items-center gap-2 text-[11px] font-bold px-5 py-2 rounded-px transition-all shadow-satin uppercase tracking-wider",
              isProcessing
                ? "bg-prism-500/20 text-prism-500/40 cursor-not-allowed border border-prism-500/20"
                : "bg-prism-500 hover:bg-prism-400 active:bg-prism-600 text-white border border-prism-400/20"
            )}
          >
            <FolderOpen size={12} strokeWidth={2.5} />
            {t.header.openImages}
          </button>
        </div>
      </div>

      <DonateModal open={donateOpen} onClose={() => setDonateOpen(false)} />
    </header>
  );
}

