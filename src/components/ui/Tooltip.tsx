import { useState, useEffect, ReactNode } from "react";
import { cn } from "../../lib/utils";

interface TooltipProps {
  children: ReactNode;
  content: string;
  show: boolean;
  onHide?: () => void;
  className?: string;
}

export function Tooltip({ children, content, show, onHide, className }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onHide?.();
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [show, onHide]);

  return (
    <div className="relative inline-block">
      {children}
      {visible && (
        <div
          className={cn(
            "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-bold rounded-px shadow-xl whitespace-nowrap z-50 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200",
            className
          )}
        >
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-white" />
        </div>
      )}
    </div>
  );
}
