import { create } from "zustand";

interface ProgressState {
    isBusy: boolean;
    progress: number;
    message: string;
    subtitle: string;

    startProgress: (message: string, subtitle: string) => void;
    updateProgress: (progress: number, subtitle?: string) => void;
    stopProgress: () => void;
}

export const useProgressStore = create<ProgressState>((set) => ({
    isBusy: false,
    progress: 0,
    message: "",
    subtitle: "",

    startProgress: (message, subtitle) => set({ isBusy: true, progress: 0, message, subtitle }),
    updateProgress: (progress, subtitle) => set((state) => ({
        progress,
        subtitle: subtitle || state.subtitle
    })),
    stopProgress: () => set({ isBusy: false, progress: 0, message: "", subtitle: "" }),
}));
