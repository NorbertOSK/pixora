import { useRef, useEffect, useCallback } from "react";

export function useSplitDrag(processed: string | null) {
    const containerRef = useRef<HTMLDivElement>(null);
    const originalImgRef = useRef<HTMLImageElement>(null);
    const processedImgRef = useRef<HTMLImageElement>(null);
    const dividerRef = useRef<HTMLDivElement>(null);
    const draggingRef = useRef(false);

    const applyPosition = useCallback((pct: number) => {
        const p = Math.min(Math.max(pct, 2), 98);
        if (originalImgRef.current)
            originalImgRef.current.style.clipPath = `inset(0 ${100 - p}% 0 0)`;
        if (processedImgRef.current)
            processedImgRef.current.style.clipPath = `inset(0 0 0 ${p}%)`;
        if (dividerRef.current)
            dividerRef.current.style.left = `${p}%`;
    }, []);

    useEffect(() => {
        if (processed) {
            applyPosition(50);
        } else {
            if (originalImgRef.current) originalImgRef.current.style.clipPath = "";
            if (dividerRef.current) dividerRef.current.style.left = "50%";
        }
    }, [processed, applyPosition]);

    useEffect(() => {
        const getPercent = (clientX: number) => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return 50;
            return ((clientX - rect.left) / rect.width) * 100;
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!draggingRef.current) return;
            applyPosition(getPercent(e.clientX));
        };
        const onTouchMove = (e: TouchEvent) => {
            if (!draggingRef.current) return;
            applyPosition(getPercent(e.touches[0].clientX));
        };
        const onUp = () => { draggingRef.current = false; };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onUp);
        window.addEventListener("touchmove", onTouchMove, { passive: true });
        window.addEventListener("touchend", onUp);

        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onUp);
            window.removeEventListener("touchmove", onTouchMove);
            window.removeEventListener("touchend", onUp);
        };
    }, [applyPosition]);

    const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        draggingRef.current = true;
    }, []);

    const onDividerTouchStart = useCallback((e: React.TouchEvent) => {
        e.stopPropagation();
        draggingRef.current = true;
    }, []);

    const onDividerClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
    }, []);

    return {
        containerRef,
        originalImgRef,
        processedImgRef,
        dividerRef,
        onDividerMouseDown,
        onDividerTouchStart,
        onDividerClick,
    };
}
