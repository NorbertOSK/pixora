<div align="center">
  <img src="src/assets/img/logo.png" alt="Pixora Logo" width="96" />
  <h1>Pixora</h1>
  <p><strong>Local-first image processing. No cloud. No account.</strong></p>
  <p>
    <a href="README.md">🇺🇸 English</a> &nbsp;|&nbsp;
    <a href="README.es.md">🇪🇸 Español</a> &nbsp;|&nbsp;
    <a href="README.pt-BR.md">🇧🇷 Português</a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" />
    <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg" alt="Platforms" />
    <img src="https://img.shields.io/badge/built%20with-Tauri%202-24C8D8.svg" alt="Built with Tauri" />
  </p>
</div>

---

Pixora is a free, open-source desktop app for image processing. Convert formats, resize, remove backgrounds with AI, and strip metadata — all 100% locally on your machine, with no internet required after setup.

https://github.com/user-attachments/assets/e820fe94-7afc-4fa3-8bf9-34ad5b675af0

<video src="https://res.cloudinary.com/dtwdbcfu7/video/upload/v1771787506/videos/v6qomjaytv6ti36d6dnu.mp4" autoplay loop muted playsinline controls width="100%"></video>



Built by <a href="https://norbertok.com" target="_blank">Norberto Krucheski</a>.

---

## Download

Installers are automatically built for every release via GitHub Actions.

| Platform | Download |
|---|---|
| **Windows** | [⬇ Download for Windows (.exe)](https://github.com/NorbertOSK/pixora/releases/latest) |
| **macOS** (Apple Silicon M1 or higher) | [⬇ Download for macOS (.dmg)](https://github.com/NorbertOSK/pixora/releases/latest) |
| **Linux** | [⬇ Download for Linux (.AppImage / .deb)](https://github.com/NorbertOSK/pixora/releases/latest) |

> Just download, install, and run — no account, no setup, no cloud.

---

## Features

| Feature | Details |
|---|---|
| **Format Conversion** | Convert between WebP, JPEG, and PNG |
| **Quality Control** | Adjustable quality slider (1–100%) |
| **Smart Resize** | 10 built-in presets (hero, blog, avatar, 4K…) + custom dimensions. Aspect ratio always preserved. |
| **EXIF & Metadata** | View full metadata (camera, GPS, date, exposure…) and strip it cleanly |
| **AI Background Removal** | Local ONNX model — no API key needed. Downloads ~42 MB once, then works offline forever |
| **Bulk Processing** | Process multiple images in parallel. Export all as a ZIP archive |
| **Before / After View** | Interactive split-view slider to compare original and processed images |
| **Multilingual UI** | English, Spanish, and Portuguese — switch from the header |
| **Dark / Light Mode** | System-friendly theme toggle |

---

## How It Works — Architecture

Pixora is built with three layers that each do what they're best at.

### React (TypeScript) — The Interface

The entire UI is a React 18 app. All the panels, sliders, image grid, and before/after view are React components. React handles state updates and re-renders as images get processed, but it never touches an image file directly — that's Rust's job.

### Rust — The Engine

Every image operation runs in Rust, compiled to native code:

- **Resize** — Lanczos3 filter, mathematically sharp results
- **Format conversion** — WebP, JPEG (with quality control), PNG
- **EXIF stripping** — by re-encoding from scratch, so no metadata can survive
- **Background removal** — ONNX model inference (IS-Net), runs entirely on CPU
- **File I/O** — reading dropped files, writing output, creating ZIP archives

Rust runs at near-C speed with no garbage collector, which means no pauses or unpredictable delays. Multiple images are processed in parallel using a worker pool sized to the machine's available CPU cores. On an M-series Mac, this means a batch of 8 images finishes in about the same time as processing 1.

### Tauri 2 — The Bridge

Tauri wraps the React app in a native window using the system's own WebView (WebKit on macOS, WebView2 on Windows). It exposes a command API so JavaScript can call Rust functions over a lightweight IPC channel.

**Key performance decision:** passing full images as base64 through IPC would block the JS thread on every call. Instead, all processing runs in Rust and only a temp file path (under 200 bytes) is returned. The frontend reads that file once for display. This is why batch processing stays smooth even with large images.

---

## AI Background Removal

Uses IS-Net (quantized), an open ONNX model. Downloaded once (~42 MB) on first use, then works fully offline.

The model is cached at:

| OS | Location |
|---|---|
| macOS | `~/Library/Application Support/pixora/` |
| Windows | `%LOCALAPPDATA%\pixora\` |
| Linux | `~/.local/share/pixora/` |

> On macOS, if you don't find it there, check `~/Library/Caches/pixora/` — the app falls back to the cache directory if Application Support is unavailable.

---

## Build from Source

### Prerequisites

- <a href="https://bun.sh/" target="_blank">Bun</a> (used as the package manager and script runner)
- <a href="https://rustup.rs/" target="_blank">Rust</a> (latest stable)

### macOS — extra step

```bash
xcode-select --install
```

### Windows — extra steps

- <a href="https://visualstudio.microsoft.com/visual-cpp-build-tools/" target="_blank">Microsoft C++ Build Tools</a>
- <a href="https://developer.microsoft.com/en-us/microsoft-edge/webview2/" target="_blank">WebView2</a> (already included in Windows 11)

### Linux — Ubuntu / Debian

```bash
sudo apt update && sudo apt install -y \
  libwebkit2gtk-4.1-dev build-essential curl wget file \
  libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

### Linux — Fedora / RHEL

```bash
sudo dnf install -y \
  webkit2gtk4.1-devel openssl-devel curl wget file \
  libappindicator-gtk3-devel librsvg2-devel
```

---

### Install & Run

```bash
git clone https://github.com/NorbertOSK/pixora.git
cd pixora
bun install
bun start
```

> The first run compiles the Rust backend — this takes a few minutes. After that, startup is fast.

`bun start` launches the full dev environment: Vite serves the React app with hot reload, and Tauri opens it in a native window connected to the Rust backend.

### Build a Native Installer

```bash
bun run dist
```

This compiles the React app, then builds the full native installer for your current OS:

| Platform | Output |
|---|---|
| macOS | `src-tauri/target/release/bundle/macos/Pixora.app` and `.dmg` |
| Windows | `src-tauri/target/release/bundle/msi/Pixora.msi` and `.exe` |
| Linux | `src-tauri/target/release/bundle/deb/Pixora.deb` and `.AppImage` |

> Cross-compilation is not supported — run this command on the OS you want to build for.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop framework | <a href="https://tauri.app/" target="_blank">Tauri 2</a> — Rust + native WebView |
| Frontend | React 18 + TypeScript |
| Bundler | Vite 5 |
| Styling | Tailwind CSS |
| State | Zustand |
| Image processing | Rust `image` crate (resize, compress, convert) |
| Metadata | `kamadak-exif` (read / strip EXIF) |
| AI inference | `ort` (ONNX Runtime for Rust) + IS-Net model |
| Zip export | `zip` crate (written entirely in Rust) |

---

## Project Structure

```
pixora/
├── src/                  # React + TypeScript frontend
│   ├── components/       # UI components
│   ├── lib/              # Stores, pipeline bridge, i18n
│   └── App.tsx
├── src-tauri/            # Rust backend
│   ├── src/commands/     # resize, compress, exif, pipeline, save, system
│   ├── Cargo.toml
│   └── tauri.conf.json
└── README.md
```

---

## Privacy

- Your images **never leave your machine** — no server involved
- No account, no telemetry, no analytics
- The AI model is downloaded once from a public CDN and cached locally

---

## Contributing

Contributions are welcome. Open an issue first for significant changes so we can align on the approach.

1. Fork the repository
2. Create a branch: `git checkout -b feature/my-feature`
3. Commit and push
4. Open a Pull Request

---

## License

[MIT](LICENSE) — free to use, modify, and distribute.

---

Made by <a href="https://norbertok.com" target="_blank">Norbert OK</a>
