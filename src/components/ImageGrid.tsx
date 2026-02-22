import { useImageStore } from "../lib/store";
import { useT } from "../lib/langStore";
import { ImageCard } from "./ImageCard";
import { ImagePlus, CheckSquare } from "lucide-react";
import { cn } from "../lib/utils";

interface ImageGridProps {
  isDragActive: boolean;
  onOpenFile: () => void;
}

export function ImageGrid({ isDragActive, onOpenFile }: ImageGridProps) {
  const t = useT();
  const images = useImageStore((s) => s.images);
  const selectedIds = useImageStore((s) => s.selectedIds);
  const selectAll = useImageStore((s) => s.selectAll);
  const selectNone = useImageStore((s) => s.selectNone);
  const isProcessing = useImageStore((s) => s.isProcessing);

  const allSelected = images.length > 0 && selectedIds.length === images.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  if (images.length === 0) {
    return (
      <main className={cn(
        "flex-1 flex flex-col items-center justify-center p-8 transition-all duration-500",
        isDragActive ? "bg-prism-500/[0.04]" : "bg-transparent"
      )}>
        <div
          className={cn(
            "relative group flex flex-col items-center gap-6 p-16 rounded-px border-2 border-dashed transition-all duration-500 cursor-pointer max-w-lg w-full",
            isDragActive
              ? "border-prism-400 bg-prism-500/[0.06] shadow-lensed scale-105"
              : "border-black/[0.08] dark:border-white/[0.08] hover:border-prism-500/40 hover:bg-white dark:hover:bg-obsidian-900 shadow-sm"
          )}
          onClick={isProcessing ? undefined : onOpenFile}
        >
          {/* Animated Glow Effect */}
          <div className="absolute inset-0 bg-prism-500 blur-[80px] opacity-0 group-hover:opacity-5 transition-opacity" />

          <div className="relative group">
            <div className="absolute inset-0 bg-prism-500 rounded-full blur-3xl opacity-10 dark:opacity-20 group-hover:opacity-30 transition-opacity" />
            <div className="relative h-24 w-24 rounded-px bg-white/50 dark:bg-obsidian-900/50 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.06] flex items-center justify-center shadow-lensed overflow-hidden mb-6">
              <ImagePlus size={40} className="text-prism-500 transition-transform group-hover:scale-110 duration-500" strokeWidth={1.5} />
            </div>
          </div>
          <h3 className="text-xl font-black text-slate-800 dark:text-obsidian-100 uppercase tracking-[0.2em] mb-2">{t.grid.dragIdle}</h3>
          <p className="text-xs text-slate-500 dark:text-obsidian-500 font-bold uppercase tracking-widest flex items-center gap-2">
            <span className="h-px w-4 bg-slate-300 dark:bg-obsidian-800" />
            {t.grid.clickToOpen}
            <span className="h-px w-4 bg-slate-300 dark:bg-obsidian-800" />
          </p>
          <div className="mt-8 flex gap-3 justify-center opacity-40 group-hover:opacity-100 transition-opacity">
            <span className="px-2 py-1 rounded-px text-[9px] font-black bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-slate-500 dark:text-obsidian-400 tracking-tighter uppercase">JPG</span>
            <span className="px-2 py-1 rounded-px text-[9px] font-black bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-slate-500 dark:text-obsidian-400 tracking-tighter uppercase">PNG</span>
            <span className="px-2 py-1 rounded-px text-[9px] font-black bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-slate-500 dark:text-obsidian-400 tracking-tighter uppercase">WEBP</span>
            <span className="px-2 py-1 rounded-px text-[9px] font-black bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-slate-500 dark:text-obsidian-400 tracking-tighter uppercase">AVIF</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="shrink-0 flex items-center h-12 gap-4 px-6 border-b border-black/[0.04] dark:border-white/[0.04] bg-white/40 dark:bg-obsidian-950/40 backdrop-blur-xl">
        <button
          onClick={allSelected ? selectNone : selectAll}
          className="flex items-center gap-2 group"
        >
          <div className={cn(
            "w-4 h-4 rounded-sm border flex items-center justify-center transition-all",
            allSelected
              ? "bg-prism-500 border-prism-400 shadow-satin"
              : someSelected
                ? "bg-white dark:bg-obsidian-800 border-prism-500/50"
                : "bg-transparent border-black/10 dark:border-white/10 group-hover:border-slate-400"
          )}>
            {allSelected && <CheckSquare size={10} className="text-white" strokeWidth={3} />}
            {someSelected && <div className="w-1.5 h-0.5 bg-prism-500 rounded-full" />}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-obsidian-400 group-hover:text-slate-900 dark:group-hover:text-obsidian-100 transition-colors">
            {allSelected ? t.grid.deselectAll : t.grid.selectAll}
          </span>
        </button>

        <div className="h-3 w-[1px] bg-black/[0.1] dark:bg-white/[0.05]" />

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400 dark:text-obsidian-600 tabular-nums">
            {images.length}
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-obsidian-600">
            {t.grid.images}
          </span>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-prism-500/10 border border-prism-500/20">
              <span className="text-[10px] font-black text-prism-600 dark:text-prism-400 tabular-nums">
                {selectedIds.length}
              </span>
              <span className="text-[8px] font-black uppercase tracking-widest text-prism-600 dark:text-prism-400">
                {t.grid.selected}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onOpenFile}
          disabled={isProcessing}
          className={cn(
            "ml-auto flex items-center gap-2 px-3 py-1.5 rounded-px text-[10px] font-black uppercase tracking-widest transition-all",
            isProcessing
              ? "opacity-20 cursor-not-allowed"
              : "text-slate-600 dark:text-obsidian-400 hover:text-prism-500 dark:hover:text-prism-400 bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] border border-black/[0.05] dark:border-white/[0.05]"
          )}
        >
          <ImagePlus size={12} strokeWidth={2.5} />
          {t.grid.addMore}
        </button>
      </div>

      <div className={cn(
        "flex-1 overflow-y-auto p-6 scrollbar-thin transition-all duration-500",
        isDragActive ? "bg-prism-500/[0.02]" : "bg-transparent"
      )}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {images.map((img) => (
            <ImageCard key={img.id} image={img} isSelected={selectedIds.includes(img.id)} />
          ))}
        </div>
      </div>
    </main>
  );
}

