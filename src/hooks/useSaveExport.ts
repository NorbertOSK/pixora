import { useEffect, useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useImageStore } from "../lib/store";
import { useProgressStore } from "../lib/progressStore";
import { useT } from "../lib/langStore";

export function useSaveExport() {
    const t = useT();
    const { images, pipeline } = useImageStore();
    const [saving, setSaving] = useState(false);

    const { startProgress, updateProgress, stopProgress } = useProgressStore();

    const doneImages = images.filter(
        (img) => img.status === "done" && img.processedTempPath
    );

    async function handleSaveAll() {
        if (doneImages.length === 0 || saving) return;
        const ext = pipeline.format === "jpeg" ? "jpg" : pipeline.format;

        if (doneImages.length === 1) {
            const img = doneImages[0];
            const filePath = await save({
                defaultPath: img.fileName.replace(/\.[^.]+$/, `.${ext}`),
                filters: [{ name: "Image", extensions: [ext] }],
            });
            if (!filePath) return;
            setSaving(true);
            try {
                await invoke("copy_file", {
                    src: img.processedTempPath!,
                    dest: filePath,
                });
            } catch (err) {
                console.error(err);
            }
            setSaving(false);
            return;
        }

        const filePath = await save({
            defaultPath: "pixora_export.zip",
            filters: [{ name: "ZIP", extensions: ["zip"] }],
        });
        if (!filePath) return;

        startProgress(t.actions.generatingZip, t.actions.compressingSubtitle);
        setSaving(true);
        try {
            const files = doneImages.map((img) => ({
                path: img.processedTempPath!,
                name: img.fileName.replace(/\.[^.]+$/, `.${ext}`),
            }));

            // Escuchar para cambiar el subtítulo a "Finalizando..." cuando llegue al final
            const unlisten = await listen<number>("zip-progress", (event) => {
                if (event.payload >= 100) {
                    updateProgress(100, t.actions.finalizingSubtitle);
                } else {
                    updateProgress(event.payload);
                }
            });

            await invoke("create_zip", { files, destPath: filePath });
            unlisten();
        } catch (err) {
            console.error(err);
        }
        setSaving(false);
        stopProgress();
    }

    async function handleSaveIndividual() {
        if (doneImages.length === 0 || saving) return;
        setSaving(true);
        const ext = pipeline.format === "jpeg" ? "jpg" : pipeline.format;
        for (const img of doneImages) {
            const filePath = await save({
                defaultPath: img.fileName.replace(/\.[^.]+$/, `.${ext}`),
                filters: [{ name: "Image", extensions: [ext] }],
            });
            if (filePath) {
                try {
                    await invoke("copy_file", {
                        src: img.processedTempPath!,
                        dest: filePath,
                    });
                } catch (err) {
                    console.error(err);
                }
            }
        }
        setSaving(false);
    }

    return { saving, doneImages, handleSaveAll, handleSaveIndividual };
}
