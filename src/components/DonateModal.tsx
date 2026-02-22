import { useState, useEffect, memo, useMemo } from "react";
import { createPortal } from "react-dom";
import { Heart, X, Copy, Check, ExternalLink } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import wiseQr from "../assets/img/wise_qr.png";
import binanceQr from "../assets/img/binance_qr.png";
import nubankQr from "../assets/img/nubank_qr.png";
import { cn } from "../lib/utils";
import { useT } from "../lib/langStore";

type MethodId =
  | "cafecito"
  | "pix"
  | "wise"
  | "belo"
  | "lemon"
  | "buenbit"
  | "binance";

const METHOD_IDS: MethodId[] = [
  "cafecito", "pix", "wise", "belo", "lemon", "buenbit", "binance",
];

const METHOD_ICONS: Record<MethodId, string> = {
  cafecito: "☕",
  pix: "🇧🇷",
  wise: "💚",
  belo: "🟣",
  lemon: "🍋",
  buenbit: "₿",
  binance: "🟡",
};

import { Tooltip } from "./ui/Tooltip";

const CopyField = memo(function CopyField({ label, value }: { label: string; value: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [value]);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[9px] text-slate-500 dark:text-obsidian-500 uppercase tracking-[0.15em] font-black">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-black/[0.03] dark:bg-obsidian-950/50 border border-black/[0.06] dark:border-white/[0.06] rounded-px px-4 py-2.5 text-xs font-bold tabular-nums text-slate-800 dark:text-obsidian-100 select-all overflow-hidden truncate">
          {value}
        </code>
        <Tooltip
          content={t.common.copied}
          show={copied}
          onHide={() => setCopied(false)}
        >
          <button
            onClick={handleCopy}
            className={cn(
              "p-2.5 rounded-px border transition-all shrink-0 shadow-satin",
              copied
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-obsidian-800 text-slate-500 dark:text-obsidian-400 hover:text-slate-800 dark:hover:text-obsidian-100"
            )}
          >
            {copied ? <Check size={14} strokeWidth={3} /> : <Copy size={14} strokeWidth={3} />}
          </button>
        </Tooltip>
      </div>
    </div>
  );
});

const LinkButton = memo(function LinkButton({ href, label }: { href: string; label: string }) {
  return (
    <button
      onClick={() => openUrl(href)}
      className="flex items-center justify-center gap-2 bg-prism-500 hover:bg-prism-400 active:bg-prism-600 text-white text-[10px] font-black px-6 py-3 rounded-px transition-all shadow-satin uppercase tracking-widest border border-white/10"
    >
      <ExternalLink size={12} strokeWidth={3} />
      {label}
    </button>
  );
});

const QrImage = memo(function QrImage({ src, alt, hint }: { src: string; alt: string; hint: string }) {
  return (
    <div className="flex flex-col items-center gap-2 pt-1">
      <div className="p-3 bg-white rounded-px shadow-lensed border border-black/[0.06] dark:border-white/[0.1]">
        <img src={src} alt={alt} className="w-40 h-40 object-contain brightness-[1.02]" />
      </div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-obsidian-600">{hint}</p>
    </div>
  );
});

const Detail = memo(function Detail({ method }: { method: MethodId }) {
  const t = useT();
  const m = t.donate.methods;

  const content = useMemo(() => {
    switch (method) {
      case "cafecito":
        return (
          <div className="flex flex-col items-center gap-4 pt-4">
            <p className="text-xs text-slate-600 dark:text-obsidian-400 text-center leading-relaxed max-w-[240px] font-medium">
              {m.cafecito.hint}
            </p>
            <button
              onClick={() => openUrl("https://cafecito.app/nkrucheski")}
              className="flex items-center gap-4 bg-[#00BCD4] hover:bg-[#00ACC1] active:bg-[#0097A7] text-white font-black px-8 py-3.5 rounded-px transition-all shadow-satin border border-white/10 uppercase tracking-widest text-xs"
            >
              <span className="text-xl">☕</span>
              <span>{m.cafecito.cta}</span>
            </button>
            <p className="text-[10px] font-bold text-slate-400 dark:text-obsidian-600 uppercase tracking-widest">
              cafecito.app/nkrucheski
            </p>
          </div>
        );

      case "pix":
        return (
          <div className="flex flex-col gap-4 pt-1">
            <CopyField label={m.pix.cta} value="c931ebdc-58bd-4dba-a0cc-96cb5b74dd4d" />
            <QrImage src={nubankQr} alt="Nubank PIX QR" hint={t.donate.scanLabel} />
            <LinkButton
              href="https://nubank.com.br/cobrar/74k5rt/699a0cc8-1e90-40f2-a0c3-4bd71783d5d9"
              label={m.pix.cta2}
            />
          </div>
        );

      case "wise":
        return (
          <div className="flex flex-col gap-4 pt-1">
            <CopyField label={t.donate.methods.wise.label} value="@norbertok1" />
            <QrImage src={wiseQr} alt="Wise QR" hint={t.donate.scanLabel} />
            <LinkButton
              href="https://wise.com/pay/me/norbertok1?utm_source=quick_pay"
              label={m.wise.cta}
            />
          </div>
        );

      case "belo":
        return (
          <div className="flex flex-col gap-4 pt-1">
            <p className="text-xs text-slate-600 dark:text-obsidian-400 font-medium">{m.belo.hint}</p>
            <CopyField label={m.belo.cta} value="$nor_kru" />
          </div>
        );

      case "lemon":
        return (
          <div className="flex flex-col gap-4 pt-1">
            <p className="text-xs text-slate-600 dark:text-obsidian-400 font-medium">{m.lemon.hint}</p>
            <CopyField label={m.lemon.cta} value="$nor_kru" />
          </div>
        );

      case "buenbit":
        return (
          <div className="flex flex-col gap-4 pt-1">
            <p className="text-xs text-slate-600 dark:text-obsidian-400 font-medium">{m.buenbit.hint}</p>
            <CopyField label={m.buenbit.cta} value="$norbertok" />
          </div>
        );

      case "binance":
        return (
          <div className="flex flex-col gap-4 pt-1">
            <QrImage src={binanceQr} alt="Binance Pay QR" hint={t.donate.scanLabel} />
            <LinkButton
              href="https://app.binance.com/uni-qr/14oF9X51"
              label={m.binance.cta}
            />
          </div>
        );
      default:
        return null;
    }
  }, [method, m, t.donate.scanLabel]);

  return content;
});

interface DonateModalProps {
  open: boolean;
  onClose: () => void;
}

export function DonateModal({ open, onClose }: DonateModalProps) {
  const t = useT();
  const [selected, setSelected] = useState<MethodId>("cafecito");

  if (!open) return null;

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-12">
      <div
        className="absolute inset-0 bg-obsidian-950/60 backdrop-blur-xl animate-in fade-in duration-500"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-obsidian-900 rounded-px shadow-lensed border border-black/[0.08] dark:border-white/[0.08] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.06] bg-slate-50/50 dark:bg-obsidian-950/30">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-px bg-prism-500 flex items-center justify-center shadow-satin shrink-0 border border-white/10">
              <Heart size={16} fill="white" className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">
                {t.donate.modalTitle}
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-obsidian-500 font-bold uppercase tracking-widest mt-0.5">
                {t.donate.modalSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-px text-slate-400 dark:text-obsidian-600 hover:text-slate-900 dark:hover:text-obsidian-100 hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-all"
          >
            <X size={16} strokeWidth={3} />
          </button>
        </div>

        <div className="flex" style={{ height: 560 }}>
          <div className="w-48 shrink-0 border-r border-black/[0.06] dark:border-white/[0.06] overflow-y-auto py-2 bg-slate-100/30 dark:bg-black/20">
            {METHOD_IDS.map((id) => {
              const info = t.donate.methods[id];
              const active = selected === id;
              return (
                <button
                  key={id}
                  onClick={() => setSelected(id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-5 py-3 text-left transition-all relative group",
                    active
                      ? "bg-white dark:bg-obsidian-800 shadow-satin border-y border-black/[0.03] dark:border-white/[0.03]"
                      : "hover:bg-black/[0.02] dark:hover:bg-white/[0.02] border-y border-transparent"
                  )}
                >
                  <span className="text-lg leading-none shrink-0 group-hover:scale-110 transition-transform">{METHOD_ICONS[id]}</span>
                  <div className="min-w-0 flex-1">
                    <div className={cn(
                      "text-[10px] font-black uppercase tracking-widest truncate",
                      active
                        ? "text-prism-600 dark:text-prism-400"
                        : "text-slate-600 dark:text-obsidian-400"
                    )}>
                      {info.label}
                    </div>
                    <div className="text-[9px] text-slate-400 dark:text-obsidian-600 font-bold uppercase tracking-tighter truncate">
                      {info.region}
                    </div>
                  </div>
                  {active && (
                    <div className="absolute right-0 top-2 bottom-2 w-1 rounded-l-full bg-prism-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto px-10 py-6 bg-white dark:bg-obsidian-950/10">
            <div className="flex items-center gap-3 mb-6 pb-3 border-b border-black/[0.03] dark:border-white/[0.03]">
              <span className="text-2xl leading-none">{METHOD_ICONS[selected]}</span>
              <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.15em]">
                {t.donate.methods[selected].label}
              </span>
            </div>
            <Detail key={selected} method={selected} />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-black/[0.06] dark:border-white/[0.06] bg-slate-50/50 dark:bg-obsidian-950/40">
          <p className="text-[9px] text-slate-500 dark:text-obsidian-600 text-center font-bold uppercase tracking-[0.1em] leading-relaxed">
            {t.donate.footer}
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
