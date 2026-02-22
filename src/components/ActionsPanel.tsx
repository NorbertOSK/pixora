import { useEffect, useState } from "react";
import { Zap, Download, Trash2, FolderOpen, Loader2, Cpu, StopCircle } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { useImageStore } from "../lib/store";
import { useSystemStore } from "../lib/systemStore";
import { useT } from "../lib/langStore";
import { useProcessing } from "../hooks/useProcessing";
import { useSaveExport } from "../hooks/useSaveExport";
import { StatBar } from "./ui/StatBar";
import { cn } from "../lib/utils";

export function ActionsPanel() {
  const t = useT();
  const { images, selectedIds, clearAll } = useImageStore();
  const {
    cpuCount,
    cpuUsage,
    memoryTotalMb,
    memoryUsedMb,
    optimalConcurrency,
    startPolling,
    ready,
  } = useSystemStore();

  const { busy, targets, handleProcess, handleCancel } = useProcessing();
  const { saving, doneImages, handleSaveAll, handleSaveIndividual } = useSaveExport();
  const [version, setVersion] = useState<string>("");

  useEffect(() => startPolling(), [startPolling]);

  useEffect(() => {
    getVersion().then((v) => setVersion(`v${v}`));
  }, []);

  const isBlocked = busy || saving;

  const doneCount = doneImages.length;
  const processingCount = images.filter(
    (img) => img.status === "processing" || img.status === "pending"
  ).length;

  const hasTargets = targets.some(
    (img) =>
      img.status === "idle" ||
      img.status === "done" ||
      img.status === "error"
  );
  const hasDone = doneCount > 0;

  const memPct =
    memoryTotalMb > 0 ? (memoryUsedMb / memoryTotalMb) * 100 : 0;
  const toGb = (mb: number) => (mb / 1024).toFixed(1);

  async function handleClearAll() {
    if (images.length === 0 || isBlocked) return;
    await invoke("cleanup_all_temp").catch(() => { });
    clearAll();
  }

  return (
    <aside className="w-[200px] shrink-0 border-l border-black/[0.06] dark:border-white/[0.06] bg-slate-50/30 dark:bg-obsidian-950/20 backdrop-blur-3xl flex flex-col scrollbar-thin">
      <div className="px-5 pt-5 pb-3">
        <p className="text-[10px] text-slate-500 dark:text-obsidian-400 uppercase tracking-[0.2em] font-black">
          {t.actions.title}
        </p>
      </div>

      <div className="flex-1 flex flex-col gap-2.5 px-3.5 py-2">
        <button
          onClick={handleProcess}
          disabled={!hasTargets || isBlocked}
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-px py-3.5 text-[11px] font-black uppercase tracking-widest transition-all duration-300",
            hasTargets && !isBlocked
              ? "bg-prism-500 hover:bg-prism-400 active:bg-prism-600 text-white shadow-satin border border-prism-400/20"
              : "bg-black/[0.03] dark:bg-white/[0.03] text-slate-400 dark:text-obsidian-600 border border-transparent cursor-not-allowed"
          )}
        >
          {busy ? (
            <Loader2 size={12} className="animate-spin" strokeWidth={3} />
          ) : (
            <Zap size={12} fill="currentColor" strokeWidth={2.5} />
          )}
          {busy
            ? t.actions.processing
            : selectedIds.length > 0
              ? t.actions.processCount(selectedIds.length)
              : t.actions.processAll}
        </button>

        {busy && (
          <div className="mt-1 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-300 px-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-prism-600 dark:text-prism-400 uppercase tracking-tighter">
                {(() => {
                  const doneInBatch = targets.filter(img => img.status === 'done' || img.status === 'error').length;
                  const totalInBatch = targets.length;
                  const pct = totalInBatch > 0 ? Math.round((doneInBatch / totalInBatch) * 100) : 0;
                  return `${pct}%`;
                })()}
              </span>
              <span className="text-[9px] text-slate-400 dark:text-obsidian-500 font-black tabular-nums">
                {targets.filter(img => img.status === 'done' || img.status === 'error').length} / {targets.length}
              </span>
            </div>
            <div className="h-1 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-prism-500 transition-all duration-300 ease-out shadow-[0_0_8px_rgba(99,102,241,0.3)]"
                style={{
                  width: `${(() => {
                    const doneInBatch = targets.filter(img => img.status === 'done' || img.status === 'error').length;
                    const totalInBatch = targets.length;
                    return totalInBatch > 0 ? (doneInBatch / totalInBatch) * 100 : 0;
                  })()}%`
                }}
              />
            </div>
          </div>
        )}

        {busy && (
          <button
            onClick={handleCancel}
            className="w-full flex items-center justify-center gap-2 rounded-px py-2 text-[10px] font-black border transition-all border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 uppercase tracking-widest mt-1"
          >
            <StopCircle size={11} strokeWidth={2.5} />
            {t.actions.cancel}
          </button>
        )}

        {hasDone && (
          <button
            onClick={handleSaveAll}
            disabled={isBlocked}
            className={cn(
              "w-full flex items-center justify-center gap-2 rounded-px py-3 text-[10px] font-black border transition-all uppercase tracking-widest",
              !isBlocked
                ? "border-emerald-500/20 bg-white dark:bg-obsidian-900 text-emerald-600 dark:text-emerald-400 shadow-satin hover:bg-emerald-500/5"
                : "border-transparent bg-black/[0.03] dark:bg-white/[0.03] text-slate-300 dark:text-obsidian-700 cursor-not-allowed"
            )}
          >
            <Download size={11} strokeWidth={2.5} />
            {doneCount === 1
              ? t.actions.saveImage
              : t.actions.downloadZip(doneCount)}
          </button>
        )}

        {hasDone && doneCount > 1 && (
          <button
            onClick={handleSaveIndividual}
            disabled={isBlocked}
            className={cn(
              "w-full flex items-center justify-center gap-2 rounded-px py-2.5 text-[10px] font-black border transition-all uppercase tracking-wider",
              !isBlocked
                ? "border-black/[0.06] dark:border-white/[0.06] bg-transparent text-slate-500 dark:text-obsidian-400 hover:text-slate-900 dark:hover:text-obsidian-100"
                : "border-transparent text-slate-300 dark:text-obsidian-800 cursor-not-allowed"
            )}
          >
            <FolderOpen size={11} strokeWidth={2.5} />
            {t.actions.saveIndividual}
          </button>
        )}

        <div className="border-t border-black/[0.06] dark:border-white/[0.06] my-2" />

        <button
          onClick={handleClearAll}
          disabled={images.length === 0 || isBlocked}
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-px py-2.5 text-[10px] font-black border transition-all uppercase tracking-widest",
            images.length > 0 && !isBlocked
              ? "border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] text-slate-400 dark:text-obsidian-600 hover:text-rose-500 dark:hover:text-rose-500 hover:bg-rose-500/5 dark:hover:bg-rose-500/10 hover:border-rose-500/20"
              : "border-transparent text-black/10 dark:text-white/5 cursor-not-allowed"
          )}
        >
          <Trash2 size={11} strokeWidth={2.5} />
          {t.actions.clearAll}
        </button>
      </div>

      {ready && (
        <div className="mt-auto px-4 py-6 border-t border-black/[0.06] dark:border-white/[0.06] space-y-4 bg-black/[0.01] dark:bg-white/[0.01]">
          <div className="flex items-center gap-2 mb-1 opacity-60">
            <Cpu size={10} strokeWidth={3} className="text-prism-500" />
            <span className="text-[9px] font-black text-slate-500 dark:text-obsidian-400 uppercase tracking-widest">
              Engine Status
            </span>
          </div>

          <StatBar label="CPU" value={`${cpuUsage.toFixed(0)}%`} pct={cpuUsage} />

          {memoryTotalMb > 0 && (
            <StatBar
              label="RAM"
              value={`${toGb(memoryUsedMb)}G`}
              max={`${toGb(memoryTotalMb)}G`}
              pct={memPct}
            />
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[9px] text-slate-400 dark:text-obsidian-600 uppercase tracking-widest font-black">
              Cores
            </span>
            <span className="text-[10px] font-black text-slate-700 dark:text-obsidian-200 tabular-nums">
              {optimalConcurrency}<span className="opacity-30 mx-1">/</span>{cpuCount}
            </span>
          </div>
        </div>
      )}

      {version && (
        <div className="px-5 py-3 border-t border-black/[0.03] dark:border-white/[0.03] flex justify-center">
          <span className="text-[8px] text-slate-400 dark:text-obsidian-700 font-black tracking-[0.3em] uppercase">
            Pixora {version}
          </span>
        </div>
      )}
    </aside>
  );
}

