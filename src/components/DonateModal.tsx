import { useState } from "react";
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

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-1">
      <p className="text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-wider font-semibold">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-black/[0.05] dark:bg-white/[0.07] border border-black/[0.08] dark:border-white/[0.10] rounded-lg px-3 py-2 text-sm font-mono text-slate-800 dark:text-white/90 select-all">
          {value}
        </code>
        <button
          onClick={handleCopy}
          className={cn(
            "p-2 rounded-lg border transition-all shrink-0",
            copied
              ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-black/[0.08] dark:border-white/[0.10] text-slate-500 dark:text-white/50 hover:text-slate-800 dark:hover:text-white/80 hover:bg-black/[0.05] dark:hover:bg-white/[0.07]"
          )}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>
    </div>
  );
}

function LinkButton({ href, label }: { href: string; label: string }) {
  return (
    <button
      onClick={() => openUrl(href)}
      className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-md shadow-violet-900/25"
    >
      <ExternalLink size={13} />
      {label}
    </button>
  );
}

function QrImage({ src, alt, hint }: { src: string; alt: string; hint: string }) {
  return (
    <div className="flex flex-col items-center gap-2 pt-1">
      <div className="p-3 bg-white rounded-2xl shadow-md border border-black/[0.06]">
        <img src={src} alt={alt} className="w-40 h-40 object-contain" />
      </div>
      <p className="text-[10px] text-slate-400 dark:text-white/35">{hint}</p>
    </div>
  );
}

function Detail({ method }: { method: MethodId }) {
  const t = useT();
  const m = t.donate.methods;

  switch (method) {
    case "cafecito":
      return (
        <div className="flex flex-col items-center gap-4 pt-3">
          <p className="text-sm text-slate-600 dark:text-white/70 text-center leading-relaxed max-w-[220px]">
            {m.cafecito.hint}
          </p>
          <button
            onClick={() => openUrl("https://cafecito.app/nkrucheski")}
            className="flex items-center gap-3 bg-[#00BCD4] hover:bg-[#00ACC1] active:bg-[#0097A7] text-white font-bold px-6 py-3 rounded-2xl transition-colors shadow-lg shadow-cyan-500/25"
          >
            <span className="text-xl">☕</span>
            <span>{m.cafecito.cta}</span>
          </button>
          <p className="text-[11px] text-slate-400 dark:text-white/35">
            cafecito.app/nkrucheski
          </p>
        </div>
      );

    case "pix":
      return (
        <div className="flex flex-col gap-3 pt-2">
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
        <div className="flex flex-col gap-3 pt-2">
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
        <div className="flex flex-col gap-4 pt-2">
          <p className="text-sm text-slate-600 dark:text-white/70">{m.belo.hint}</p>
          <CopyField label={m.belo.cta} value="$nor_kru" />
        </div>
      );

    case "lemon":
      return (
        <div className="flex flex-col gap-4 pt-2">
          <p className="text-sm text-slate-600 dark:text-white/70">{m.lemon.hint}</p>
          <CopyField label={m.lemon.cta} value="$nor_kru" />
        </div>
      );

    case "buenbit":
      return (
        <div className="flex flex-col gap-4 pt-2">
          <p className="text-sm text-slate-600 dark:text-white/70">{m.buenbit.hint}</p>
          <CopyField label={m.buenbit.cta} value="$norbertok" />
        </div>
      );

    case "binance":
      return (
        <div className="flex flex-col gap-3 pt-2">
          <QrImage src={binanceQr} alt="Binance Pay QR" hint={t.donate.scanLabel} />
          <LinkButton
            href="https://app.binance.com/uni-qr/14oF9X51"
            label={m.binance.cta}
          />
        </div>
      );
  }
}

interface DonateModalProps {
  open: boolean;
  onClose: () => void;
}

export function DonateModal({ open, onClose }: DonateModalProps) {
  const t = useT();
  const [selected, setSelected] = useState<MethodId>("cafecito");

  if (!open) return null;

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-xl bg-white dark:bg-[#13112a] rounded-2xl shadow-2xl border border-black/[0.08] dark:border-white/[0.10] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.06] dark:border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-pink-500 flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0">
              <Heart size={14} fill="white" className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {t.donate.modalTitle}
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-white/40">
                {t.donate.modalSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-all"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex" style={{ height: 460 }}>
          <div className="w-44 shrink-0 border-r border-black/[0.06] dark:border-white/[0.07] overflow-y-auto py-2">
            {METHOD_IDS.map((id) => {
              const info = t.donate.methods[id];
              const active = selected === id;
              return (
                <button
                  key={id}
                  onClick={() => setSelected(id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-all",
                    active
                      ? "bg-violet-500/10 dark:bg-violet-500/15"
                      : "hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                  )}
                >
                  <span className="text-base leading-none shrink-0">{METHOD_ICONS[id]}</span>
                  <div className="min-w-0 flex-1">
                    <div className={cn(
                      "text-xs font-semibold truncate",
                      active
                        ? "text-violet-700 dark:text-violet-300"
                        : "text-slate-600 dark:text-white/65"
                    )}>
                      {info.label}
                    </div>
                    <div className="text-[9px] text-slate-400 dark:text-white/35 truncate">
                      {info.region}
                    </div>
                  </div>
                  {active && (
                    <div className="w-1 h-5 rounded-full bg-violet-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg leading-none">{METHOD_ICONS[selected]}</span>
              <span className="text-sm font-bold text-slate-800 dark:text-white">
                {t.donate.methods[selected].label}
              </span>
            </div>
            <Detail method={selected} />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-black/[0.06] dark:border-white/[0.07] bg-black/[0.02] dark:bg-white/[0.02]">
          <p className="text-[10px] text-slate-400 dark:text-white/35 text-center">
            {t.donate.footer}
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
