import { useFileDrop } from "./hooks/useFileDrop";
import { useImageStore } from "./lib/store";
import { Header } from "./components/Header";
import { SettingsPanel } from "./components/SettingsPanel";
import { ImageGrid } from "./components/ImageGrid";
import { ActionsPanel } from "./components/ActionsPanel";
import { LoadingOverlay } from "./components/ui/LoadingOverlay";
import { useSaveExport } from "./hooks/useSaveExport";
import { useT } from "./lib/langStore";
import "./lib/themeStore";

import { useProgressStore } from "./lib/progressStore";

export default function App() {
  const { isDragActive, handleOpenFile } = useFileDrop();
  const { isBusy, progress, message, subtitle } = useProgressStore();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-obsidian-950 text-slate-900 dark:text-obsidian-100">
      {isBusy && (
        <LoadingOverlay
          progress={progress}
          message={message}
          subtitle={subtitle}
        />
      )}
      <Header onOpenFile={handleOpenFile} />
      <div className="flex flex-1 min-h-0 relative">
        {/* Decorative Background Glows */}
        <div className="absolute top-0 left-[320px] right-[200px] bottom-0 pointer-events-none overflow-hidden opacity-0 dark:opacity-100">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-prism-500/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-prism-500/5 blur-[120px] rounded-full" />
        </div>

        <SettingsPanel />
        <ImageGrid isDragActive={isDragActive} onOpenFile={handleOpenFile} />
        <ActionsPanel />
      </div>
    </div>
  );
}
