import { useImageStore } from "../lib/store";
import { useT } from "../lib/langStore";
import { ImageCard } from "./ImageCard";
import { ImagePlus, CheckSquare, Square } from "lucide-react";

interface ImageGridProps {
  isDragActive: boolean;
  onOpenFile: () => void;
}

export function ImageGrid({ isDragActive, onOpenFile }: ImageGridProps) {
  const t = useT();
  const { images, selectedIds, selectAll, selectNone, isProcessing } = useImageStore();

  const allSelected = images.length > 0 && selectedIds.length === images.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  if (images.length === 0) {
    return (
      <main className={`flex-1 flex flex-col items-center justify-center gap-4 transition-colors ${isDragActive ? "bg-violet-500/[0.06]" : "bg-transparent"
        }`}>
        <div
          className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-3 transition-all cursor-pointer ${isDragActive
              ? "border-violet-400 bg-violet-500/[0.06]"
              : "border-black/10 dark:border-white/10 hover:border-violet-400/40 dark:hover:border-violet-500/30"
            }`}
          onClick={isProcessing ? undefined : onOpenFile}
        >
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <ImagePlus size={24} className="text-violet-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700 dark:text-white/85">
              {isDragActive ? t.grid.dragActive : t.grid.dragIdle}
            </p>
            <p className="text-xs text-slate-500 dark:text-white/50 mt-1">
              {t.grid.or}{" "}
              <span className="text-violet-600 dark:text-violet-400 underline underline-offset-2">{t.grid.clickToOpen}</span>
            </p>
            <p className="text-[10px] text-slate-400 dark:text-white/30 mt-2">{t.grid.formats}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="shrink-0 flex items-center gap-3 px-4 py-2 border-b border-black/[0.06] dark:border-white/[0.06] bg-white/60 dark:bg-[#100e24]/40">
        <button
          onClick={allSelected ? selectNone : selectAll}
          className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-white/55 hover:text-slate-900 dark:hover:text-white/90 transition-colors"
        >
          {allSelected ? (
            <CheckSquare size={14} className="text-violet-600 dark:text-violet-400" />
          ) : someSelected ? (
            <CheckSquare size={14} className="text-slate-400 dark:text-white/40" />
          ) : (
            <Square size={14} />
          )}
          {allSelected ? t.grid.deselectAll : t.grid.selectAll}
        </button>

        <span className="text-slate-300 dark:text-white/20">·</span>

        <span className="text-xs text-slate-500 dark:text-white/45">
          {t.grid.imageCount(images.length)}
          {selectedIds.length > 0 && (
            <span className="text-violet-600 dark:text-violet-400 ml-1">
              {t.grid.selectedCount(selectedIds.length)}
            </span>
          )}
        </span>

        <button
          onClick={onOpenFile}
          disabled={isProcessing}
          className={`ml-auto flex items-center gap-1.5 text-xs transition-colors border rounded-lg px-2.5 py-1 ${isProcessing
              ? "text-slate-300 dark:text-white/20 border-black/5 dark:border-white/5 cursor-not-allowed"
              : "text-slate-500 dark:text-white/50 hover:text-slate-800 dark:hover:text-white/80 border-black/10 dark:border-white/10 hover:border-violet-400/40 dark:hover:border-violet-500/30"
            }`}
        >
          <ImagePlus size={12} />
          {t.grid.addMore}
        </button>
      </div>

      <div className={`flex-1 overflow-y-auto p-4 transition-colors ${isDragActive ? "bg-violet-500/[0.04] dark:bg-violet-950/20" : ""
        }`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {images.map((img) => (
            <ImageCard key={img.id} image={img} isSelected={selectedIds.includes(img.id)} />
          ))}
        </div>
      </div>
    </main>
  );
}
