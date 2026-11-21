# Bruno Vinícius — Portfólio Editorial 3D / Software Monograph Archive

Portfólio editorial interativo em **HTML, CSS e JavaScript puros** (zero frameworks, zero build step, zero bibliotecas externas), apresentando o acervo de projetos de software de **Bruno Vinícius** como caixas/monografias em uma estante 3D com **Dossiê Editorial Contínuo** (`PT / EN`), diagramas de arquitetura e Lightbox em tela cheia.

## Estrutura do Projeto / Project Structure

```text
portfolio/
├── index.html                    # Marcação semântica, SEO, JSON-LD, máscaras SVG, dossiê e Lightbox
├── assets/
│   ├── covers/                   # Capas full-bleed estilo software box anos 1990 (.webp, 768×1376)
│   └── gallery/                  # Capturas reais em 1600×1000 (16:10, WebP q90) por projeto
│       ├── caderno-digital/      # 3/3 capturas reais ativas
│       ├── projcatalogos/        # 3/3 capturas reais ativas
│       ├── cutsync/              # 2/3 capturas reais ativas (governance-cloud em esboço editorial)
│       └── zorin-copilot/        # Pronto para capturas nativas GTK4/Wayland (3/3 em esboço editorial)
├── scripts/
│   ├── package.json              # Dependência isolada playwright-core (sem poluir a raiz estática)
│   └── capture-gallery.mjs       # Automação Playwright + Chromium + Pillow para regenerar capturas
├── src/
│   ├── artwork.js                # Catálogo principal, coverUrl e montagem SVG (capas 504×900 e lombadas)
│   ├── dossier.js                # Dossiês bilíngues PT/EN, diagramas de arquitetura SVG e 12 pranchas da galeria
│   ├── styles.css                # Design system editorial, dossiê contínuo, Lightbox e responsividade
│   └── engine.js                 # Motor 3D em loop único rAF, WAAPI, IntersectionObserver e Lightbox
└── README.md
```

## Capas Retrô / Full-Bleed Cover Assets

As artes frontais de cada obra ficam em `assets/covers/<id>.webp` (`768×1376`, proporção `504:900` / `0.56`, alinhada à geometria `d = 0.56 * H` da estante e ao pôster mascarado na folha de detalhe). As lombadas consomem automaticamente o recorte da ilustração central de cada capa.

Para substituir uma capa ou adicionar novas obras no futuro:
1. Salve a imagem WebP (ou PNG/JPG) em `assets/covers/<id>.webp` mantendo a proporção vertical `~0.56` (`504×900` ou `768×1376`).
2. Atualize ou adicione a entrada correspondente em `PROJECTS` dentro de `src/artwork.js` apontando `coverUrl: "./assets/covers/<id>.webp"`.
3. O motor pré-carrega automaticamente todos os `coverUrl` na inicialização para evitar piscadas na primeira rotação 3D.

## Galeria do Dossiê / Live Screenshots vs. Editorial Wireframes

Cada projeto possui **3 pranchas editoriais** na seção **Por Dentro da Aplicação / Inside the App** (1 destaque largo `16:10` + 2 detalhes lado a lado `16:10`), todas clicáveis para ampliação no Lightbox em tela cheia.

Atualmente **8 das 12 pranchas** exibem **capturas reais** (`1600×1000`, WebP qualidade 90) geradas automaticamente contra as aplicações em execução, enquanto **4 pranchas** permanecem intencionalmente como **esboços editoriais vetoriais** (os 3 módulos desktop GTK4/Wayland do **Zorin Copilot** e o console administrativo privado do **CutSync Cloud**):

### Tabela dos 12 Slots da Galeria / All 12 Gallery Slots

| Projeto | Slot | Formato | `id` | Status Atual | Caminho (`image` em `src/dossier.js`) | Tela / Screen |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| **Zorin Copilot** | 1 | Destaque (`16:10`) | `spotlight-bar` | Esboço editorial (`image: null`) | `./assets/gallery/zorin-copilot/spotlight-bar.webp` | Barra Spotlight GTK4 / Libadwaita *(app nativo Linux)* |
| **Zorin Copilot** | 2 | Detalhe (`16:10`) | `semantic-inspection` | Esboço editorial (`image: null`) | `./assets/gallery/zorin-copilot/semantic-inspection.webp` | Inspeção Semântica AT-SPI2 & ROI *(app nativo Linux)* |
| **Zorin Copilot** | 3 | Detalhe (`16:10`) | `agent-stepper` | Esboço editorial (`image: null`) | `./assets/gallery/zorin-copilot/agent-stepper.webp` | Fluxo Multi-Etapa & Trilha Auditável *(app nativo Linux)* |
| **Caderno Digital** | 1 | Destaque (`16:10`) | `canvas-workspace` | **Captura real** (`1600×1000`) | `./assets/gallery/caderno-digital/canvas-workspace.webp` | Estúdio A4 com tinta stylus e formas com encaixe |
| **Caderno Digital** | 2 | Detalhe (`16:10`) | `notebooks-library` | **Captura real** (`1600×1000`) | `./assets/gallery/caderno-digital/notebooks-library.webp` | Painel de Estudos com 6 matérias e cadernos |
| **Caderno Digital** | 3 | Detalhe (`16:10`) | `vector-pdf-export` | **Captura real** (`1600×1000`) | `./assets/gallery/caderno-digital/vector-pdf-export.webp` | Diálogo "Exportar Caderno e Backup" (PDF / PNG / JSON) |
| **ProjCatálogos** | 1 | Destaque (`16:10`) | `storefront-catalog` | **Captura real** (`1600×1000`) | `./assets/gallery/projcatalogos/storefront-catalog.webp` | Vitrine Drogaria Vila Saúde com categorias e destaques |
| **ProjCatálogos** | 2 | Detalhe (`16:10`) | `whatsapp-checkout` | **Captura real** (`1600×1000`) | `./assets/gallery/projcatalogos/whatsapp-checkout.webp` | Checkout com 3 itens, zona de entrega e pedido WhatsApp |
| **ProjCatálogos** | 3 | Detalhe (`16:10`) | `backoffice-admin` | **Captura real** (`1600×1000`) | `./assets/gallery/projcatalogos/backoffice-admin.webp` | Painel `/admin` com KPIs, pedidos recentes e estoque |
| **CutSync** | 1 | Destaque (`16:10`) | `public-booking` | **Captura real** (`1600×1000`) | `./assets/gallery/cutsync/public-booking.webp` | Portal público CutSync Web — seleção de serviços |
| **CutSync** | 2 | Detalhe (`16:10`) | `mobile-duo` | **Captura real** (`1600×1000`) | `./assets/gallery/cutsync/mobile-duo.webp` | Composição dupla mobile (descoberta + seleção de profissional) |
| **CutSync** | 3 | Detalhe (`16:10`) | `governance-cloud` | Esboço editorial (`image: null`) | `./assets/gallery/cutsync/governance-cloud.webp` | Console privado & auditoria AAL2 *(área autenticada)* |

### Como Trocar um Esboço Editorial por Captura Manual

Para ativar capturas nativas do **Zorin Copilot** ou do console privado **CutSync Cloud** (sem alterar HTML, CSS ou `engine.js`):
1. Salve a captura (`.webp` ou `.png`, proporção `16:10` — ex.: `1600×1000`) no caminho da tabela acima dentro de `assets/gallery/<projeto>/`.
2. Em `src/dossier.js`, localize o item em `byId["<projeto>"].gallery` e substitua `image: null` por `image: "./assets/gallery/<projeto>/<arquivo>.webp"`.
3. O motor passa automaticamente a renderizar `<img>` em cores reais na grade e no Lightbox, com pré-carregamento e atualização do selo para *"Captura real da aplicação"*.

## Automação de Capturas (Playwright) / Capture Automation

O pipeline reutilizável `scripts/capture-gallery.mjs` usa `playwright-core` (instalado isoladamente em `scripts/node_modules` para manter o site estático limpo), o Chromium do sistema (`/usr/bin/chromium`) e Python Pillow (redimensionamento Lanczos para `1600×1000`, WebP q90).

### Pré-requisitos
- Node.js 18+, Chromium (`/usr/bin/chromium` ou via `--chromium=/caminho`) e Python 3 com `Pillow`.
- Instalar dependências isoladas da automação (apenas na primeira vez):

```bash
cd scripts && npm install
```

### Comandos Disponíveis

```bash
# Capturar todas as aplicações web (ProjCatálogos, CutSync e Caderno Digital)
node scripts/capture-gallery.mjs

# Ou via scripts npm dentro de scripts/
npm --prefix scripts run capture
npm --prefix scripts run capture:projcatalogos
npm --prefix scripts run capture:cutsync
npm --prefix scripts run capture:caderno

# Selecionar subconjunto de alvos e parâmetros opcionais
node scripts/capture-gallery.mjs --only=projcatalogos,cutsync
node scripts/capture-gallery.mjs --projcatalogos-dir=../projcatalogos
node scripts/capture-gallery.mjs --caderno-repo=https://github.com/BrunoCHRBN/caderno-digital
node scripts/capture-gallery.mjs --chromium=/usr/bin/chromium
node scripts/capture-gallery.mjs --help
```

### Garantias de Segurança do Script
- **Somente leitura em `../projcatalogos`:** nunca modifica arquivos do repositório fonte.
- **Limpeza automática:** encerra todos os servidores temporários (Next.js / Vite), fecha o Chromium e remove diretórios temporários em `/tmp/` ao concluir ou interromper.
- **Escopo explícito:** pula intencionalmente **Zorin Copilot** (app nativo GTK4/Wayland) e **CutSync Cloud** (console privado autenticado), preservando seus esboços editoriais.

## Execução Local / Local Preview

O site usa scripts clássicos compatíveis tanto com servidor HTTP local quanto com abertura direta via `file://`:

```bash
# Opção 1 — Python 3
python3 -m http.server 8080

# Opção 2 — Node (serve)
npx serve .
```

Acesse `http://localhost:8080` no navegador.

### Deep-Linking

Qualquer obra pode ser aberta diretamente pela query string `?obra=<id>`:

- `?obra=zorin-copilot` — Zorin Copilot
- `?obra=caderno-digital` — Caderno Digital *(padrão inicial)*
- `?obra=projcatalogos` — ProjCatálogos
- `?obra=cutsync` — CutSync

## Deploy (GitHub Pages / Vercel)

### GitHub Pages
1. Publique o diretório `portfolio/` na branch principal (`main`) de um repositório (ex.: `BrunoCHRBN.github.io` ou `portfolio`).
2. Em **Settings → Pages**, selecione **Deploy from a branch**, branch `main` e pasta `/ (root)`.
3. *(Opcional)* Adicione `scripts/node_modules/` ao `.gitignore` antes de enviar o repositório.

### Vercel
1. Importe o repositório no painel da Vercel (ou execute `npx vercel` dentro da pasta `portfolio/`).
2. Mantenha **Framework Preset: Other** e **Build Command** vazio (arquivos estáticos puros).

## Escala Automática / Scaling Beyond 8 Projects

Adicione novas entradas ao array `projects` em `src/artwork.js` (e seu dossiê correspondente em `byId` dentro de `src/dossier.js`). Com menos de 8 obras o motor opera no **Modo Acervo Escultural** (volumes únicos com resistência elástica nas bordas); ao atingir 8 ou mais obras, o motor alterna automaticamente para o **Modo Loop Infinito** (`3 × N` cópias virtuais com wrap modular).
