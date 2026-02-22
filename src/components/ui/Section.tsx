import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

interface SectionProps {
    title: string;
    badge?: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    disabled?: boolean;
}

export function Section({
    title,
    badge,
    children,
    defaultOpen = true,
    disabled = false,
}: SectionProps) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className={cn("border-b border-black/[0.06] dark:border-white/[0.07]", disabled && "opacity-50 pointer-events-none")}>
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-white/90">{title}</span>
                    {badge && (
                        <span className="text-[9px] font-semibold text-violet-700 dark:text-violet-300 bg-violet-500/10 dark:bg-violet-500/20 border border-violet-500/20 px-1.5 py-0.5 rounded-full">
                            {badge}
                        </span>
                    )}
                </div>
                <ChevronDown
                    size={13}
                    className={cn("text-slate-400 dark:text-white/40 transition-transform", open && "rotate-180")}
                />
            </button>
            {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
        </div>
    );
}
