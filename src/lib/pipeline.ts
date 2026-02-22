import { invoke } from "@tauri-apps/api/core";
import { type PipelineSettings } from "./store";

export interface PipelineResult {
  outputPath: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export async function runPipeline(
  originalDataUrl: string,
  settings: PipelineSettings
): Promise<PipelineResult> {
  return invoke<PipelineResult>("process_image", {
    dataUrl: originalDataUrl,
    settings: {
      format: settings.format,
      quality: settings.quality,
      resizeEnabled: settings.resizeEnabled ?? false,
      resizeMaxPx: settings.resizeMaxPx,
      resizeCustomH: settings.resizeCustomH,
      removeBgEnabled: settings.removeBgEnabled ?? false,
    },
  });
}
