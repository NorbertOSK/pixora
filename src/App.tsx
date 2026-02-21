import { useFileDrop } from "./hooks/useFileDrop";
import { useImageStore } from "./lib/store";
import { Header } from "./components/Header";
import { SettingsPanel } from "./components/SettingsPanel";
import { ImageGrid } from "./components/ImageGrid";
import { ActionsPanel } from "./components/ActionsPanel";
import "./lib/themeStore";

export default function App() {
  const { isDragActive, handleOpenFile } = useFileDrop();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100 dark:bg-[#0c0b18]">
      <Header onOpenFile={handleOpenFile} />
      <div className="flex flex-1 min-h-0">
        <SettingsPanel />
        <ImageGrid isDragActive={isDragActive} onOpenFile={handleOpenFile} />
        <ActionsPanel />
      </div>
    </div>
  );
}
