import { useState, useRef, useCallback, startTransition } from "react";
import { useImageStore } from "../lib/store";
import { useSystemStore } from "../lib/systemStore";
import { runPipeline } from "../lib/pipeline";
import { invoke } from "@tauri-apps/api/core";

function yieldToMain(): Promise<void> {
    return new Promise<void>((resolve) => {
        const { port1, port2 } = new MessageChannel();
        port1.onmessage = () => resolve();
        port2.postMessage(null);
    });
}

export function useProcessing() {
    const { images, selectedIds, updateImage, setProcessing } = useImageStore();
    const { optimalConcurrency } = useSystemStore();

    const [busy, _setBusy] = useState(false);
    const cancelRef = useRef(false);
    const runIdRef = useRef(0);

    const setBusy = useCallback((v: boolean) => {
        _setBusy(v);
        setProcessing(v);
    }, [setProcessing]);

    const targets =
        selectedIds.length > 0
            ? images.filter((img) => selectedIds.includes(img.id))
            : images;

    function handleCancel() {
        cancelRef.current = true;
        setBusy(false);

        const { images: currentImages, updateImage: update } = useImageStore.getState();
        currentImages
            .filter((img) => img.status === "pending" || img.status === "processing")
            .forEach((img) =>
                update(img.id, {
                    status: "idle",
                    processedTempPath: null,
                    processedDataUrl: null,
                })
            );
    }

    async function handleProcess() {
        if (targets.length === 0 || busy) return;

        cancelRef.current = false;
        setBusy(true);

        const pipelineSnapshot = useImageStore.getState().pipeline;

        runIdRef.current += 1;
        const myRunId = runIdRef.current;

        const concurrency = optimalConcurrency;

        targets.forEach((img) =>
            updateImage(img.id, {
                status: "pending",
                error: undefined,
                processedTempPath: null,
                processedDataUrl: null,
            })
        );

        await yieldToMain();

        const queue = [...targets];

        const stale = () => cancelRef.current || runIdRef.current !== myRunId;

        const worker = async () => {
            while (true) {
                if (stale()) break;

                const img = queue.shift();
                if (!img) break;

                if (img.processedTempPath) {
                    invoke("delete_temp_files", {
                        paths: [img.processedTempPath],
                    }).catch(() => { });
                }

                startTransition(() => {
                    updateImage(img.id, { status: "processing" });
                });

                await yieldToMain();

                if (stale()) {
                    startTransition(() => {
                        updateImage(img.id, { status: "idle", processedTempPath: null, processedDataUrl: null });
                    });
                    break;
                }

                try {
                    const result = await runPipeline(img.originalDataUrl, pipelineSnapshot);

                    await yieldToMain();

                    if (stale()) {
                        invoke("delete_temp_files", { paths: [result.outputPath] }).catch(() => { });
                        break;
                    }

                    const displayUrl = await invoke<string>("read_temp_as_data_url", {
                        path: result.outputPath,
                    });

                    await yieldToMain();

                    if (stale()) {
                        invoke("delete_temp_files", { paths: [result.outputPath] }).catch(() => { });
                        break;
                    }

                    startTransition(() => {
                        updateImage(img.id, {
                            status: "done",
                            processedTempPath: result.outputPath,
                            processedDataUrl: displayUrl,
                        });
                    });
                } catch (err) {
                    await yieldToMain();
                    if (stale()) break;
                    startTransition(() => {
                        updateImage(img.id, {
                            status: "error",
                            error: String(err).replace(/^Error:\s*/i, ""),
                        });
                    });
                }

                await yieldToMain();
            }
        };

        await Promise.all(
            Array.from({ length: Math.min(concurrency, targets.length) }, worker)
        );

        if (runIdRef.current === myRunId) {
            useImageStore
                .getState()
                .images.filter(
                    (img) => img.status === "pending" || img.status === "processing"
                )
                .forEach((img) =>
                    startTransition(() =>
                        updateImage(img.id, { status: "idle", processedTempPath: null, processedDataUrl: null })
                    )
                );

            cancelRef.current = false;
            setBusy(false);
        } else {
            cancelRef.current = false;
        }
    }

    return { busy, targets, handleProcess, handleCancel };
}
