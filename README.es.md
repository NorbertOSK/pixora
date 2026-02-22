<div align="center">
  <img src="src/assets/img/logo.png" alt="Logo de Pixora" width="96" />
  <h1>Pixora</h1>
  <p><strong>Procesamiento de imágenes local. Sin nube. Sin cuenta.</strong></p>
  <p>
    <a href="README.md">🇺🇸 English</a> &nbsp;|&nbsp;
    <a href="README.es.md">🇪🇸 Español</a> &nbsp;|&nbsp;
    <a href="README.pt-BR.md">🇧🇷 Português</a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/licencia-MIT-blue.svg" alt="Licencia MIT" />
    <img src="https://img.shields.io/badge/plataforma-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg" alt="Plataformas" />
    <img src="https://img.shields.io/badge/hecho%20con-Tauri%202-24C8D8.svg" alt="Hecho con Tauri" />
  </p>
</div>

---

Pixora es una aplicación de escritorio gratuita y de código abierto para procesar imágenes. Convertí formatos, redimensioná, eliminá el fondo con IA y borrá metadatos — todo 100% en tu máquina, sin necesidad de internet después de la instalación.

https://github.com/user-attachments/assets/e820fe94-7afc-4fa3-8bf9-34ad5b675af0

<video src="https://res.cloudinary.com/dtwdbcfu7/video/upload/v1771787506/videos/v6qomjaytv6ti36d6dnu.mp4" autoplay loop muted playsinline controls width="100%"></video>

Hecho por <a href="https://norbertok.com" target="_blank">Norberto Krucheski</a>.

---

## Descarga

Los instaladores se compilan automáticamente en cada versión mediante GitHub Actions.

| Plataforma | Descarga |
|---|---|
| **Windows** | [⬇ Descargar para Windows (.exe)](https://github.com/NorbertOSK/pixora/releases/latest) |
| **macOS** (Apple Silicon M1 o superior) | [⬇ Descargar para macOS (.dmg)](https://github.com/NorbertOSK/pixora/releases/latest) |
| **Linux** | [⬇ Descargar para Linux (.AppImage / .deb)](https://github.com/NorbertOSK/pixora/releases/latest) |

> Solo descargá, instalá y usá — sin cuenta, sin configuración, sin nube.

---

## Funcionalidades

| Función | Detalle |
|---|---|
| **Conversión de formato** | Convertí entre WebP, JPEG y PNG |
| **Control de calidad** | Slider de calidad ajustable (1–100%) |
| **Redimensionar inteligente** | 10 presets (hero, blog, avatar, 4K…) + dimensiones personalizadas. Relación de aspecto siempre preservada. |
| **EXIF y Metadatos** | Ver metadatos completos (cámara, GPS, fecha, exposición…) y eliminarlos limpiamente |
| **Remover fondo con IA** | Modelo ONNX local — sin API key. Descarga ~42 MB una vez y funciona offline para siempre |
| **Procesamiento masivo** | Procesá múltiples imágenes en paralelo. Exportá todo como un ZIP |
| **Vista antes / después** | Slider interactivo para comparar la imagen original y la procesada |
| **UI multilingüe** | Inglés, español y portugués — cambiá el idioma desde el encabezado |
| **Modo oscuro / claro** | Toggle de tema compatible con el sistema |

---

## Cómo funciona — Arquitectura

Pixora está construido con tres capas, cada una haciendo lo que mejor sabe.

### React (TypeScript) — La interfaz

Toda la UI es una app React 18. Los paneles, sliders, grilla de imágenes y la vista antes/después son componentes React. React maneja los cambios de estado y los re-renders a medida que se procesan imágenes, pero nunca toca un archivo de imagen directamente — eso es trabajo de Rust.

### Rust — El motor

Todas las operaciones de imagen corren en Rust, compilado a código nativo:

- **Redimensionar** — filtro Lanczos3, resultados matemáticamente nítidos
- **Conversión de formato** — WebP, JPEG (con control de calidad), PNG
- **Limpieza de EXIF** — recodificando la imagen desde cero, sin que ningún metadato sobreviva
- **Remoción de fondo** — inferencia con modelo ONNX (IS-Net), corre completamente en CPU
- **Archivos** — lectura de imágenes soltadas, escritura de resultados, creación de ZIPs

Rust corre a velocidad casi de C sin garbage collector, lo que significa sin pausas ni demoras impredecibles. Múltiples imágenes se procesan en paralelo con un pool de workers ajustado a los núcleos disponibles del procesador. En un Mac con chip M, un lote de 8 imágenes tarda aproximadamente lo mismo que procesar 1.

### Tauri 2 — El puente

Tauri envuelve la app React en una ventana nativa usando el WebView del sistema (WebKit en macOS, WebView2 en Windows). Expone una API de comandos para que JavaScript pueda llamar funciones Rust a través de un canal IPC liviano.

**Decisión clave de performance:** pasar imágenes completas como base64 por IPC bloquearía el thread de JS en cada llamada. En cambio, todo el procesamiento corre en Rust y solo se devuelve la ruta de un archivo temporal (menos de 200 bytes). La interfaz lee ese archivo una vez para mostrarlo. Por eso el procesamiento masivo no traba la UI ni siquiera con imágenes pesadas.

---

## Remoción de fondo con IA

Usa IS-Net (cuantizado), un modelo ONNX abierto. Se descarga una vez (~42 MB) en el primer uso, luego funciona completamente offline.

El modelo se guarda en:

| Sistema | Ubicación |
|---|---|
| macOS | `~/Library/Application Support/pixora/` |
| Windows | `%LOCALAPPDATA%\pixora\` |
| Linux | `~/.local/share/pixora/` |

> En macOS, si no lo encontrás ahí, revisá también `~/Library/Caches/pixora/` — la app usa esa carpeta como alternativa si Application Support no está disponible.

---

## Compilar desde el código fuente

### Requisitos previos

- <a href="https://bun.sh/" target="_blank">Bun</a> (gestor de paquetes y runner de scripts)
- <a href="https://rustup.rs/" target="_blank">Rust</a> (última versión estable)

### macOS — paso adicional

```bash
xcode-select --install
```

### Windows — pasos adicionales

- <a href="https://visualstudio.microsoft.com/visual-cpp-build-tools/" target="_blank">Microsoft C++ Build Tools</a>
- <a href="https://developer.microsoft.com/en-us/microsoft-edge/webview2/" target="_blank">WebView2</a> (ya incluido en Windows 11)

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

### Instalar y ejecutar

```bash
git clone https://github.com/NorbertOSK/pixora.git
cd pixora
bun install
bun start
```

> La primera ejecución compila el backend de Rust — tarda unos minutos. Las siguientes arrancan rápido.

`bun start` levanta el entorno de desarrollo completo: Vite sirve la app React con hot reload y Tauri la abre en una ventana nativa conectada al backend de Rust.

### Compilar el instalador nativo

```bash
bun run dist
```

Esto compila la app React y luego genera el instalador nativo para el sistema operativo donde lo estés corriendo:

| Plataforma | Salida |
|---|---|
| macOS | `src-tauri/target/release/bundle/macos/Pixora.app` y `.dmg` |
| Windows | `src-tauri/target/release/bundle/msi/Pixora.msi` y `.exe` |
| Linux | `src-tauri/target/release/bundle/deb/Pixora.deb` y `.AppImage` |

> La compilación cruzada no está soportada — ejecutá este comando en el sistema operativo para el que querés compilar.

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Framework de escritorio | <a href="https://tauri.app/" target="_blank">Tauri 2</a> — Rust + WebView nativo |
| Frontend | React 18 + TypeScript |
| Bundler | Vite 5 |
| Estilos | Tailwind CSS |
| Estado | Zustand |
| Procesamiento de imágenes | Crate `image` de Rust (resize, compress, convert) |
| Metadatos | `kamadak-exif` (leer / eliminar EXIF) |
| Inferencia IA | `ort` (ONNX Runtime para Rust) + modelo IS-Net |
| Exportación ZIP | Crate `zip` (todo en Rust) |

---

## Estructura del proyecto

```
pixora/
├── src/                  # Frontend React + TypeScript
│   ├── components/       # Componentes UI
│   ├── lib/              # Stores, pipeline, i18n
│   └── App.tsx
├── src-tauri/            # Backend Rust
│   ├── src/commands/     # resize, compress, exif, pipeline, save, system
│   ├── Cargo.toml
│   └── tauri.conf.json
└── README.md
```

---

## Privacidad

- Tus imágenes **nunca salen de tu máquina** — no hay servidor involucrado
- Sin cuenta, sin telemetría, sin analytics
- El modelo de IA se descarga una sola vez desde un CDN público y se guarda en caché

---

## Contribuir

Las contribuciones son bienvenidas. Para cambios significativos, abrí un issue primero para discutir el enfoque.

1. Hacé un fork del repositorio
2. Creá una rama: `git checkout -b feature/mi-funcionalidad`
3. Commiteá y pusheá
4. Abrí un Pull Request

---

## Licencia

[MIT](LICENSE) — libre para usar, modificar y distribuir.

---

Hecho por <a href="https://norbertok.com" target="_blank">Norbert OK</a>
