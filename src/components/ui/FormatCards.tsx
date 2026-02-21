import { cn } from "../../lib/utils";

interface FormatOption {
  value: string;
  label: string;
  desc: string;
}

interface FormatCardsProps {
  value: string;
  onChange: (v: string) => void;
  options: FormatOption[];
}

export function FormatCards({ value, onChange, options }: FormatCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex flex-col items-center gap-0.5 p-2 rounded-lg border text-center transition-all",
            value === opt.value
              ? "border-indigo-500 bg-indigo-950/40 text-indigo-300"
              : "border-[#2a2a2a] hover:border-[#444] text-zinc-400 hover:text-zinc-200"
          )}
        >
          <span className="text-sm font-semibold">{opt.label}</span>
          <span className="text-[10px] leading-tight opacity-70">{opt.desc}</span>
        </button>
      ))}
    </div>
  );
}
