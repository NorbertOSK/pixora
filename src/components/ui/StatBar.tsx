import { cn } from "../../lib/utils";

interface StatBarProps {
    label: string;
    value: string;
    max?: string;
    pct: number;
}

export function StatBar({ label, value, max, pct }: StatBarProps) {
    const color =
        pct < 70 ? "bg-prism-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" : pct < 85 ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]";

    return (
        <div className="space-y-1.5">
            <div className="flex justify-between items-center px-0.5">
                <span className="text-[9px] font-black text-slate-500 dark:text-obsidian-500 uppercase tracking-[0.15em]">
                    {label}
                </span>
                <span className="text-[10px] text-slate-700 dark:text-obsidian-200 font-black tabular-nums tracking-tight">
                    {value}
                    {max ? (
                        <span className="text-slate-400 dark:text-obsidian-700 font-bold ml-1">/ {max}</span>
                    ) : null}
                </span>
            </div>
            <div className="h-1 rounded-full bg-black/[0.06] dark:bg-white/[0.06] overflow-hidden">
                <div
                    className={cn("h-full transition-all duration-1000 ease-out", color)}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                />
            </div>
        </div>
    );
}
