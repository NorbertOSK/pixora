export type ProgressCallback = (stage: string, current: number, total: number) => void;

export async function removeBackgroundLocal(
  imageDataUrl: string,
  onProgress?: ProgressCallback
): Promise<string> {
  const { removeBackground } = await import("@imgly/background-removal");

  const config = {
    model: "isnet" as const,
    proxyToWorker: true,
    device: "cpu" as const,
    output: {
      format: "image/png" as const,
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
