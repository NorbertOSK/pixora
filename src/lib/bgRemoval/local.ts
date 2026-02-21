import { removeBackground, type Config } from "@imgly/background-removal";

export type ProgressCallback = (stage: string, current: number, total: number) => void;

export async function removeBackgroundLocal(
  imageDataUrl: string,
  onProgress?: ProgressCallback
): Promise<string> {
  const config: Config = {
    model: "isnet",
    proxyToWorker: true,
    device: "cpu",
    output: {
      format: "image/png",
      quality: 1.0,
    },
    progress: (key: string, current: number, total: number) => {
      onProgress?.(key, current, total);
    },
  };

  const resultBlob = await removeBackground(imageDataUrl, config);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(resultBlob);
  });
}
