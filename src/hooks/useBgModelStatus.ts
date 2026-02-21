import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useImageStore } from "../lib/store";

export function useBgModelStatus() {
    const { modelDownloading, modelReady, setModelDownloading, setModelReady } =
        useImageStore();

    useEffect(() => {
        invoke<boolean>("check_bg_model_exists")
            .then((exists) => setModelReady(exists))
            .catch(() => { });
    }, [setModelReady]);

    useEffect(() => {
        const unlisteners: (() => void)[] = [];

        listen<boolean>("bg-model-downloading", () => {
            setModelDownloading(true);
        }).then((fn) => unlisteners.push(fn));

        listen<boolean>("bg-model-downloaded", () => {
            setModelDownloading(false);
            setModelReady(true);
        }).then((fn) => unlisteners.push(fn));

        return () => unlisteners.forEach((fn) => fn());
    }, [setModelDownloading, setModelReady]);

    return { modelDownloading, modelReady };
}
