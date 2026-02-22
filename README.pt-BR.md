<div align="center">
  <img src="src/assets/img/logo.png" alt="Logo do Pixora" width="96" />
  <h1>Pixora</h1>
  <p><strong>Processamento de imagens local. Sem nuvem. Sem conta.</strong></p>
  <p>
    <a href="README.md">🇺🇸 English</a> &nbsp;|&nbsp;
    <a href="README.es.md">🇪🇸 Español</a> &nbsp;|&nbsp;
    <a href="README.pt-BR.md">🇧🇷 Português</a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/licença-MIT-blue.svg" alt="Licença MIT" />
    <img src="https://img.shields.io/badge/plataforma-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg" alt="Plataformas" />
    <img src="https://img.shields.io/badge/feito%20com-Tauri%202-24C8D8.svg" alt="Feito com Tauri" />
  </p>
</div>

---

Pixora é um aplicativo desktop gratuito e de código aberto para processamento de imagens. Converta formatos, redimensione, remova fundos com IA e elimine metadados — tudo 100% na sua máquina, sem necessidade de internet após a instalação.

https://github.com/user-attachments/assets/e820fe94-7afc-4fa3-8bf9-34ad5b675af0

<video src="https://res.cloudinary.com/dtwdbcfu7/video/upload/v1771787506/videos/v6qomjaytv6ti36d6dnu.mp4" autoplay loop muted playsinline controls width="100%"></video>

Feito por <a href="https://norbertok.com" target="_blank">Norberto Krucheski</a>.

---

## Download

Os instaladores são compilados automaticamente a cada versão via GitHub Actions.

| Plataforma | Download |
|---|---|
| **Windows** | [⬇ Baixar para Windows (.exe)](https://github.com/NorbertOSK/pixora/releases/latest) |
| **macOS** (Apple Silicon M1 ou superior) | [⬇ Baixar para macOS (.dmg)](https://github.com/NorbertOSK/pixora/releases/latest) |
| **Linux** | [⬇ Baixar para Linux (.AppImage / .deb)](https://github.com/NorbertOSK/pixora/releases/latest) |

> Só baixe, instale e use — sem conta, sem configuração, sem nuvem.

---

## Funcionalidades

| Função | Detalhes |
|---|---|
| **Conversão de formato** | Converta entre WebP, JPEG e PNG |
| **Controle de qualidade** | Slider de qualidade ajustável (1–100%) |
| **Redimensionamento inteligente** | 10 predefinições (hero, blog, avatar, 4K…) + dimensões personalizadas. Proporção sempre preservada. |
| **EXIF e Metadados** | Visualize metadados completos (câmera, GPS, data, exposição…) e remova-os de forma limpa |
| **Remoção de fundo com IA** | Modelo ONNX local — sem chave de API. Baixa ~42 MB uma vez e funciona offline para sempre |
| **Processamento em lote** | Processe múltiplas imagens em paralelo. Exporte tudo como um ZIP |
| **Visualização antes / depois** | Slider interativo para comparar a imagem original e a processada |
| **Interface multilíngue** | Inglês, espanhol e português — troque o idioma no cabeçalho |
| **Modo escuro / claro** | Toggle de tema compatível com o sistema |

---

## Como funciona — Arquitetura

Pixora é construído com três camadas, cada uma fazendo o que faz melhor.

### React (TypeScript) — A interface

Toda a UI é um app React 18. Os painéis, sliders, grade de imagens e a visualização antes/depois são componentes React. O React gerencia as atualizações de estado e re-renders conforme as imagens são processadas, mas nunca toca diretamente em um arquivo de imagem — isso é trabalho do Rust.

### Rust — O motor

Todas as operações de imagem rodam em Rust, compilado para código nativo:

- **Redimensionamento** — filtro Lanczos3, resultados matematicamente nítidos
- **Conversão de formato** — WebP, JPEG (com controle de qualidade), PNG
- **Remoção de EXIF** — recodificando a imagem do zero, sem que nenhum metadado sobreviva
- **Remoção de fundo** — inferência com modelo ONNX (IS-Net), roda completamente na CPU
- **Arquivos** — leitura de imagens soltas, escrita dos resultados, criação de ZIPs

Rust roda em velocidade próxima a C sem garbage collector, o que significa sem pausas ou atrasos imprevisíveis. Múltiplas imagens são processadas em paralelo com um pool de workers ajustado aos núcleos disponíveis do processador. Em um Mac com chip M, um lote de 8 imagens leva aproximadamente o mesmo tempo que processar 1.

### Tauri 2 — A ponte

Tauri envolve o app React em uma janela nativa usando o WebView do sistema (WebKit no macOS, WebView2 no Windows). Expõe uma API de comandos para que o JavaScript possa chamar funções Rust através de um canal IPC leve.

**Decisão-chave de performance:** passar imagens completas como base64 pelo IPC bloquearia a thread JS a cada chamada. Em vez disso, todo o processamento roda no Rust e só o caminho de um arquivo temporário (menos de 200 bytes) é retornado. A interface lê esse arquivo uma vez para exibição. Por isso o processamento em lote não trava a UI mesmo com imagens pesadas.

---

## Remoção de fundo com IA

Usa IS-Net (quantizado), um modelo ONNX aberto. Baixado uma vez (~42 MB) no primeiro uso, depois funciona totalmente offline.

O modelo fica salvo em:

| SO | Localização |
|---|---|
| macOS | `~/Library/Application Support/pixora/` |
| Windows | `%LOCALAPPDATA%\pixora\` |
| Linux | `~/.local/share/pixora/` |

> No macOS, se não encontrar lá, verifique também `~/Library/Caches/pixora/` — o app usa essa pasta como alternativa se Application Support não estiver disponível.

---

## Compilar a partir do código-fonte

### Pré-requisitos

- <a href="https://bun.sh/" target="_blank">Bun</a> (gerenciador de pacotes e runner de scripts)
- <a href="https://rustup.rs/" target="_blank">Rust</a> (última versão estável)

### macOS — passo adicional

```bash
xcode-select --install
```

### Windows — passos adicionais

- <a href="https://visualstudio.microsoft.com/visual-cpp-build-tools/" target="_blank">Microsoft C++ Build Tools</a>
- <a href="https://developer.microsoft.com/en-us/microsoft-edge/webview2/" target="_blank">WebView2</a> (já incluído no Windows 11)

### Linux — Ubuntu / Debian

```bash
sudo apt update && sudo apt install -y \
  libwebkit2gtk-4.1-dev build-essential curl wget file \
  libssl-dev libayatana-appindicator3-dev librsvg2-devel
```

### Linux — Fedora / RHEL

```bash
sudo dnf install -y \
  webkit2gtk4.1-devel openssl-devel curl wget file \
  libappindicator-gtk3-devel librsvg2-devel
```

---

### Instalar e executar

```bash
git clone https://github.com/NorbertOSK/pixora.git
cd pixora
bun install
bun start
```

> Na primeira execução o Rust compila o back-end — leva alguns minutos. As seguintes são rápidas.

`bun start` sobe o ambiente de desenvolvimento completo: Vite serve o app React com hot reload e o Tauri o abre em uma janela nativa conectada ao back-end Rust.

### Compilar o instalador nativo

```bash
bun run dist
```

Isso compila o app React e gera o instalador nativo para o sistema operacional onde você está rodando:

| Plataforma | Saída |
|---|---|
| macOS | `src-tauri/target/release/bundle/macos/Pixora.app` e `.dmg` |
| Windows | `src-tauri/target/release/bundle/msi/Pixora.msi` e `.exe` |
| Linux | `src-tauri/target/release/bundle/deb/Pixora.deb` e `.AppImage` |

> Compilação cruzada não é suportada — execute este comando no SO para o qual quer compilar.

---

## Stack tecnológico

| Camada | Tecnologia |
|---|---|
| Framework desktop | <a href="https://tauri.app/" target="_blank">Tauri 2</a> — Rust + WebView nativo |
| Frontend | React 18 + TypeScript |
| Bundler | Vite 5 |
| Estilos | Tailwind CSS |
| Estado | Zustand |
| Processamento de imagens | Crate `image` do Rust (resize, compress, convert) |
| Metadados | `kamadak-exif` (ler / remover EXIF) |
| Inferência IA | `ort` (ONNX Runtime para Rust) + modelo IS-Net |
| Exportação ZIP | Crate `zip` (tudo em Rust) |

---

## Estrutura do projeto

```
pixora/
├── src/                  # Frontend React + TypeScript
│   ├── components/       # Componentes UI
│   ├── lib/              # Stores, pipeline, i18n
│   └── App.tsx
├── src-tauri/            # Back-end Rust
│   ├── src/commands/     # resize, compress, exif, pipeline, save, system
│   ├── Cargo.toml
│   └── tauri.conf.json
└── README.md
```

---

## Privacidade

- Suas imagens **nunca saem da sua máquina** — não há servidor envolvido
- Sem conta, sem telemetria, sem analytics
- O modelo de IA é baixado uma única vez de uma CDN pública e salvo em cache

---

## Contribuir

Contribuições são bem-vindas. Para mudanças significativas, abra uma issue primeiro para alinhar a abordagem.

1. Faça um fork do repositório
2. Crie uma branch: `git checkout -b feature/minha-funcionalidade`
3. Faça commit e push
4. Abra um Pull Request

---

## Licença

[MIT](LICENSE) — livre para usar, modificar e distribuir.

---

Feito por <a href="https://norbertok.com" target="_blank">Norbert OK</a>
