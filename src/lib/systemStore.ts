import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

interface RawSystemInfo {
  cpu_count: number;
  cpu_usage: number;
  memory_total_mb: number;
  memory_used_mb: number;
}

interface SystemStore {
  cpuCount: number;
  cpuUsage: number;
  memoryTotalMb: number;
  memoryUsedMb: number;
  optimalConcurrency: number;
  ready: boolean;
  refresh: () => Promise<void>;
  startPolling: () => () => void;
}

function computeConcurrency(cores: number, cpuLoad: number): number {
  const base = Math.max(2, Math.min(Math.floor(cores * 0.70), 16));

  if (cpuLoad < 25) return base;
  if (cpuLoad < 50) return Math.max(2, Math.floor(base * 0.80));
  if (cpuLoad < 70) return Math.max(2, Math.floor(base * 0.55));
  return 2;
}

const INITIAL_CORES = navigator.hardwareConcurrency || 4;
const INITIAL_CONCURRENCY = computeConcurrency(INITIAL_CORES, 0);

export const useSystemStore = create<SystemStore>((set, get) => ({
  cpuCount: INITIAL_CORES,
  cpuUsage: 0,
  memoryTotalMb: 0,
  memoryUsedMb: 0,
  optimalConcurrency: INITIAL_CONCURRENCY,
  ready: false,

  refresh: async () => {
    try {
      const info = await invoke<RawSystemInfo>("get_system_info");
      set({
        cpuCount: info.cpu_count,
        cpuUsage: info.cpu_usage,
        memoryTotalMb: info.memory_total_mb,
        memoryUsedMb: info.memory_used_mb,
        optimalConcurrency: computeConcurrency(info.cpu_count, info.cpu_usage),
        ready: true,
      });
    } catch {
      set({ optimalConcurrency: INITIAL_CONCURRENCY, ready: true });
    }
  },

  startPolling: () => {
    get().refresh();
    const id = window.setInterval(() => get().refresh(), 3_000);
    return () => window.clearInterval(id);
  },
}));
