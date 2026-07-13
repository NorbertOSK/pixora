export const GITHUB_LATEST_RELEASE_URL =
  "https://api.github.com/repos/NorbertOSK/pixora/releases/latest";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export type GithubRelease = {
  tag_name: string;
  html_url: string;
  name?: string;
  published_at?: string;
  prerelease?: boolean;
};

export type UpdateNoticeStorage = {
  lastDismissedTag: string;
  lastDismissedAt: number;
};

function parseSemver(input: string): [number, number, number] | null {
  // Strip pre-release (-beta.1) and build metadata (+build.5) suffixes so
  // tags like "v1.3.0-beta" or "1.3.0+abc123" still parse to a numeric core.
  // Actual pre-releases are already excluded upstream via the `prerelease`
  // flag on the GitHub release payload, so tolerant parsing here is safe.
  const normalized = normalizeVersion(input).split(/[-+]/)[0];

  if (!/^\d+(\.\d+){0,2}$/.test(normalized)) {
    return null;
  }

  const parts = normalized.split(".").map((part) => Number(part));
  while (parts.length < 3) {
    parts.push(0);
  }

  if (parts.some((part) => Number.isNaN(part))) {
    return null;
  }

  return [parts[0], parts[1], parts[2]];
}

export function normalizeVersion(input: string): string {
  const trimmed = input.trim();
  // Release tags in this repo look like "pixora-v1.2.0" (see
  // .github/workflows/release.yml), not a bare "v1.2.0". Extract from the
  // first digit run onward so any prefix (repo name, "v", etc.) is dropped,
  // while keeping a trailing pre-release/build suffix for display purposes.
  const match = trimmed.match(/\d+(?:\.\d+){1,2}(?:[-+][0-9A-Za-z.]+)?/);
  return match ? match[0] : trimmed.replace(/^v/i, "");
}

export function compareSemver(a: string, b: string): number | null {
  const parsedA = parseSemver(a);
  const parsedB = parseSemver(b);

  if (!parsedA || !parsedB) {
    return null;
  }

  for (let i = 0; i < 3; i++) {
    if (parsedA[i] > parsedB[i]) return 1;
    if (parsedA[i] < parsedB[i]) return -1;
  }

  return 0;
}

export async function fetchLatestRelease(signal?: AbortSignal): Promise<GithubRelease | null> {
  let response: Response;

  try {
    response = await fetch(GITHUB_LATEST_RELEASE_URL, {
      signal,
      headers: {
        Accept: "application/vnd.github+json",
      },
    });
  } catch (error) {
    console.warn("[updateChecker] failed to reach GitHub releases API:", error);
    return null;
  }

  if (!response.ok) {
    console.warn(`[updateChecker] GitHub releases API returned ${response.status}`);
    return null;
  }

  const payload: unknown = await response.json();

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const release = payload as Partial<GithubRelease>;

  if (release.prerelease) {
    return null;
  }

  if (typeof release.tag_name !== "string" || typeof release.html_url !== "string") {
    return null;
  }

  return {
    tag_name: release.tag_name,
    html_url: release.html_url,
    name: typeof release.name === "string" ? release.name : undefined,
    published_at: typeof release.published_at === "string" ? release.published_at : undefined,
    prerelease: Boolean(release.prerelease),
  };
}

export function shouldShowUpdateModal(
  tagName: string,
  now: number,
  storageData: UpdateNoticeStorage | null
): boolean {
  if (!storageData) {
    return true;
  }

  if (storageData.lastDismissedTag !== tagName) {
    return true;
  }

  return now - storageData.lastDismissedAt >= ONE_DAY_MS;
}
