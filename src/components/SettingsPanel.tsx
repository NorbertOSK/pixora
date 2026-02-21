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
  const { pipeline, setPipeline, isProcessing } = useImageStore();
  const { modelDownloading, modelReady } = useBgModelStatus();
  const [customPx, setCustomPx] = useState(false);

  const qNorm = (pipeline.quality - 1) / 99;

  return (
    <aside className="w-[320px] shrink-0 border-r border-black/[0.06] dark:border-white/[0.06] overflow-y-auto bg-white/90 dark:bg-[#100e24]/60 backdrop-blur-xl">
      <div className="px-4 pt-4 pb-2">
        <p className="text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-widest font-semibold">
          {t.settings.title}
        </p>
      </div>

      <Section title={t.settings.format.section} badge={t.settings.format.badge} disabled={isProcessing}>
        <div className="grid grid-cols-3 gap-1.5">
          {FORMATS.map((f) => {
            const active = pipeline.format === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setPipeline({ format: f.value })}
                className={cn(
                  "relative overflow-hidden rounded-xl border p-2.5 text-center transition-all",
                  active
                    ? "border-violet-500/40 bg-violet-50 dark:bg-violet-950/40 ring-inset ring-1 ring-violet-500/20"
                    : "border-black/[0.08] dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03] hover:border-black/15 dark:hover:border-white/15 hover:bg-slate-100 dark:hover:bg-white/[0.05]"
                )}
              >
                {active && <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-violet-600 to-blue-500" />}

                <div className="flex items-center justify-center">
                  <span className={cn(
                    "text-xs font-extrabold",
                    active ? "text-violet-800 dark:text-violet-200" : "text-slate-700 dark:text-white/90"
                  )}>
                    {f.label}
                  </span>
                </div>

                <div className={cn(
                  "text-[10px] mt-0.5 leading-tight text-center",
                  active ? "text-violet-700/80 dark:text-violet-300/80" : "text-slate-500 dark:text-white/50"
                )}>
                  {t.settings.format[f.descKey]}
                </div>

                <div className="flex justify-center mt-2">
                  <div className={cn(
                    "w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all",
                    active
                      ? "bg-violet-600"
                      : "border border-black/15 dark:border-white/20 bg-black/5 dark:bg-white/5"
                  )}>
                    {active && (
                      <svg className="w-2 h-2 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {pipeline.format !== "png" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 dark:text-white/55 uppercase tracking-wider font-semibold">
                {t.settings.format.quality}
              </span>
              <span className="text-xs font-bold text-violet-700 dark:text-violet-300 bg-violet-500/10 dark:bg-violet-500/20 px-2 py-0.5 rounded-full">
                {pipeline.quality}%
              </span>
            </div>

            <div className="relative h-8 flex items-center">
              <div className="absolute inset-x-0 h-1.5 rounded-full bg-black/10 dark:bg-white/10" />
              <div
                className="absolute left-0 h-1.5 rounded-full bg-gradient-to-r from-violet-600 to-blue-500 pointer-events-none"
                style={{ width: `${pipeline.quality}%` }}
              />
              <div
                className="absolute w-4 h-4 rounded-full bg-white shadow-md ring-2 ring-violet-500/80 pointer-events-none z-10"
                style={{ left: `calc(${qNorm * 100}% - ${qNorm * 16}px)` }}
              />
              <input
                type="range" min={1} max={100} value={pipeline.quality}
                onChange={(e) => setPipeline({ quality: Number(e.target.value) })}
                className="absolute inset-0 w-full opacity-0 cursor-pointer z-20"
              />
            </div>

            <div className="flex justify-between text-[9px] text-slate-400 dark:text-white/40">
              <span>{t.settings.format.qualityLow}</span>
              <span>{t.settings.format.qualityMid}</span>
              <span>{t.settings.format.qualityHigh}</span>
            </div>
            <p className="text-[10px] text-violet-700/70 dark:text-violet-300/60 bg-violet-500/[0.06] dark:bg-violet-950/40 rounded-lg p-2 leading-relaxed">
              {t.settings.format.qualityTip}
            </p>
          </div>
        )}
      </Section>

      <Section title={t.settings.resize.section} disabled={isProcessing}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-700 dark:text-white/75">{t.settings.resize.toggle}</span>
          <button
            onClick={() => setPipeline({ resizeEnabled: !pipeline.resizeEnabled })}
            className={cn(
              "relative h-6 w-11 rounded-full border transition-all shrink-0",
              pipeline.resizeEnabled
                ? "border-violet-500/30 bg-violet-500/30"
                : "border-black/10 dark:border-white/15 bg-black/5 dark:bg-white/5"
            )}
          >
            <span className={cn(
              "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition-all",
              pipeline.resizeEnabled ? "left-6" : "left-1"
            )} />
          </button>
        </div>

        {pipeline.resizeEnabled && (
          <>
            <select
              value={customPx ? -1 : pipeline.resizeMaxPx}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val === -1) { setCustomPx(true); }
                else { setCustomPx(false); setPipeline({ resizeMaxPx: val, resizeCustomH: 0, resizeEnabled: val > 0 }); }
              }}
              className="w-full bg-white dark:bg-[#100e24]/80 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-white/90 outline-none focus:ring-1 focus:ring-violet-500/40 transition-colors"
            >
              {PRESET_VALUES.map((p) => (
                <option key={p.key} value={p.value}>{t.settings.resize.presets[p.key]}</option>
              ))}
            </select>

            {customPx && (
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-slate-500 dark:text-white/55 mb-1 block font-medium">
                    {t.settings.resize.widthLabel}
                  </label>
                  <input
                    type="number" value={pipeline.resizeMaxPx || ""}
                    onChange={(e) => setPipeline({ resizeMaxPx: Number(e.target.value) })}
                    className="w-full bg-white dark:bg-[#100e24]/80 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-white/90 outline-none focus:ring-1 focus:ring-violet-500/40 transition-colors"
                    placeholder={t.settings.resize.widthPlaceholder}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 dark:text-white/55 mb-1 block font-medium">
                    {t.settings.resize.heightLabel}
                  </label>
                  <input
                    type="number" value={pipeline.resizeCustomH || ""}
                    onChange={(e) => setPipeline({ resizeCustomH: Number(e.target.value) })}
                    className="w-full bg-white dark:bg-[#100e24]/80 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-white/90 outline-none focus:ring-1 focus:ring-violet-500/40 transition-colors"
                    placeholder={t.settings.resize.heightPlaceholder}
                  />
                </div>
              </div>
            )}

            <p className="text-[10px] text-slate-500 dark:text-white/45 leading-relaxed">{t.settings.resize.hint}</p>
          </>
        )}
      </Section>

      <Section title={t.settings.removeBg.section} disabled={isProcessing}>
        <div className="rounded-xl border border-black/[0.07] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className={cn(
                "grid h-8 w-8 place-items-center rounded-lg border text-xs font-bold",
                pipeline.removeBgEnabled
                  ? "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-300"
                  : "border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-slate-400 dark:text-white/40"
              )}>✂</div>
              <div>
                <div className="text-xs font-semibold text-slate-800 dark:text-white/90">{t.settings.removeBg.title}</div>
                <div className="text-[10px] text-slate-500 dark:text-white/45">{t.settings.removeBg.subtitle}</div>
              </div>
            </div>
            <button
              onClick={() => setPipeline({ removeBgEnabled: !pipeline.removeBgEnabled })}
              className={cn(
                "relative h-6 w-11 rounded-full border transition-all shrink-0",
                pipeline.removeBgEnabled
                  ? "border-violet-500/30 bg-violet-500/30"
                  : "border-black/10 dark:border-white/15 bg-black/5 dark:bg-white/5"
              )}
            >
              <span className={cn(
                "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition-all",
                pipeline.removeBgEnabled ? "left-6" : "left-1"
              )} />
            </button>
          </div>

          {pipeline.removeBgEnabled && (
            <div className="pt-1 border-t border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <span className="text-xs text-violet-700 dark:text-violet-300 font-medium">{t.settings.removeBg.localBtn}</span>
              </div>

              {modelDownloading && (
                <div className="flex items-center gap-2 mt-2 px-2.5 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 animate-pulse">
                  <Loader2 size={14} className="text-amber-600 dark:text-amber-400 animate-spin shrink-0" />
                  <span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium leading-tight">
                    {t.settings.removeBg.modelDownloading}
                  </span>
                </div>
              )}

              {!modelDownloading && modelReady && (
                <div className="flex items-center gap-2 mt-2 px-2.5 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium leading-tight">
                    {t.settings.removeBg.modelReady}
                  </span>
                </div>
              )}

              <p className="text-[10px] text-slate-500 dark:text-white/45 bg-black/[0.03] dark:bg-white/[0.03] rounded-lg p-2 mt-2 leading-relaxed">
                {t.settings.removeBg.localDesc}
              </p>
            </div>
          )}
        </div>
      </Section>

      <Section title={t.settings.exif.section} disabled={isProcessing}>
        <div className="rounded-xl border border-black/[0.07] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className={cn(
                "grid h-8 w-8 place-items-center rounded-lg border text-sm",
                pipeline.stripExifEnabled
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300"
                  : "border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-slate-400 dark:text-white/40"
              )}>🛡</div>
              <div>
                <div className="text-xs font-semibold text-slate-800 dark:text-white/90">{t.settings.exif.title}</div>
                <div className="text-[10px] text-slate-500 dark:text-white/45">{t.settings.exif.subtitle}</div>
              </div>
            </div>
            <button
              onClick={() => setPipeline({ stripExifEnabled: !pipeline.stripExifEnabled })}
              className={cn(
                "relative h-6 w-11 rounded-full border transition-all shrink-0",
                pipeline.stripExifEnabled
                  ? "border-emerald-400/30 bg-emerald-500/30"
                  : "border-black/10 dark:border-white/15 bg-black/5 dark:bg-white/5"
              )}
            >
              <span className={cn(
                "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition-all",
                pipeline.stripExifEnabled ? "left-6" : "left-1"
              )} />
            </button>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 dark:text-white/45 leading-relaxed">{t.settings.exif.desc}</p>
      </Section>
    </aside>
  );
}
