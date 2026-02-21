import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useImageStore } from "../lib/store";
import { useSystemStore } from "../lib/systemStore";

const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "tiff", "tif", "bmp"];

export function useFileDrop() {
    const { addImages } = useImageStore();
    const { refresh: refreshSystemStats } = useSystemStore();
    const [isDragActive, setIsDragActive] = useState(false);

    useEffect(() => {
        const onVisible = () => {
            if (!document.hidden) {
                requestAnimationFrame(() => refreshSystemStats());
            }
        };

        document.addEventListener("visibilitychange", onVisible);
        return () => document.removeEventListener("visibilitychange", onVisible);
    }, [refreshSystemStats]);

    useEffect(() => {
        const win = getCurrentWindow();
        let cancelled = false;
        let unlistenFn: (() => void) | null = null;

        win.onDragDropEvent(async (event) => {
            const { type } = event.payload;

            if (type === "over") {
                setIsDragActive(true);
            } else if (type === "leave") {
                setIsDragActive(false);
            } else if (type === "drop") {
                setIsDragActive(false);
                const paths = (event.payload as { type: string; paths: string[] }).paths ?? [];

                const imagePaths = paths.filter((p) => {
                    const ext = p.split(".").pop()?.toLowerCase() ?? "";
                    return ALLOWED_EXTENSIONS.includes(ext);
                });

                if (imagePaths.length === 0) return;

                const items = await Promise.all(
                    imagePaths.map(async (p) => {
                        const name = p.split("/").pop() ?? p;
                        const dataUrl = await invoke<string>("load_image_file", { path: p });
                        return { dataUrl, name };
                    })
                );

                addImages(items);
            }
        }).then((fn) => {
            if (cancelled) {
                fn();
            } else {
                unlistenFn = fn;
            }
        });

        return () => {
            cancelled = true;
            unlistenFn?.();
        };
    }, [addImages]);

    const handleOpenFile = useCallback(async () => {
        const selected = await openDialog({
            multiple: true,
            filters: [
                {
                    name: "Images",
                    extensions: ALLOWED_EXTENSIONS,
                },
            ],
        });

        if (!selected) return;
        const paths = Array.isArray(selected) ? selected : [selected];

        const items = await Promise.all(
            paths.map(async (p) => {
                const name = p.split("/").pop() ?? p;
                const dataUrl = await invoke<string>("load_image_file", { path: p });
                return { dataUrl, name };
            })
        );

        addImages(items);
    }, [addImages]);

    return { isDragActive, handleOpenFile };
}
