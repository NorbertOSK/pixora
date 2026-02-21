import { memo } from "react";
import { useT } from "../lib/langStore";
import { useSplitDrag } from "../hooks/useSplitDrag";

interface SplitViewProps {
  original: string;
  processed: string | null;
  className?: string;
}

export const SplitView = memo(function SplitView({
  original,
  processed,
  className = "",
}: SplitViewProps) {
  const t = useT();

  const {
    containerRef,
    originalImgRef,
    processedImgRef,
    dividerRef,
    onDividerMouseDown,
    onDividerTouchStart,
    onDividerClick,
  } = useSplitDrag(processed);

  const checker: React.CSSProperties = {
    backgroundColor: "#2a2a2a",
    backgroundImage:
      "linear-gradient(45deg,#1e1e1e 25%,transparent 25%)," +
      "linear-gradient(-45deg,#1e1e1e 25%,transparent 25%)," +
      "linear-gradient(45deg,transparent 75%,#1e1e1e 75%)," +
      "linear-gradient(-45deg,transparent 75%,#1e1e1e 75%)",
    backgroundSize: "12px 12px",
    backgroundPosition: "0 0,0 6px,6px -6px,-6px 0",
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden select-none ${className}`}
      style={checker}
    >
      <img
        ref={originalImgRef}
        src={original}
        alt={t.split.original}
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false}
      />

      {processed && (
        <img
          ref={processedImgRef}
          src={processed}
          alt={t.split.edited}
          className="absolute inset-0 w-full h-full object-contain"
          style={{ clipPath: "inset(0 0 0 50%)" }}
          draggable={false}
        />
      )}

      {processed && (
        <div
          ref={dividerRef}
          className="absolute top-0 bottom-0"
          style={{ left: "50%", transform: "translateX(-50%)" }}
        >
          <div className="w-0.5 h-full bg-white/80 shadow-lg" />
          <button
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white shadow-xl cursor-ew-resize flex items-center justify-center ring-2 ring-violet-400/40"
            onMouseDown={onDividerMouseDown}
            onTouchStart={onDividerTouchStart}
            onClick={onDividerClick}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 2L1 6l2 4M9 2l2 4-2 4"
                stroke="#6d28d9"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}

      {processed && (
        <>
          <span className="absolute bottom-2 left-2 text-[9px] font-semibold text-white/70 bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-sm pointer-events-none">
            {t.split.original}
          </span>
          <span className="absolute bottom-2 right-2 text-[9px] font-semibold text-white bg-violet-600/80 px-1.5 py-0.5 rounded backdrop-blur-sm pointer-events-none">
            {t.split.edited}
          </span>
        </>
      )}
    </div>
  );
});
