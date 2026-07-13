import { memo } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Rocket, X } from "lucide-react";
import { useT } from "../lib/langStore";

interface UpdateAvailableModalProps {
  open: boolean;
  currentVersion: string;
  latestVersion: string;
  onClose: () => void;
  onViewRelease: () => void;
}

export const UpdateAvailableModal = memo(function UpdateAvailableModal({
  open,
  currentVersion,
  latestVersion,
  onClose,
  onViewRelease,
}: UpdateAvailableModalProps) {
  const t = useT();

  if (!open) return null;

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-12">
      <div
        className="absolute inset-0 bg-obsidian-950/60 backdrop-blur-xl animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-obsidian-900 rounded-px shadow-lensed border border-black/[0.08] dark:border-white/[0.08] overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.06] bg-slate-50/50 dark:bg-obsidian-950/30">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-px bg-prism-500 flex items-center justify-center shadow-satin shrink-0 border border-white/10">
              <Rocket size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">
                {t.updateNotice.title}
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-obsidian-500 font-bold uppercase tracking-widest mt-0.5">
                {t.updateNotice.subtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label={t.updateNotice.close}
            className="p-2 rounded-px text-slate-400 dark:text-obsidian-600 hover:text-slate-900 dark:hover:text-obsidian-100 hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-all"
          >
            <X size={16} strokeWidth={3} />
          </button>
        </div>

        <div className="px-6 py-6 space-y-4 bg-white dark:bg-obsidian-950/10">
          <p className="text-sm text-slate-700 dark:text-obsidian-300 leading-relaxed font-medium">
            {t.updateNotice.message}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-px border border-black/[0.06] dark:border-white/[0.06] bg-slate-50 dark:bg-obsidian-800/70 p-3">
              <p className="text-[9px] uppercase tracking-[0.15em] font-black text-slate-500 dark:text-obsidian-500">
                {t.updateNotice.currentVersion}
              </p>
              <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">v{currentVersion}</p>
            </div>
            <div className="rounded-px border border-prism-500/30 bg-prism-500/10 p-3">
              <p className="text-[9px] uppercase tracking-[0.15em] font-black text-prism-600 dark:text-prism-300">
                {t.updateNotice.newVersion}
              </p>
              <p className="mt-1 text-sm font-black text-prism-700 dark:text-prism-200">v{latestVersion}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-black/[0.06] dark:border-white/[0.06] bg-slate-50/50 dark:bg-obsidian-950/40">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-px border border-black/[0.08] dark:border-white/[0.08] text-slate-600 dark:text-obsidian-300 hover:text-slate-900 dark:hover:text-obsidian-100 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-all"
          >
            {t.updateNotice.later}
          </button>

          <button
            onClick={onViewRelease}
            className="flex items-center gap-2 px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-px bg-prism-500 hover:bg-prism-400 active:bg-prism-600 text-white border border-prism-400/20 transition-all shadow-satin"
          >
            <ExternalLink size={12} strokeWidth={3} />
            {t.updateNotice.viewRelease}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
});
