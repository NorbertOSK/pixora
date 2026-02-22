import { memo, useState } from "react";
import { X, FileSearch, CheckCircle2, AlertCircle, Loader2, Clock } from "lucide-react";
import { useImageStore, type ImageItem } from "../lib/store";
import { useT } from "../lib/langStore";
import { SplitView } from "./SplitView";
import { ExifModal } from "./ExifModal";
import { cn } from "../lib/utils";

interface ImageCardProps {
  image: ImageItem;
  isSelected: boolean;
}

export const ImageCard = memo(function ImageCard({ image, isSelected }: ImageCardProps) {
  const t = useT();
  const { toggleSelect, removeImage } = useImageStore();
  const [showExif, setShowExif] = useState(false);

  const footerIcon = {
    idle: null,
    pending: <Clock size={11} className="text-slate-400 dark:text-obsidian-600" />,
    processing: <Loader2 size={11} className="animate-spin text-prism-500" strokeWidth={3} />,
    done: <CheckCircle2 size={11} className="text-emerald-500" strokeWidth={3} />,
    error: <AlertCircle size={11} className="text-rose-500" strokeWidth={3} />,
  }[image.status];

  return (
    <>
      <div
        onClick={() => toggleSelect(image.id)}
        className={cn(
          "group relative flex flex-col rounded-px border transition-all duration-300 cursor-pointer overflow-hidden",
          isSelected
            ? "border-prism-500 bg-white dark:bg-obsidian-900 shadow-satin ring-1 ring-prism-500/20"
            : "border-black/[0.06] dark:border-white/[0.06] bg-slate-50/50 dark:bg-obsidian-950/20 hover:border-prism-500/50 hover:bg-white dark:hover:bg-obsidian-900/40"
        )}
      >
        <div
          className={cn(
            "absolute top-2.5 left-2.5 z-20 w-4 h-4 rounded-sm border transition-all duration-300 flex items-center justify-center",
            isSelected
              ? "bg-prism-500 border-prism-400 shadow-satin"
              : "bg-black/10 dark:bg-black/40 border-white/20 opacity-0 group-hover:opacity-100"
          )}
        >
          {isSelected && (
            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </div>

        <button
          className="absolute top-2.5 right-2.5 z-20 w-5 h-5 rounded-px bg-black/40 dark:bg-obsidian-950/60 backdrop-blur-md border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-600/80 active:scale-90"
          onClick={(e) => { e.stopPropagation(); removeImage(image.id); }}
        >
          <X size={10} className="text-white" strokeWidth={3} />
        </button>

        <div className="aspect-square bg-slate-200/30 dark:bg-obsidian-950/60 relative overflow-hidden">
          {/* Subtle Chromatic Aberration Border Effect */}
          <div className="absolute inset-0 border border-cyan-500/10 mix-blend-screen pointer-events-none" />
          <div className="absolute inset-[1px] border border-rose-500/5 mix-blend-screen pointer-events-none" />

          <SplitView
            original={image.originalDataUrl}
            processed={image.processedDataUrl}
            className="w-full h-full"
          />

          {image.status === "pending" && (
            <div className="absolute inset-0 bg-obsidian-950/40 backdrop-blur-[1px] flex items-center justify-center z-10 pointer-events-none">
              <span className="text-[9px] font-black text-white/90 bg-obsidian-950/80 px-2.5 py-1 rounded-px border border-white/10 tracking-[0.1em] uppercase">
                {t.card.pending}
              </span>
            </div>
          )}

          {image.status === "processing" && (
            <div className="absolute inset-0 bg-prism-500/10 backdrop-blur-md flex flex-col items-center justify-center gap-3 z-10 pointer-events-none">
              <div className="relative">
                <div className="absolute inset-0 bg-prism-500 blur-xl opacity-40 animate-pulse" />
                <Loader2 size={24} className="animate-spin text-white relative" strokeWidth={3} />
              </div>
              <span className="text-[9px] text-white font-black uppercase tracking-widest">{t.card.processing}</span>
            </div>
          )}
        </div>

        <div className="px-3 py-2 flex items-center gap-2 border-t border-black/[0.04] dark:border-white/[0.04] min-w-0 bg-transparent">
          {footerIcon && <span className="shrink-0">{footerIcon}</span>}
          <span className="text-[9px] font-bold text-slate-500 dark:text-obsidian-400 truncate flex-1 uppercase tracking-tighter tabular-nums">{image.fileName}</span>
          <button
            className="shrink-0 p-1 rounded-px hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-slate-400 dark:text-obsidian-600 hover:text-prism-500 dark:hover:text-prism-400 transition-all"
            onClick={(e) => { e.stopPropagation(); setShowExif(true); }}
            title={t.card.exifTooltip}
          >
            <FileSearch size={11} strokeWidth={2.5} />
          </button>
        </div>

        {image.status === "error" && image.error && (
          <div className="px-3 pb-2 text-[9px] text-rose-500 font-bold truncate bg-transparent uppercase tracking-tight">
            ERROR: {image.error}
          </div>
        )}
      </div>

      {showExif && (
        <ExifModal
          dataUrl={image.originalDataUrl}
          fileName={image.fileName}
          onClose={() => setShowExif(false)}
        />
      )}
    </>
  );
});
