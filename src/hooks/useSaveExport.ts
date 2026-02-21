import { useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useImageStore } from "../lib/store";

export function useSaveExport() {
    const { images, pipeline } = useImageStore();
    const [saving, setSaving] = useState(false);

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

        setSaving(true);
        try {
            const files = doneImages.map((img) => ({
                path: img.processedTempPath!,
                name: img.fileName.replace(/\.[^.]+$/, `.${ext}`),
            }));
            await invoke("create_zip", { files, destPath: filePath });
        } catch (err) {
            console.error(err);
        }
        setSaving(false);
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
