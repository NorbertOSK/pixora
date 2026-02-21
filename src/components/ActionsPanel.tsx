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
    <aside className="w-[200px] shrink-0 border-l border-black/[0.06] dark:border-white/[0.06] bg-white/90 dark:bg-[#100e24]/60 backdrop-blur-xl flex flex-col">
      <div className="px-4 pt-4 pb-2">
        <p className="text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-widest font-semibold">
          {t.actions.title}
        </p>
      </div>

      <div className="flex-1 flex flex-col gap-2 px-3 py-2">
        <button
          onClick={handleProcess}
          disabled={!hasTargets || isBlocked}
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all",
            hasTargets && !isBlocked
              ? "bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white shadow-md shadow-violet-900/25"
              : "bg-black/5 dark:bg-white/5 text-slate-300 dark:text-white/25 cursor-not-allowed"
          )}
        >
          {busy ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Zap size={14} />
          )}
          {busy
            ? t.actions.processing
            : selectedIds.length > 0
              ? t.actions.processCount(selectedIds.length)
              : t.actions.processAll}
        </button>

        {busy && (
          <button
            onClick={handleCancel}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold border transition-all border-red-400/25 bg-red-500/[0.06] dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-950/40"
          >
            <StopCircle size={13} />
            {t.actions.cancel}
          </button>
        )}

        {!busy && targets.length > 1 && ready && (
          <p className="text-[9px] text-slate-400 dark:text-white/35 text-center">
            {optimalConcurrency}× parallel · {cpuCount} cores
          </p>
        )}

        {hasDone && (
          <button
            onClick={handleSaveAll}
            disabled={isBlocked}
            className={cn(
              "w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold border transition-all",
              !isBlocked
                ? "border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 dark:hover:bg-emerald-950/50"
                : "border-black/5 dark:border-white/10 text-slate-300 dark:text-white/20 cursor-not-allowed"
            )}
          >
            <Download size={13} />
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
              "w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold border transition-all",
              !isBlocked
                ? "border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] text-slate-600 dark:text-white/55 hover:text-slate-800 dark:hover:text-white/85"
                : "border-black/5 dark:border-white/5 text-slate-300 dark:text-white/20 cursor-not-allowed"
            )}
          >
            <FolderOpen size={13} />
            {t.actions.saveIndividual}
          </button>
        )}

        <div className="border-t border-black/[0.06] dark:border-white/[0.06] my-1" />

        <button
          onClick={handleClearAll}
          disabled={images.length === 0 || isBlocked}
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold border transition-all",
            images.length > 0 && !isBlocked
              ? "border-red-400/20 bg-red-500/[0.06] dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-950/40"
              : "border-black/5 dark:border-white/20 text-slate-300 dark:text-white/20 cursor-not-allowed"
          )}
        >
          <Trash2 size={13} />
          {t.actions.clearAll}
        </button>
      </div>

      {images.length > 0 && (
        <div className="px-4 py-3 border-t border-black/[0.06] dark:border-white/[0.06] space-y-1.5">
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-500 dark:text-white/40">
              {t.actions.statsTotal}
            </span>
            <span className="text-slate-700 dark:text-white/70 font-medium">
              {images.length}
            </span>
          </div>
          {doneCount > 0 && (
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500 dark:text-white/40">
                {t.actions.statsReady}
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {doneCount}
              </span>
            </div>
          )}
          {processingCount > 0 && (
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500 dark:text-white/40">
                {t.actions.statsProcessing}
              </span>
              <span className="text-violet-600 dark:text-violet-400 font-medium">
                {processingCount}
              </span>
            </div>
          )}
          {images.filter((i) => i.status === "error").length > 0 && (
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500 dark:text-white/40">
                {t.actions.statsErrors}
              </span>
              <span className="text-red-500 dark:text-red-400 font-medium">
                {images.filter((i) => i.status === "error").length}
              </span>
            </div>
          )}
        </div>
      )}

      {ready && (
        <div className="px-3 py-3 border-t border-black/[0.06] dark:border-white/[0.06] space-y-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Cpu size={10} className="text-violet-500 dark:text-violet-400" />
            <span className="text-[9px] font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider">
              System
            </span>
          </div>

          <StatBar label="CPU" value={`${cpuUsage.toFixed(0)}%`} pct={cpuUsage} />

          {memoryTotalMb > 0 && (
            <StatBar
              label="RAM"
              value={`${toGb(memoryUsedMb)} GB`}
              max={`${toGb(memoryTotalMb)} GB`}
              pct={memPct}
            />
          )}

          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[9px] text-slate-500 dark:text-white/40 uppercase tracking-wider font-semibold">
              Workers
            </span>
            <span className="text-[9px] font-bold text-violet-700 dark:text-violet-300 bg-violet-500/10 dark:bg-violet-500/20 px-1.5 py-0.5 rounded-full">
              {optimalConcurrency} / {cpuCount}
            </span>
          </div>
        </div>
      )}

      {version && (
        <div className="mt-auto px-4 py-3 border-t border-black/[0.06] dark:border-white/[0.06] flex justify-center bg-black/5 dark:bg-white/[0.02]">
          <span className="text-[9px] text-slate-400 dark:text-white/30 font-bold tracking-widest uppercase">
            Pixora {version}
          </span>
        </div>
      )}
    </aside>
  );
}
