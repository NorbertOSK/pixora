import { cn } from "../../lib/utils";

interface StatBarProps {
    label: string;
    value: string;
    max?: string;
    pct: number;
}

export function StatBar({ label, value, max, pct }: StatBarProps) {
    const color =
        pct < 50 ? "bg-emerald-500" : pct < 75 ? "bg-amber-500" : "bg-red-500";

    return (
        <div className="space-y-0.5">
            <div className="flex justify-between items-baseline">
                <span className="text-[9px] font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider">
                    {label}
                </span>
                <span className="text-[9px] text-slate-600 dark:text-white/55 font-mono">
                    {value}
                    {max ? (
                        <span className="text-slate-400 dark:text-white/30"> / {max}</span>
                    ) : null}
                </span>
            </div>
            <div className="h-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                    className={cn("h-full rounded-full transition-all duration-700", color)}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                />
            </div>
        </div>
    );
}
