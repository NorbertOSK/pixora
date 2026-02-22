import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useImageStore } from "../lib/store";
import { useSystemStore } from "../lib/systemStore";
import { listen } from "@tauri-apps/api/event";
import { useProgressStore } from "../lib/progressStore";
import { useT } from "../lib/langStore";

const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "tiff", "tif", "bmp"];

export function useFileDrop() {
    const t = useT();
    const { addImages } = useImageStore();
    const { refresh: refreshSystemStats } = useSystemStore();
    const [isDragActive, setIsDragActive] = useState(false);

    const { startProgress, updateProgress, stopProgress } = useProgressStore();

    const processFiles = async (paths: string[]) => {
        if (paths.length === 0) return;

        const imagePaths = paths.filter((p) => {
            const ext = p.split(".").pop()?.toLowerCase() ?? "";
            return ALLOWED_EXTENSIONS.includes(ext);
        });

        if (imagePaths.length === 0) return;

        startProgress(t.actions.importingImages, t.actions.importingSubtitle);

        // Suscribirse a las nuevas imágenes que envía Rust
        const unlistenImage = await listen<{ path: string; name: string }>("import-new-image", (event) => {
            const { path, name } = event.payload;
            addImages([{
                name: path.split(/[/\\]/).pop() || path,
                dataUrl: name
            }]);
        });

        // Escuchar progreso desde Rust
        const unlistenProgress = await listen<number>("import-progress", (event) => {
            updateProgress(event.payload);
        });

        try {
            // Invocar comando (ahora es no bloqueante y envía por eventos)
            await invoke("import_images_batch", { paths: imagePaths });
        } catch (err) {
            console.error("Error importing images:", err);
        } finally {
            unlistenImage();
            unlistenProgress();
            stopProgress();
        }
    };

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
                await processFiles(paths);
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
    }, []);

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
        await processFiles(paths);
    }, []);

    return { isDragActive, handleOpenFile };
}
