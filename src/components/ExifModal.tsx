import { useState, useEffect } from "react";
import { X, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useT } from "../lib/langStore";

interface ExifField { tag: string; value: string; }
interface ExifInfo { hasMetadata: boolean; fields: ExifField[]; }

interface ExifModalProps {
  dataUrl: string;
  fileName: string;
  onClose: () => void;
}

const SENSITIVE = new Set([
  "GPSLatitude", "GPSLongitude", "GPSAltitude",
  "GPSLatitudeRef", "GPSLongitudeRef", "GPSAltitudeRef",
]);

export function ExifModal({ dataUrl, fileName, onClose }: ExifModalProps) {
  const t = useT();
  const [info, setInfo] = useState<ExifInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    invoke<ExifInfo>("read_exif", { dataUrl })
      .then(setInfo)
      .catch(() => setInfo({ hasMetadata: false, fields: [] }))
      .finally(() => setLoading(false));
  }, [dataUrl]);

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-[#13102a] border border-black/[0.08] dark:border-white/[0.10] rounded-2xl w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white text-sm">{t.exifModal.title}</h2>
            <p className="text-[10px] text-slate-500 dark:text-white/50 mt-0.5 truncate max-w-[280px]">{fileName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/80 transition-colors p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex items-center justify-center py-8 gap-2 text-slate-500 dark:text-white/50">
              <Loader2 size={16} className="animate-spin text-violet-500" />
              <span className="text-sm">{t.exifModal.analyzing}</span>
            </div>
          )}

          {!loading && info && !info.hasMetadata && (
            <div className="flex items-center gap-3 py-6 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck size={20} />
              <div>
                <p className="text-sm font-medium">{t.exifModal.noMetadata}</p>
                <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">{t.exifModal.noMetadataDesc}</p>
              </div>
            </div>
          )}

          {!loading && info && info.hasMetadata && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 mb-3">
                <AlertCircle size={14} />
                <span className="text-xs font-medium">
                  {t.exifModal.fieldsFound(info.fields.length)}
                </span>
              </div>
              {info.fields.map((field) => {
                const isSensitive = SENSITIVE.has(field.tag);
                return (
                  <div
                    key={field.tag}
                    className={`flex justify-between gap-3 py-1.5 px-2 rounded-lg text-xs ${
                      isSensitive
                        ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30"
                        : "bg-black/[0.03] dark:bg-white/[0.04]"
                    }`}
                  >
                    <span className={isSensitive ? "text-red-600 dark:text-red-300 font-medium" : "text-slate-500 dark:text-white/55"}>
                      {t.exifModal.tags[field.tag] ?? field.tag}
                      {isSensitive && (
                        <span className="ml-1 text-[9px] bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 px-1 rounded">
                          {t.exifModal.sensitiveTag}
                        </span>
                      )}
                    </span>
                    <span className="text-slate-700 dark:text-white/80 text-right max-w-[55%] truncate">
                      {field.value}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
