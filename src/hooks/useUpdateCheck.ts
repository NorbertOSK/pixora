import { useCallback, useEffect, useRef, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  compareSemver,
  fetchLatestRelease,
  normalizeVersion,
  shouldShowUpdateModal,
  type UpdateNoticeStorage,
} from "../lib/updateChecker";

const UPDATE_NOTICE_STORAGE_KEY = "pixora-update-notice";
const REQUEST_TIMEOUT_MS = 3000;

let startupCheckPromise: Promise<UpdateCheckResult> | null = null;

export type UpdateCheckResult = {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion?: string;
  releaseUrl?: string;
};

type UpdateState = {
  open: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseUrl: string;
};

function readStorage(): UpdateNoticeStorage | null {
  try {
    const raw = localStorage.getItem(UPDATE_NOTICE_STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") return null;

    const data = parsed as Partial<UpdateNoticeStorage>;

    if (typeof data.lastDismissedTag !== "string" || typeof data.lastDismissedAt !== "number") {
      return null;
    }

    return {
      lastDismissedTag: data.lastDismissedTag,
      lastDismissedAt: data.lastDismissedAt,
    };
  } catch {
    return null;
  }
}

function writeStorage(data: UpdateNoticeStorage) {
  try {
    localStorage.setItem(UPDATE_NOTICE_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // noop
  }
}

async function runStartupCheck(): Promise<UpdateCheckResult> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const [currentVersion, latestRelease] = await Promise.all([
      getVersion(),
      fetchLatestRelease(controller.signal).catch(() => null),
    ]);

    if (!latestRelease) {
      return {
        hasUpdate: false,
        currentVersion: normalizeVersion(currentVersion),
      };
    }

    const comparison = compareSemver(latestRelease.tag_name, currentVersion);

    if (comparison === null || comparison <= 0) {
      return {
        hasUpdate: false,
        currentVersion: normalizeVersion(currentVersion),
      };
    }

    return {
      hasUpdate: true,
      currentVersion: normalizeVersion(currentVersion),
      latestVersion: normalizeVersion(latestRelease.tag_name),
      releaseUrl: latestRelease.html_url,
    };
  } catch {
    return {
      hasUpdate: false,
      currentVersion: "",
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

export function useUpdateCheck() {
  const [state, setState] = useState<UpdateState>({
    open: false,
    currentVersion: "",
    latestVersion: "",
    releaseUrl: "",
  });

  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    let active = true;

    if (!startupCheckPromise) {
      startupCheckPromise = runStartupCheck();
    }

    startupCheckPromise
      .then((result) => {
        if (!active || !result.hasUpdate || !result.latestVersion || !result.releaseUrl) {
          return;
        }

        const storage = readStorage();
        const now = Date.now();

        if (!shouldShowUpdateModal(result.latestVersion, now, storage)) {
          return;
        }

        setState({
          open: true,
          currentVersion: result.currentVersion,
          latestVersion: result.latestVersion,
          releaseUrl: result.releaseUrl,
        });
      })
      .catch(() => {
        // fail silent
      });

    return () => {
      active = false;
    };
  }, []);

  const dismiss = useCallback(() => {
    setState((prev) => {
      if (prev.latestVersion) {
        writeStorage({
          lastDismissedTag: prev.latestVersion,
          lastDismissedAt: Date.now(),
        });
      }

      return {
        ...prev,
        open: false,
      };
    });
  }, []);

  const openRelease = useCallback(async () => {
    const url = state.releaseUrl;
    dismiss();

    if (!url) return;

    try {
      await openUrl(url);
    } catch {
      // fail silent
    }
  }, [dismiss, state.releaseUrl]);

  return {
    isOpen: state.open,
    currentVersion: state.currentVersion,
    latestVersion: state.latestVersion,
    dismiss,
    openRelease,
  };
}
