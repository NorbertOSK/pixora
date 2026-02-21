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
    pending: <Clock size={12} className="text-slate-400 dark:text-white/40" />,
    processing: <Loader2 size={12} className="animate-spin text-violet-500 dark:text-violet-400" />,
    done: <CheckCircle2 size={12} className="text-emerald-500 dark:text-emerald-400" />,
    error: <AlertCircle size={12} className="text-red-500 dark:text-red-400" />,
  }[image.status];

  return (
    <>
      <div
        className={cn(
          "group relative flex flex-col rounded-xl border overflow-hidden transition-all cursor-pointer",
          isSelected
            ? "border-violet-400/50 ring-inset ring-1 ring-violet-400/25 bg-violet-50 dark:bg-violet-950/25"
            : "border-black/[0.08] dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.02] hover:border-black/15 dark:hover:border-white/15"
        )}
        onClick={() => toggleSelect(image.id)}
      >
        <div
          className={cn(
            "absolute top-2 left-2 z-20 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
            isSelected
              ? "bg-violet-600 border-violet-500"
              : "bg-black/20 dark:bg-black/40 border-white/50 dark:border-white/30 group-hover:border-white/80"
          )}
        >
          {isSelected && (
            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </div>

        <button
          className="absolute top-2 right-2 z-20 w-5 h-5 rounded-full bg-black/30 dark:bg-black/50 border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600/70"
          onClick={(e) => { e.stopPropagation(); removeImage(image.id); }}
        >
          <X size={10} className="text-white" />
        </button>

        <div className="aspect-square bg-slate-200/50 dark:bg-zinc-900/60 relative">
          <SplitView
            original={image.originalDataUrl}
            processed={image.processedDataUrl}
            className="w-full h-full"
          />

          {image.status === "pending" && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10 pointer-events-none">
              <span className="text-[10px] font-semibold text-white/90 bg-black/50 px-2.5 py-1 rounded-full border border-white/20 tracking-wide">
                {t.card.pending}
              </span>
            </div>
          )}

          {image.status === "processing" && (
            <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-2 z-10 pointer-events-none">
              <Loader2 size={28} className="animate-spin text-violet-400" />
              <span className="text-[10px] text-white/80 font-medium">{t.card.processing}</span>
            </div>
          )}
        </div>

        <div className="px-2 py-1.5 flex items-center gap-1.5 border-t border-black/5 dark:border-white/[0.06] min-w-0 bg-white/50 dark:bg-transparent">
          {footerIcon && <span className="shrink-0">{footerIcon}</span>}
          <span className="text-[10px] text-slate-600 dark:text-white/60 truncate flex-1">{image.fileName}</span>
          <button
            className="shrink-0 p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 dark:text-white/35 hover:text-slate-600 dark:hover:text-white/70 transition-colors"
            onClick={(e) => { e.stopPropagation(); setShowExif(true); }}
            title={t.card.exifTooltip}
          >
            <FileSearch size={12} />
          </button>
        </div>

        {image.status === "error" && image.error && (
          <div className="px-2 pb-1.5 text-[9px] text-red-500 dark:text-red-400 truncate bg-white/50 dark:bg-transparent">
            {image.error}
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
