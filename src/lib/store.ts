import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ImageItem {
  id: string;
  originalDataUrl: string;
  processedTempPath: string | null;
  processedDataUrl: string | null;
  fileName: string;
  status: "idle" | "pending" | "processing" | "done" | "error";
  error?: string;
}

export interface PipelineSettings {
  format: "jpeg" | "webp" | "png";
  quality: number;
  resizeEnabled: boolean;
  resizeMaxPx: number;
  resizeCustomH: number;
  removeBgEnabled: boolean;
  stripExifEnabled: boolean;
}

interface ImageStore {
  images: ImageItem[];
  selectedIds: string[];
  activeImageId: string | null;
  pipeline: PipelineSettings;
  isProcessing: boolean;
  processingLabel: string;
  modelDownloading: boolean;
  modelReady: boolean;

  addImages: (items: { dataUrl: string; name: string }[]) => void;
  setActiveImage: (id: string) => void;
  updateImage: (id: string, patch: Partial<ImageItem>) => void;
  removeImage: (id: string) => void;
  clearAll: () => void;

  toggleSelect: (id: string) => void;
  selectAll: () => void;
  selectNone: () => void;

  setPipeline: (patch: Partial<PipelineSettings>) => void;

  setProcessing: (v: boolean, label?: string) => void;
  setModelDownloading: (v: boolean) => void;
  setModelReady: (v: boolean) => void;
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

const DEFAULT_PIPELINE: PipelineSettings = {
  format: "webp",
  quality: 80,
  resizeEnabled: false,
  resizeMaxPx: 1920,
  resizeCustomH: 0,
  removeBgEnabled: false,
  stripExifEnabled: false,
};

export const useImageStore = create<ImageStore>()(
  persist(
    (set, get) => ({
      images: [],
      selectedIds: [],
      activeImageId: null,
      pipeline: DEFAULT_PIPELINE,
      isProcessing: false,
      processingLabel: "Procesando...",
      modelDownloading: false,
      modelReady: false,

      addImages: (items) => {
        const newImgs: ImageItem[] = items.map((it) => ({
          id: makeId(),
          originalDataUrl: it.dataUrl,
          processedTempPath: null,
          processedDataUrl: null,
          fileName: it.name,
          status: "idle",
        }));
        set((s) => ({
          images: [...s.images, ...newImgs],
          activeImageId: s.activeImageId ?? newImgs[0]?.id ?? null,
        }));
      },

      setActiveImage: (id) => set({ activeImageId: id }),

      updateImage: (id, patch) =>
        set((s) => ({
          images: s.images.map((img) =>
            img.id === id ? { ...img, ...patch } : img
          ),
        })),

      removeImage: (id) =>
        set((s) => {
          const remaining = s.images.filter((img) => img.id !== id);
          return {
            images: remaining,
            selectedIds: s.selectedIds.filter((sid) => sid !== id),
            activeImageId:
              s.activeImageId === id
                ? (remaining[0]?.id ?? null)
                : s.activeImageId,
          };
        }),

      clearAll: () =>
        set({ images: [], selectedIds: [], activeImageId: null }),

      toggleSelect: (id) =>
        set((s) => ({
          selectedIds: s.selectedIds.includes(id)
            ? s.selectedIds.filter((sid) => sid !== id)
            : [...s.selectedIds, id],
        })),

      selectAll: () =>
        set((s) => ({ selectedIds: s.images.map((img) => img.id) })),

      selectNone: () => set({ selectedIds: [] }),

      setPipeline: (patch) =>
        set((s) => ({ pipeline: { ...s.pipeline, ...patch } })),

      setProcessing: (v, label = "Procesando...") =>
        set({ isProcessing: v, processingLabel: label }),

      setModelDownloading: (v) => set({ modelDownloading: v }),

      setModelReady: (v) => set({ modelReady: v }),
    }),
    {
      name: "pixora-prefs",
      partialize: (s) => ({
        pipeline: {
          format: s.pipeline.format,
          quality: s.pipeline.quality,
          resizeMaxPx: s.pipeline.resizeMaxPx,
          resizeCustomH: s.pipeline.resizeCustomH,
        },
      }),
      merge: (persisted: unknown, current) => ({
        ...current,
        pipeline: {
          ...current.pipeline,
          ...((persisted as { pipeline?: Partial<PipelineSettings> })?.pipeline ?? {}),
        },
      }),
    }
  )
);

export const useActiveImage = () => {
  const { images, activeImageId } = useImageStore();
  return images.find((img) => img.id === activeImageId) ?? null;
};
