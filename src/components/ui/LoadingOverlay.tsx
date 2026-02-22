import { Loader2 } from "lucide-react";
import { useT } from "../../lib/langStore";

interface LoadingOverlayProps {
    progress: number;
    message?: string;
    subtitle?: string;
}

export function LoadingOverlay({ progress, message, subtitle }: LoadingOverlayProps) {
    const t = useT();
    const displayMessage = message || t.actions.generatingZip;
    const displaySubtitle = subtitle || (progress === 100 ? "Finalizing..." : "Compressing files");

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-obsidian-950/60 backdrop-blur-xl animate-in fade-in duration-500">
            <div className="bg-white dark:bg-obsidian-900 shadow-lensed rounded-px p-10 flex flex-col items-center gap-8 border border-black/[0.1] dark:border-white/[0.05] max-w-sm w-full mx-4 relative overflow-hidden">
                {/* Decorative Background Glows */}
                <div className="absolute top-0 left-0 w-full h-1 bg-prism-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" />

                <div className="relative flex items-center justify-center">
                    {/* Glow behind circle */}
                    <div className="absolute inset-0 bg-prism-500 blur-2xl opacity-10 animate-pulse" />

                    <svg className="w-28 h-28 transform -rotate-90 relative">
                        <circle
                            cx="56"
                            cy="56"
                            r="48"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="transparent"
                            className="text-slate-100 dark:text-obsidian-800"
                        />
                        <circle
                            cx="56"
                            cy="56"
                            r="48"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="transparent"
                            strokeDasharray={301.6}
                            strokeDashoffset={301.6 - (301.6 * progress) / 100}
                            className="text-prism-500 transition-all duration-300 ease-out"
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
                        <span className="text-2xl font-black tabular-nums text-slate-800 dark:text-white">
                            {progress}<span className="text-[10px] opacity-40 ml-0.5">%</span>
                        </span>
                    </div>
                </div>

                <div className="space-y-3 text-center opacity-80">
                    <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-[0.2em]">
                        {displayMessage}
                    </h3>
                    <div className="flex items-center justify-center gap-2.5">
                        <Loader2 size={12} className="animate-spin text-prism-500" strokeWidth={3} />
                        <span className="text-[10px] text-slate-500 dark:text-obsidian-500 font-bold uppercase tracking-widest">
                            {displaySubtitle}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
