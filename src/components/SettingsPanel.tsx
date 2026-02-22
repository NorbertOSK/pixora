import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useImageStore } from "../lib/store";
import { useT } from "../lib/langStore";
import { useBgModelStatus } from "../hooks/useBgModelStatus";
import { Section } from "./ui/Section";
import { cn } from "../lib/utils";

type PresetKey =
  | "original" | "hero" | "blog" | "card" | "avatar"
  | "fullhd" | "uhd" | "hd" | "productHd" | "productStd" | "custom";

const PRESET_VALUES: { key: PresetKey; value: number }[] = [
  { key: "original", value: 0 },
  { key: "hero", value: 1920 },
  { key: "blog", value: 1200 },
  { key: "card", value: 800 },
  { key: "avatar", value: 400 },
  { key: "fullhd", value: 1920 },
  { key: "uhd", value: 3840 },
  { key: "hd", value: 1280 },
  { key: "productHd", value: 2048 },
  { key: "productStd", value: 1000 },
  { key: "custom", value: -1 },
];

const FORMATS = [
  { value: "webp" as const, label: "WebP", badge: "✓", descKey: "webpDesc" as const },
  { value: "jpeg" as const, label: "JPG", badge: null, descKey: "jpgDesc" as const },
  { value: "png" as const, label: "PNG", badge: null, descKey: "pngDesc" as const },
];

export function SettingsPanel() {
  const t = useT();
  const format = useImageStore((s) => s.pipeline.format);
  const quality = useImageStore((s) => s.pipeline.quality);
  const resizeEnabled = useImageStore((s) => s.pipeline.resizeEnabled);
  const resizeMaxPx = useImageStore((s) => s.pipeline.resizeMaxPx);
  const resizeCustomH = useImageStore((s) => s.pipeline.resizeCustomH);
  const removeBgEnabled = useImageStore((s) => s.pipeline.removeBgEnabled);
  const stripExifEnabled = useImageStore((s) => s.pipeline.stripExifEnabled);
  const setPipeline = useImageStore((s) => s.setPipeline);
  const isProcessing = useImageStore((s) => s.isProcessing);
  const { modelDownloading, modelReady } = useBgModelStatus();
  const [customPx, setCustomPx] = useState(false);

  const qNorm = (quality - 1) / 99;

  return (
    <aside className="w-[320px] shrink-0 border-r border-black/[0.06] dark:border-white/[0.06] overflow-y-auto bg-slate-50/50 dark:bg-obsidian-950/40 backdrop-blur-3xl scrollbar-thin">
      <div className="px-6 pt-5 pb-3">
        <p className="text-[10px] text-slate-500 dark:text-obsidian-400 uppercase tracking-[0.2em] font-black">
          {t.settings.title}
        </p>
      </div>

      <div className="px-3 pb-8 space-y-1">
        <Section title={t.settings.format.section} badge={t.settings.format.badge} disabled={isProcessing}>
          <div className="grid grid-cols-3 gap-1 px-1">
            {FORMATS.map((f) => {
              return (
                <button
                  key={f.value}
                  onClick={() => setPipeline({ format: f.value })}
                  className={cn(
                    "relative overflow-hidden rounded-px border py-3 px-1 transition-all duration-200",
                    format === f.value
                      ? "border-prism-500/30 bg-white dark:bg-obsidian-800 shadow-satin text-prism-600 dark:text-prism-400"
                      : "border-transparent bg-transparent text-slate-500 dark:text-obsidian-500 hover:text-slate-800 dark:hover:text-obsidian-200"
                  )}
                >
                  <div className="text-[11px] font-black uppercase tracking-tight">{f.label}</div>
                  <div className="text-[9px] mt-0.5 opacity-60 font-medium">{t.settings.format[f.descKey]}</div>
                </button>
              );
            })}
          </div>

          {format !== "png" && (
            <div className="mt-4 px-1 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 dark:text-obsidian-400 uppercase tracking-widest font-bold">
                  {t.settings.format.quality}
                </span>
                <span className="text-[11px] font-black text-prism-600 dark:text-prism-400 tabular-nums">
                  {quality}%
                </span>
              </div>

              <div className="relative group px-1">
                <div className="h-1 w-full bg-black/[0.05] dark:bg-white/[0.05] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-prism-500 shadow-[0_0_8px_rgba(99,102,241,0.4)] transition-all duration-300"
                    style={{ width: `${quality}%` }}
                  />
                </div>
                <input
                  type="range" min={1} max={100} value={quality}
                  onChange={(e) => setPipeline({ quality: Number(e.target.value) })}
                  className="absolute inset-0 w-full h-1 opacity-0 cursor-pointer accent-prism-500"
                />
              </div>

              <div className="flex justify-between text-[8px] text-slate-400 dark:text-obsidian-600 font-bold uppercase tracking-tighter px-1">
                <span>{t.settings.format.qualityLow}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">{t.settings.format.qualityMid}</span>
                <span>{t.settings.format.qualityHigh}</span>
              </div>
            </div>
          )}
        </Section>

        <Section title={t.settings.resize.section} disabled={isProcessing}>
          <div className="space-y-3 px-1">
            <div className="flex items-center justify-between bg-black/[0.02] dark:bg-white/[0.02] p-2 rounded-px border border-black/[0.04] dark:border-white/[0.04]">
              <span className="text-[11px] font-bold text-slate-700 dark:text-obsidian-300 uppercase tracking-wide">{t.settings.resize.toggle}</span>
              <button
                onClick={() => setPipeline({ resizeEnabled: !resizeEnabled })}
                className={cn(
                  "relative h-5 w-9 rounded-full transition-all duration-300",
                  resizeEnabled ? "bg-prism-500 shadow-[0_0_10px_rgba(99,102,241,0.2)]" : "bg-black/10 dark:bg-white/10"
                )}
              >
                <div className={cn(
                  "absolute top-1 h-3 w-3 rounded-full bg-white shadow-sm transition-all duration-300",
                  resizeEnabled ? "left-5" : "left-1"
                )} />
              </button>
            </div>

            {resizeEnabled && (
              <div className="space-y-2 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <select
                  value={customPx ? -1 : resizeMaxPx}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val === -1) {
                      setCustomPx(true);
                      setPipeline({ resizeMaxPx: 0, resizeCustomH: 0 });
                    }
                    else {
                      setCustomPx(false);
                      setPipeline({ resizeMaxPx: val, resizeCustomH: 0, resizeEnabled: val > 0 });
                    }
                  }}
                  className="w-full bg-white dark:bg-obsidian-900 border border-black/[0.06] dark:border-white/[0.06] rounded-px px-3 py-2 text-xs text-slate-700 dark:text-obsidian-100 outline-none focus:border-prism-500/50 transition-all font-medium appearance-none shadow-sm"
                >
                  {PRESET_VALUES.map((p) => (
                    <option key={p.key} value={p.value} className="bg-white dark:bg-obsidian-900">{t.settings.resize.presets[p.key]}</option>
                  ))}
                </select>

                {customPx && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 dark:text-obsidian-500 font-black uppercase tracking-widest">{t.settings.resize.widthLabel}</label>
                      <input
                        type="number" value={resizeMaxPx || ""}
                        onChange={(e) => setPipeline({ resizeMaxPx: Number(e.target.value) })}
                        placeholder={t.settings.resize.widthPlaceholder}
                        className="w-full bg-white dark:bg-obsidian-900 border border-black/[0.06] dark:border-white/[0.06] rounded-px px-2.5 py-1.5 text-xs text-slate-700 dark:text-obsidian-100 outline-none focus:border-prism-500 transition-all tabular-nums font-bold placeholder:text-slate-300 dark:placeholder:text-obsidian-800"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 dark:text-obsidian-500 font-black uppercase tracking-widest">{t.settings.resize.heightLabel}</label>
                      <input
                        type="number" value={resizeCustomH || ""}
                        onChange={(e) => setPipeline({ resizeCustomH: Number(e.target.value) })}
                        placeholder={t.settings.resize.heightPlaceholder}
                        className="w-full bg-white dark:bg-obsidian-900 border border-black/[0.06] dark:border-white/[0.06] rounded-px px-2.5 py-1.5 text-xs text-slate-700 dark:text-obsidian-100 outline-none focus:border-prism-500 transition-all tabular-nums font-bold placeholder:text-slate-300 dark:placeholder:text-obsidian-800"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Section>

        <Section title={t.settings.removeBg.section} disabled={isProcessing}>
          <div className="p-1 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "grid h-8 w-8 place-items-center rounded-px border transition-all duration-300",
                  removeBgEnabled
                    ? "border-prism-500/30 bg-prism-500/10 text-prism-600 dark:text-prism-400 shadow-satin"
                    : "border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] text-slate-400 dark:text-obsidian-600"
                )}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M6 7V18C6 19.1046 6.89543 20 8 20H16C17.1046 20 18 19.1046 18 18V7M4 7H20M10 11V17M14 11V17M9 7L10 4H14L15 7" /></svg>
                </div>
                <div>
                  <div className="text-[11px] font-black text-slate-800 dark:text-obsidian-100 uppercase tracking-wide">{t.settings.removeBg.title}</div>
                  <div className="text-[9px] text-slate-500 dark:text-obsidian-500 font-medium">{t.settings.removeBg.subtitle}</div>
                </div>
              </div>
              <button
                onClick={() => setPipeline({ removeBgEnabled: !removeBgEnabled })}
                className={cn(
                  "relative h-5 w-9 rounded-full transition-all duration-300",
                  removeBgEnabled ? "bg-prism-500" : "bg-black/10 dark:bg-white/10"
                )}
              >
                <div className={cn(
                  "absolute top-1 h-3 w-3 rounded-full bg-white shadow-sm transition-all",
                  removeBgEnabled ? "left-5" : "left-1"
                )} />
              </button>
            </div>

            {removeBgEnabled && (
              <div className="space-y-2 animate-in fade-in duration-300">
                {modelDownloading && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-px bg-amber-500/10 border border-amber-500/20">
                    <Loader2 size={12} className="text-amber-600 animate-spin shrink-0" />
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wide">{t.settings.removeBg.modelDownloading}</span>
                  </div>
                )}
                {modelReady && !modelDownloading && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-px bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wide">{t.settings.removeBg.modelReady}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </Section>

        <Section title={t.settings.exif.section} disabled={isProcessing}>
          <div className="p-1 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "grid h-8 w-8 place-items-center rounded-px border transition-all duration-300",
                stripExifEnabled
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-satin"
                  : "border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] text-slate-400 dark:text-obsidian-600"
              )}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              </div>
              <div className="text-[11px] font-black text-slate-800 dark:text-obsidian-100 uppercase tracking-wide">{t.settings.exif.title}</div>
            </div>
            <button
              onClick={() => setPipeline({ stripExifEnabled: !stripExifEnabled })}
              className={cn(
                "relative h-5 w-9 rounded-full transition-all duration-300",
                stripExifEnabled ? "bg-emerald-500" : "bg-black/10 dark:bg-white/10"
              )}
            >
              <div className={cn(
                "absolute top-1 h-3 w-3 rounded-full bg-white shadow-sm transition-all",
                stripExifEnabled ? "left-5" : "left-1"
              )} />
            </button>
          </div>
        </Section>
      </div>
    </aside>
  );
}

