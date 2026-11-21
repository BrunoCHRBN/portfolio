(function (root) {
  "use strict";

  var PALETTE = {
    paper: "#F4F2ED",
    cardboard: "#EFECE4",
    paperHighlight: "#FAF8F2",
    sand: "#DED8CC",
    ink: "#141414",
    muted: "#6D6A63",
    cobalt: "#1F3FB0",
    vermilion: "#C83E2B"
  };

  var SERIF_FONT = "Newsreader, Georgia, serif";
  var SANS_FONT = "'Inter Tight', system-ui, sans-serif";

  function escapeXML(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function sanitizePrefix(prefix, fallback) {
    var raw = typeof prefix === "string" && prefix.trim() ? prefix.trim() : fallback;
    var clean = raw.replace(/[^a-zA-Z0-9_-]/g, "");
    if (!clean || !/^[a-zA-Z_]/.test(clean)) {
      clean = fallback + "-" + clean;
    }
    return clean;
  }

  function makeUid(prefix, projectId, scope) {
    var safePrefix = sanitizePrefix(prefix, "svg");
    var base = scope ? safePrefix + "-" + projectId + "-" + scope : safePrefix + "-" + projectId;
    return function (name) {
      return base + "-" + name;
    };
  }

  /* ------------------------------------------------------------------------
     Shared Swiss Editorial SVG Primitives (Architecture 960x360)
     ------------------------------------------------------------------------ */
  function archShell(uid, ariaLabel, body) {
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 360" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' +
      escapeXML(ariaLabel) +
      '">' +
      "<defs>" +
      '<pattern id="' +
      uid("grid") +
      '" width="24" height="24" patternUnits="userSpaceOnUse">' +
      '<circle cx="1.5" cy="1.5" r="0.85" fill="' +
      PALETTE.ink +
      '" opacity="0.11"/>' +
      "</pattern>" +
      '<pattern id="' +
      uid("hatch") +
      '" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
      '<line x1="0" y1="0" x2="0" y2="8" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1" opacity="0.22"/>' +
      "</pattern>" +
      '<marker id="' +
      uid("arr-cobalt") +
      '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto">' +
      '<path d="M 1 1.5 L 8.5 5 L 1 8.5 Z" fill="' +
      PALETTE.cobalt +
      '"/>' +
      "</marker>" +
      '<marker id="' +
      uid("arr-ink") +
      '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">' +
      '<path d="M 1 1.5 L 8.5 5 L 1 8.5 Z" fill="' +
      PALETTE.ink +
      '"/>' +
      "</marker>" +
      '<marker id="' +
      uid("arr-vermilion") +
      '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">' +
      '<path d="M 1 1.5 L 8.5 5 L 1 8.5 Z" fill="' +
      PALETTE.vermilion +
      '"/>' +
      "</marker>" +
      "</defs>" +
      '<rect x="0" y="0" width="960" height="360" fill="' +
      PALETTE.cardboard +
      '"/>' +
      '<rect x="0" y="0" width="960" height="360" fill="url(#' +
      uid("grid") +
      ')"/>' +
      '<rect x="12" y="12" width="936" height="336" fill="none" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.75" opacity="0.24"/>' +
      body +
      "</svg>"
    );
  }

  function archCard(x, y, w, h, kicker, title, line1, line2, opts) {
    var o = opts || {};
    var accent = o.accent || null;
    var fill = o.fill || PALETTE.paper;
    var kickerColor = o.kickerColor || (accent === PALETTE.vermilion ? PALETTE.vermilion : PALETTE.cobalt);
    var titleSize = o.titleSize || 16.5;
    var parts = [];
    parts.push(
      '<rect x="' +
        (x + 3) +
        '" y="' +
        (y + 3) +
        '" width="' +
        w +
        '" height="' +
        h +
        '" fill="' +
        PALETTE.sand +
        '"/>'
    );
    parts.push(
      '<rect x="' +
        x +
        '" y="' +
        y +
        '" width="' +
        w +
        '" height="' +
        h +
        '" fill="' +
        fill +
        '" stroke="' +
        (o.borderColor || PALETTE.ink) +
        '" stroke-width="' +
        (o.borderWidth || "1.2") +
        '"/>'
    );
    if (accent) {
      parts.push(
        '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="4" fill="' + accent + '"/>'
      );
    }
    var tx = x + 14;
    var ky = y + (accent ? 23 : 20);
    if (kicker) {
      parts.push(
        '<text x="' +
          tx +
          '" y="' +
          ky +
          '" font-family="' +
          SANS_FONT +
          '" font-size="9.5" font-weight="600" letter-spacing="1.3" fill="' +
          kickerColor +
          '">' +
          escapeXML(kicker) +
          "</text>"
      );
    }
    var ty = kicker ? ky + 21 : y + 28;
    parts.push(
      '<text x="' +
        tx +
        '" y="' +
        ty +
        '" font-family="' +
        SERIF_FONT +
        '" font-size="' +
        titleSize +
        '" font-weight="500" fill="' +
        PALETTE.ink +
        '">' +
        escapeXML(title) +
        "</text>"
    );
    if (line1) {
      parts.push(
        '<text x="' +
          tx +
          '" y="' +
          (ty + 18) +
          '" font-family="' +
          SANS_FONT +
          '" font-size="10.5" font-weight="500" fill="' +
          PALETTE.muted +
          '">' +
          escapeXML(line1) +
          "</text>"
      );
    }
    if (line2) {
      parts.push(
        '<text x="' +
          tx +
          '" y="' +
          (ty + 33) +
          '" font-family="' +
          SANS_FONT +
          '" font-size="10.5" font-weight="500" fill="' +
          PALETTE.muted +
          '">' +
          escapeXML(line2) +
          "</text>"
      );
    }
    if (o.dot) {
      parts.push(
        '<circle cx="' +
          (x + w - 14) +
          '" cy="' +
          (y + (accent ? 20 : 17)) +
          '" r="4" fill="' +
          o.dot +
          '"/>'
      );
    }
    return parts.join("");
  }

  /* ------------------------------------------------------------------------
     Shared Swiss Editorial SVG Primitives (Wireframe Plates 960x600)
     ------------------------------------------------------------------------ */
  function wfShell(uid, body) {
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 600" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      "<defs>" +
      '<pattern id="' +
      uid("grid") +
      '" width="24" height="24" patternUnits="userSpaceOnUse">' +
      '<circle cx="1.5" cy="1.5" r="0.8" fill="' +
      PALETTE.ink +
      '" opacity="0.1"/>' +
      "</pattern>" +
      '<pattern id="' +
      uid("dots") +
      '" width="8" height="8" patternUnits="userSpaceOnUse">' +
      '<circle cx="2" cy="2" r="1.05" fill="' +
      PALETTE.cobalt +
      '" opacity="0.28"/>' +
      '<circle cx="6" cy="6" r="1.05" fill="' +
      PALETTE.cobalt +
      '" opacity="0.16"/>' +
      "</pattern>" +
      '<pattern id="' +
      uid("hatch") +
      '" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
      '<line x1="0" y1="0" x2="0" y2="8" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.9" opacity="0.14"/>' +
      "</pattern>" +
      '<clipPath id="' +
      uid("clip") +
      '">' +
      '<rect x="0" y="0" width="960" height="600"/>' +
      "</clipPath>" +
      "</defs>" +
      '<g clip-path="url(#' +
      uid("clip") +
      ')">' +
      '<rect x="0" y="0" width="960" height="600" fill="' +
      PALETTE.cardboard +
      '"/>' +
      '<rect x="0" y="0" width="960" height="600" fill="url(#' +
      uid("grid") +
      ')"/>' +
      body +
      "</g>" +
      "</svg>"
    );
  }

  function windowFrame(x, y, w, h, title, rightLabel) {
    return (
      '<rect x="' +
      (x + 5) +
      '" y="' +
      (y + 5) +
      '" width="' +
      w +
      '" height="' +
      h +
      '" fill="' +
      PALETTE.sand +
      '"/>' +
      '<rect x="' +
      x +
      '" y="' +
      y +
      '" width="' +
      w +
      '" height="' +
      h +
      '" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.35"/>' +
      '<rect x="' +
      x +
      '" y="' +
      y +
      '" width="' +
      w +
      '" height="34" fill="' +
      PALETTE.cardboard +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.1"/>' +
      '<circle cx="' +
      (x + 18) +
      '" cy="' +
      (y + 17) +
      '" r="3.6" fill="' +
      PALETTE.ink +
      '"/>' +
      '<circle cx="' +
      (x + 31) +
      '" cy="' +
      (y + 17) +
      '" r="3.6" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<circle cx="' +
      (x + 44) +
      '" cy="' +
      (y + 17) +
      '" r="3.6" fill="' +
      PALETTE.vermilion +
      '"/>' +
      '<text x="' +
      (x + 62) +
      '" y="' +
      (y + 21) +
      '" font-family="' +
      SANS_FONT +
      '" font-size="11" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.ink +
      '">' +
      escapeXML(title) +
      "</text>" +
      (rightLabel
        ? '<text x="' +
          (x + w - 16) +
          '" y="' +
          (y + 21) +
          '" text-anchor="end" font-family="' +
          SANS_FONT +
          '" font-size="10" font-weight="600" letter-spacing="1.1" fill="' +
          PALETTE.muted +
          '">' +
          escapeXML(rightLabel) +
          "</text>"
        : "")
    );
  }

  /* ========================================================================
     1. ZORIN COPILOT — Architecture Diagram & 3 Wireframe Plates
     ======================================================================== */
  function buildZorinArchSVG(idPrefix) {
    var uid = makeUid(idPrefix || "arch", "zorin-copilot");
    var body =
      // Left column: 3 unified surfaces
      archCard(36, 40, 196, 68, "SUPERFÍCIE", "Barra GTK4", "Atalho flutuante Wayland", null, {
        accent: PALETTE.cobalt,
        titleSize: 15.5
      }) +
      archCard(36, 128, 196, 68, "LINHA DE COMANDO", "CLI Direta", "Execução rápida em shell", null, {
        titleSize: 15.5
      }) +
      archCard(36, 216, 196, 68, "SESSÃO CONTÍNUA", "Terminal Interativo", "Histórico e contexto local", null, {
        titleSize: 15.5
      }) +
      // Merge rail from 3 entry surfaces into Introspector
      '<polyline points="232,74 252,74 252,146 272,146" fill="none" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.6" marker-end="url(#' +
      uid("arr-cobalt") +
      ')"/>' +
      '<line x1="232" y1="162" x2="252" y2="162" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.2"/>' +
      '<polyline points="232,250 252,250 252,146" fill="none" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.2"/>' +
      '<circle cx="252" cy="146" r="3.5" fill="' +
      PALETTE.cobalt +
      '"/>' +
      // Center-Left: Semantic Introspector + bottom On-Demand ROI Vision
      archCard(
        278,
        82,
        204,
        118,
        "BARRAMENTO NATIVO",
        "Leitor Semântico",
        "Árvore AT-SPI2 & D-Bus",
        "Leitura de widgets sem OCR",
        { accent: PALETTE.cobalt, dot: PALETTE.vermilion, titleSize: 16 }
      ) +
      archCard(
        278,
        238,
        204,
        84,
        "FALLBACK SELETIVO",
        "Visão ROI Sob Demanda",
        "Recorte apenas da área ativa",
        null,
        { accent: PALETTE.vermilion, fill: PALETTE.paperHighlight, titleSize: 14.5 }
      ) +
      // Bidirectional selective ROI arrow
      '<line x1="364" y1="200" x2="364" y2="232" stroke="' +
      PALETTE.vermilion +
      '" stroke-width="1.4" stroke-dasharray="4 3" marker-end="url(#' +
      uid("arr-vermilion") +
      ')"/>' +
      '<line x1="398" y1="238" x2="398" y2="206" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.4" marker-end="url(#' +
      uid("arr-cobalt") +
      ')"/>' +
      // Arrow Introspector -> Agent Core
      '<line x1="482" y1="141" x2="520" y2="141" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.8" marker-end="url(#' +
      uid("arr-cobalt") +
      ')"/>' +
      // Center-Right: Agent Core
      archCard(
        526,
        82,
        196,
        118,
        "NÚCLEO LOCAL",
        "Agente Supervisionado",
        "Planejamento multi-etapa",
        "Confirmação humana ativa",
        { accent: PALETTE.ink, dot: PALETTE.cobalt, titleSize: 15 }
      ) +
      // Arrow Agent Core -> Executor
      '<line x1="722" y1="141" x2="758" y2="141" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.8" marker-end="url(#' +
      uid("arr-cobalt") +
      ')"/>' +
      // Right: Executor & Audit
      archCard(
        764,
        82,
        160,
        118,
        "EXECUÇÃO SEGURA",
        "Ações & Auditoria",
        "Trilha passo a passo",
        "Parada de emergência",
        { accent: PALETTE.vermilion, titleSize: 15.5 }
      ) +
      // Post-action verification feedback loop back to AT-SPI2
      '<polyline points="844,200 844,292 504,292 504,166 488,166" fill="none" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.15" stroke-dasharray="4 4" marker-end="url(#' +
      uid("arr-ink") +
      ')"/>' +
      '<rect x="608" y="281" width="166" height="22" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.9"/>' +
      '<text x="691" y="295" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="9.5" font-weight="600" letter-spacing="1" fill="' +
      PALETTE.muted +
      '">VERIFICAÇÃO PÓS-AÇÃO</text>';

    return archShell(
      uid,
      "Diagrama de arquitetura do Zorin Copilot: GTK4, CLI e Terminal conectados à introspecção AT-SPI2/D-Bus, visão ROI sob demanda e agente supervisionado",
      body
    );
  }

  function buildZorinWfSpotlight(idPrefix) {
    var uid = makeUid(idPrefix || "gal", "zorin-copilot", "spotlight");
    var body =
      // Linux Wayland top desktop bar
      '<rect x="0" y="0" width="960" height="32" fill="' +
      PALETTE.ink +
      '"/>' +
      '<text x="20" y="20" font-family="' +
      SANS_FONT +
      '" font-size="10.5" font-weight="600" letter-spacing="1.4" fill="' +
      PALETTE.paper +
      '">ATIVIDADES</text>' +
      '<text x="480" y="20" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="11" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.paper +
      '">QUI · 14:30</text>' +
      '<circle cx="912" cy="16" r="4" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<circle cx="930" cy="16" r="4" fill="' +
      PALETTE.vermilion +
      '"/>' +
      // Background muted desktop workspace windows (atmospheric depth)
      '<rect x="34" y="54" width="430" height="516" fill="' +
      PALETTE.paper +
      '" opacity="0.58" stroke="' +
      PALETTE.ink +
      '" stroke-width="1" stroke-dasharray="3 3"/>' +
      '<rect x="492" y="54" width="434" height="252" fill="' +
      PALETTE.paper +
      '" opacity="0.54" stroke="' +
      PALETTE.ink +
      '" stroke-width="1" stroke-dasharray="3 3"/>' +
      '<rect x="492" y="324" width="434" height="246" fill="' +
      PALETTE.sand +
      '" opacity="0.5" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      '<line x1="60" y1="98" x2="290" y2="98" stroke="' +
      PALETTE.ink +
      '" stroke-width="2" opacity="0.16"/>' +
      '<line x1="60" y1="120" x2="360" y2="120" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.2" opacity="0.14"/>' +
      '<line x1="60" y1="446" x2="330" y2="446" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.2" opacity="0.14"/>' +
      '<line x1="520" y1="364" x2="820" y2="364" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.5" opacity="0.18"/>' +
      '<line x1="520" y1="392" x2="770" y2="392" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.5" opacity="0.24"/>' +
      // Hero Floating GTK4 / Libadwaita Spotlight Window
      '<rect x="148" y="138" width="680" height="328" fill="' +
      PALETTE.ink +
      '" opacity="0.14"/>' +
      '<rect x="140" y="130" width="680" height="328" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.6"/>' +
      '<rect x="140" y="130" width="680" height="5" fill="' +
      PALETTE.cobalt +
      '"/>' +
      // Spotlight Header Context Strip
      '<circle cx="168" cy="160" r="6" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<text x="184" y="164" font-family="' +
      SANS_FONT +
      '" font-size="11" font-weight="600" letter-spacing="1.6" fill="' +
      PALETTE.cobalt +
      '">ZORIN COPILOT · WAYLAND</text>' +
      '<circle cx="670" cy="160" r="4" fill="' +
      PALETTE.vermilion +
      '"/>' +
      '<text x="682" y="164" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.muted +
      '">AT-SPI2 CONECTADO</text>' +
      '<line x1="164" y1="180" x2="796" y2="180" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.9" opacity="0.25"/>' +
      // Prompt Input Box
      '<rect x="164" y="196" width="632" height="56" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.5"/>' +
      '<text x="182" y="230" font-family="' +
      SERIF_FONT +
      '" font-size="20" fill="' +
      PALETTE.ink +
      '">Organizar janelas do estúdio e revisar erros do terminal</text>' +
      '<rect x="772" y="210" width="2.2" height="26" fill="' +
      PALETTE.cobalt +
      '"/>' +
      // Contextual Action Chips Row
      '<rect x="164" y="268" width="164" height="30" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<text x="246" y="287" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="10.5" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.paperHighlight +
      '">INSPECIONAR JANELA</text>' +
      '<rect x="338" y="268" width="150" height="30" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.1"/>' +
      '<text x="413" y="287" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="10.5" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.ink +
      '">MODO AGENTE</text>' +
      '<rect x="498" y="268" width="166" height="30" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.vermilion +
      '" stroke-width="1.1"/>' +
      '<text x="581" y="287" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="10.5" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.vermilion +
      '">CAPTURAR REGIÃO ROI</text>' +
      // Live Semantic Preview Panel inside Spotlight
      '<rect x="164" y="314" width="632" height="120" fill="' +
      PALETTE.cardboard +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      '<text x="182" y="338" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.4" fill="' +
      PALETTE.muted +
      '">CONTEXTO DETECTADO EM TEMPO REAL</text>' +
      '<text x="182" y="366" font-family="' +
      SERIF_FONT +
      '" font-size="16" fill="' +
      PALETTE.ink +
      '">Janela ativa: Terminal de Compilação · 42 nós semânticos mapeados</text>' +
      '<text x="182" y="392" font-family="' +
      SANS_FONT +
      '" font-size="11.5" font-weight="500" fill="' +
      PALETTE.muted +
      '">Plano sugerido: ler saída do compilador, propor correção e aguardar confirmação.</text>' +
      '<rect x="652" y="392" width="128" height="28" fill="' +
      PALETTE.ink +
      '"/>' +
      '<text x="716" y="410" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.paper +
      '">ENTER · EXECUTAR</text>';
    return wfShell(uid, body);
  }

  function buildZorinWfInspection(idPrefix) {
    var uid = makeUid(idPrefix || "gal", "zorin-copilot", "inspection");
    var body =
      // Left Desktop App Being Inspected
      windowFrame(32, 34, 574, 532, "APLICAÇÃO LINUX · ESPAÇO DE TRABALHO", "WAYLAND") +
      // Cobalt Semantic Bounding Boxes over live UI controls
      '<rect x="52" y="88" width="144" height="456" fill="' +
      PALETTE.cardboard +
      '" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.3" stroke-dasharray="4 3"/>' +
      '<rect x="52" y="88" width="84" height="18" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<text x="60" y="100" font-family="' +
      SANS_FONT +
      '" font-size="9" font-weight="600" letter-spacing="1" fill="' +
      PALETTE.paper +
      '">LISTA LATERAL</text>' +
      '<rect x="68" y="124" width="112" height="24" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.9"/>' +
      '<rect x="68" y="158" width="112" height="24" fill="' +
      PALETTE.cobalt +
      '" opacity="0.16" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.2"/>' +
      '<rect x="68" y="192" width="112" height="24" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.9"/>' +
      // Search input highlighted in cobalt
      '<rect x="216" y="88" width="238" height="38" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.6"/>' +
      '<rect x="216" y="72" width="102" height="16" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<text x="223" y="83" font-family="' +
      SANS_FONT +
      '" font-size="8.5" font-weight="600" letter-spacing="1" fill="' +
      PALETTE.paper +
      '">CAMPO DE BUSCA</text>' +
      // Action button highlighted in cobalt
      '<rect x="468" y="88" width="118" height="38" fill="' +
      PALETTE.cobalt +
      '" opacity="0.12" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.6"/>' +
      '<text x="527" y="111" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="10.5" font-weight="600" fill="' +
      PALETTE.cobalt +
      '">PUBLICAR</text>' +
      // Unlabeled Canvas Graphic Area framed by Vermilion ROI Viewfinder!
      '<rect x="216" y="148" width="370" height="244" fill="url(#' +
      uid("dots") +
      ')" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.9"/>' +
      // Graphic chart curves inside canvas
      '<polyline points="240,342 304,284 366,306 438,214 510,236 562,188" fill="none" stroke="' +
      PALETTE.ink +
      '" stroke-width="2"/>' +
      '<circle cx="438" cy="214" r="5" fill="' +
      PALETTE.cobalt +
      '"/>' +
      // Vermilion ROI viewfinder brackets
      '<rect x="228" y="160" width="346" height="220" fill="none" stroke="' +
      PALETTE.vermilion +
      '" stroke-width="1.8" stroke-dasharray="6 4"/>' +
      '<path d="M 228 184 L 228 160 L 252 160 M 550 160 L 574 160 L 574 184 M 228 356 L 228 380 L 252 380 M 550 380 L 574 380 L 574 356" fill="none" stroke="' +
      PALETTE.vermilion +
      '" stroke-width="3"/>' +
      '<rect x="228" y="142" width="182" height="18" fill="' +
      PALETTE.vermilion +
      '"/>' +
      '<text x="236" y="154" font-family="' +
      SANS_FONT +
      '" font-size="9" font-weight="600" letter-spacing="1.1" fill="' +
      PALETTE.paper +
      '">ROI · VISÃO SOB DEMANDA</text>' +
      // Bottom toolbar semantic nodes
      '<rect x="216" y="414" width="370" height="130" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      '<line x1="236" y1="452" x2="564" y2="452" stroke="' +
      PALETTE.ink +
      '" stroke-width="1" opacity="0.25"/>' +
      '<line x1="236" y1="486" x2="510" y2="486" stroke="' +
      PALETTE.ink +
      '" stroke-width="1" opacity="0.25"/>' +
      '<line x1="236" y1="518" x2="462" y2="518" stroke="' +
      PALETTE.ink +
      '" stroke-width="1" opacity="0.25"/>' +
      // Right Semantic Tree Inspector Drawer
      windowFrame(626, 34, 302, 532, "ÁRVORE AT-SPI2", "D-BUS") +
      '<text x="646" y="96" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.3" fill="' +
      PALETTE.cobalt +
      '">HIERARQUIA SEMÂNTICA</text>' +
      // Tree lines & nodes
      '<line x1="658" y1="112" x2="658" y2="438" stroke="' +
      PALETTE.ink +
      '" stroke-width="1" opacity="0.35"/>' +
      '<rect x="652" y="114" width="254" height="30" fill="' +
      PALETTE.cardboard +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      '<text x="664" y="133" font-family="' +
      SANS_FONT +
      '" font-size="11" font-weight="600" fill="' +
      PALETTE.ink +
      '">Janela · Espaço de Trabalho</text>' +
      '<rect x="674" y="156" width="232" height="30" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.2"/>' +
      '<text x="686" y="175" font-family="' +
      SANS_FONT +
      '" font-size="11" font-weight="500" fill="' +
      PALETTE.cobalt +
      '">Lista · Navegação Lateral</text>' +
      '<rect x="674" y="198" width="232" height="30" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.2"/>' +
      '<text x="686" y="217" font-family="' +
      SANS_FONT +
      '" font-size="11" font-weight="500" fill="' +
      PALETTE.cobalt +
      '">Entrada · Campo de Busca</text>' +
      '<rect x="674" y="240" width="232" height="30" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.2"/>' +
      '<text x="686" y="259" font-family="' +
      SANS_FONT +
      '" font-size="11" font-weight="500" fill="' +
      PALETTE.cobalt +
      '">Botão · Publicar (Ativo)</text>' +
      '<rect x="674" y="282" width="232" height="34" fill="' +
      PALETTE.vermilion +
      '" opacity="0.1" stroke="' +
      PALETTE.vermilion +
      '" stroke-width="1.4"/>' +
      '<text x="686" y="303" font-family="' +
      SANS_FONT +
      '" font-size="11" font-weight="600" fill="' +
      PALETTE.vermilion +
      '">Canvas · Recorte ROI Ativo</text>' +
      // Connector bridging ROI box to inspector entry
      '<polyline points="574,299 674,299" fill="none" stroke="' +
      PALETTE.vermilion +
      '" stroke-width="1.6"/>' +
      '<circle cx="574" cy="299" r="4" fill="' +
      PALETTE.vermilion +
      '"/>' +
      // Bottom Inspector Latency Card
      '<rect x="646" y="454" width="262" height="90" fill="' +
      PALETTE.cardboard +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      '<text x="660" y="478" font-family="' +
      SANS_FONT +
      '" font-size="9.5" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.muted +
      '">TELEMETRIA LOCAL</text>' +
      '<text x="660" y="505" font-family="' +
      SERIF_FONT +
      '" font-size="16" fill="' +
      PALETTE.ink +
      '">14 ms · 1 recorte ROI</text>' +
      '<text x="660" y="527" font-family="' +
      SANS_FONT +
      '" font-size="10.5" fill="' +
      PALETTE.muted +
      '">Zero captura integral de tela</text>';
    return wfShell(uid, body);
  }

  function buildZorinWfStepper(idPrefix) {
    var uid = makeUid(idPrefix || "gal", "zorin-copilot", "stepper");
    var body =
      windowFrame(44, 34, 872, 532, "AGENTE SUPERVISIONADO · EXECUÇÃO MULTI-ETAPA", "CONTROLE HUMANO") +
      // Left Stepper Column
      '<rect x="64" y="88" width="292" height="456" fill="' +
      PALETTE.cardboard +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      '<text x="84" y="118" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.4" fill="' +
      PALETTE.muted +
      '">PLANO DE AÇÃO</text>' +
      '<line x1="100" y1="146" x2="100" y2="390" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.2" opacity="0.35"/>' +
      // Step 1 (Done)
      '<circle cx="100" cy="152" r="10" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<polyline points="95,152 99,156 106,148" fill="none" stroke="' +
      PALETTE.paper +
      '" stroke-width="1.8"/>' +
      '<text x="122" y="149" font-family="' +
      SANS_FONT +
      '" font-size="11.5" font-weight="600" fill="' +
      PALETTE.ink +
      '">1. Ler árvore da janela</text>' +
      '<text x="122" y="166" font-family="' +
      SANS_FONT +
      '" font-size="10" fill="' +
      PALETTE.muted +
      '">Concluído · AT-SPI2</text>' +
      // Step 2 (Done)
      '<circle cx="100" cy="224" r="10" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<polyline points="95,224 99,228 106,220" fill="none" stroke="' +
      PALETTE.paper +
      '" stroke-width="1.8"/>' +
      '<text x="122" y="221" font-family="' +
      SANS_FONT +
      '" font-size="11.5" font-weight="600" fill="' +
      PALETTE.ink +
      '">2. Focar terminal ativo</text>' +
      '<text x="122" y="238" font-family="' +
      SANS_FONT +
      '" font-size="10" fill="' +
      PALETTE.muted +
      '">Concluído · D-Bus</text>' +
      // Step 3 (Awaiting approval - Vermilion pulse)
      '<circle cx="100" cy="298" r="15" fill="none" stroke="' +
      PALETTE.vermilion +
      '" stroke-width="1.2" stroke-dasharray="3 2"/>' +
      '<circle cx="100" cy="298" r="9" fill="' +
      PALETTE.vermilion +
      '"/>' +
      '<text x="122" y="295" font-family="' +
      SANS_FONT +
      '" font-size="11.5" font-weight="600" fill="' +
      PALETTE.vermilion +
      '">3. Aplicar comando local</text>' +
      '<text x="122" y="312" font-family="' +
      SANS_FONT +
      '" font-size="10" fill="' +
      PALETTE.vermilion +
      '">Aguardando aprovação</text>' +
      // Step 4 (Queued)
      '<circle cx="100" cy="376" r="10" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.2"/>' +
      '<text x="122" y="373" font-family="' +
      SANS_FONT +
      '" font-size="11.5" font-weight="500" fill="' +
      PALETTE.muted +
      '">4. Validar resultado final</text>' +
      '<text x="122" y="390" font-family="' +
      SANS_FONT +
      '" font-size="10" fill="' +
      PALETTE.muted +
      '">Na fila</text>' +
      // Emergency Stop Block at bottom of stepper
      '<rect x="82" y="472" width="256" height="48" fill="' +
      PALETTE.vermilion +
      '"/>' +
      '<text x="210" y="501" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="11.5" font-weight="600" letter-spacing="1.6" fill="' +
      PALETTE.paperHighlight +
      '">PARADA DE EMERGÊNCIA</text>' +
      // Right Main Preview & Approval Panel
      '<rect x="376" y="88" width="520" height="232" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.2"/>' +
      '<rect x="376" y="88" width="520" height="4" fill="' +
      PALETTE.vermilion +
      '"/>' +
      '<text x="398" y="120" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.4" fill="' +
      PALETTE.vermilion +
      '">CONFIRMAÇÃO NECESSÁRIA · ETAPA 3</text>' +
      '<text x="398" y="152" font-family="' +
      SERIF_FONT +
      '" font-size="22" fill="' +
      PALETTE.ink +
      '">Executar atualização de dependências locais</text>' +
      '<rect x="398" y="172" width="476" height="58" fill="' +
      PALETTE.cardboard +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.9"/>' +
      '<text x="414" y="198" font-family="' +
      SANS_FONT +
      '" font-size="11.5" font-weight="600" fill="' +
      PALETTE.ink +
      '">Alvo: Terminal · Sessão de Trabalho Atual</text>' +
      '<text x="414" y="218" font-family="' +
      SANS_FONT +
      '" font-size="11" fill="' +
      PALETTE.muted +
      '">Escopo restrito ao diretório do projeto · Reversível</text>' +
      // Approval buttons
      '<rect x="398" y="250" width="210" height="44" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<text x="503" y="277" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="11" font-weight="600" letter-spacing="1.4" fill="' +
      PALETTE.paperHighlight +
      '">APROVAR ETAPA</text>' +
      '<rect x="622" y="250" width="160" height="44" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.2"/>' +
      '<text x="702" y="277" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="11" font-weight="600" letter-spacing="1.4" fill="' +
      PALETTE.ink +
      '">PULAR</text>' +
      // Right Bottom Audit Trail Card
      '<rect x="376" y="340" width="520" height="204" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.1"/>' +
      '<text x="398" y="368" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.4" fill="' +
      PALETTE.cobalt +
      '">TRILHA AUDITÁVEL</text>' +
      '<line x1="398" y1="380" x2="874" y2="380" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.8" opacity="0.25"/>' +
      '<text x="398" y="406" font-family="' +
      SANS_FONT +
      '" font-size="11" font-weight="600" fill="' +
      PALETTE.muted +
      '">14:30:02</text>' +
      '<text x="472" y="406" font-family="' +
      SANS_FONT +
      '" font-size="11.5" fill="' +
      PALETTE.ink +
      '">Árvore AT-SPI2 capturada (42 controles)</text>' +
      '<text x="398" y="438" font-family="' +
      SANS_FONT +
      '" font-size="11" font-weight="600" fill="' +
      PALETTE.muted +
      '">14:30:04</text>' +
      '<text x="472" y="438" font-family="' +
      SANS_FONT +
      '" font-size="11.5" fill="' +
      PALETTE.ink +
      '">Foco transferido via D-Bus com sucesso</text>' +
      '<text x="398" y="470" font-family="' +
      SANS_FONT +
      '" font-size="11" font-weight="600" fill="' +
      PALETTE.vermilion +
      '">14:30:05</text>' +
      '<text x="472" y="470" font-family="' +
      SANS_FONT +
      '" font-size="11.5" font-weight="600" fill="' +
      PALETTE.vermilion +
      '">Pausa automática antes de execução no shell</text>' +
      '<text x="398" y="504" font-family="' +
      SANS_FONT +
      '" font-size="10.5" fill="' +
      PALETTE.muted +
      '">Registro salvo localmente · Sessão supervisionada</text>';
    return wfShell(uid, body);
  }

  /* ========================================================================
     2. CADERNO DIGITAL — Architecture Diagram & 3 Wireframe Plates
     ======================================================================== */
  function buildCadernoArchSVG(idPrefix) {
    var uid = makeUid(idPrefix || "arch", "caderno-digital");
    var body =
      archCard(
        36,
        96,
        186,
        112,
        "ENTRADA DE CANETA",
        "Pointer & Pressão",
        "Eventos coalescidos",
        "Largura e inclinação",
        { accent: PALETTE.ink }
      ) +
      '<line x1="222" y1="152" x2="258" y2="152" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.8" marker-end="url(#' +
      uid("arr-cobalt") +
      ')"/>' +
      archCard(
        264,
        66,
        204,
        122,
        "RENDERIZAÇÃO O(1)",
        "Canvas Dupla Camada",
        "Camada ativa em tempo real",
        "Camada estática em cache",
        { accent: PALETTE.cobalt, dot: PALETTE.cobalt }
      ) +
      archCard(
        264,
        232,
        204,
        92,
        "INTELIGÊNCIA GEOMÉTRICA",
        "Formas & Encaixe",
        "Retas, círculos e polígonos",
        "Guias magnéticas de precisão",
        { accent: PALETTE.vermilion, fill: PALETTE.paperHighlight, titleSize: 15.5, dot: PALETTE.vermilion }
      ) +
      // Bidirectional snap arrows between Canvas and Shape Engine
      '<line x1="348" y1="188" x2="348" y2="226" stroke="' +
      PALETTE.vermilion +
      '" stroke-width="1.4" stroke-dasharray="4 3" marker-end="url(#' +
      uid("arr-vermilion") +
      ')"/>' +
      '<line x1="384" y1="232" x2="384" y2="194" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.5" marker-end="url(#' +
      uid("arr-cobalt") +
      ')"/>' +
      // Canvas -> Vector Document Store
      '<line x1="468" y1="127" x2="504" y2="127" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.8" marker-end="url(#' +
      uid("arr-cobalt") +
      ')"/>' +
      archCard(
        510,
        74,
        196,
        114,
        "MODELO VETORIAL",
        "Estado de Cadernos",
        "Matérias, folhas e histórico",
        "Traços como curvas puras",
        { accent: PALETTE.ink }
      ) +
      // Branch to IndexedDB (top) and Vector PDF (bottom)
      '<polyline points="706,114 726,114 726,96 742,96" fill="none" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.7" marker-end="url(#' +
      uid("arr-cobalt") +
      ')"/>' +
      '<polyline points="706,148 726,148 726,246 742,246" fill="none" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.6" marker-end="url(#' +
      uid("arr-ink") +
      ')"/>' +
      archCard(
        748,
        46,
        176,
        106,
        "OFFLINE FIRST",
        "IndexedDB Local",
        "Gravação instantânea",
        "Zero nuvem obrigatória",
        { accent: PALETTE.cobalt, titleSize: 15.5 }
      ) +
      archCard(
        748,
        194,
        176,
        106,
        "SAÍDA IMPRESSA",
        "Exportador PDF",
        "Vetor limpo com ajuste A4",
        "Sem pixelização",
        { accent: PALETTE.vermilion, titleSize: 15.5 }
      );

    return archShell(
      uid,
      "Diagrama de arquitetura do Caderno Digital: entrada de caneta por pressão, Canvas em dupla camada O(1), reconhecedor geométrico magnético, IndexedDB offline e exportação PDF vetorial",
      body
    );
  }

  function buildCadernoWfWorkspace(idPrefix) {
    var uid = makeUid(idPrefix || "gal", "caderno-digital", "workspace");
    var rules = [];
    for (var i = 0; i < 15; i++) {
      var y = 112 + i * 29;
      rules.push(
        '<line x1="120" y1="' +
          y +
          '" x2="898" y2="' +
          y +
          '" stroke="' +
          PALETTE.cobalt +
          '" stroke-width="0.7" opacity="0.16"/>'
      );
    }
    var body =
      windowFrame(28, 26, 904, 548, "CADERNO DIGITAL · GEOMETRIA ANALÍTICA · FOLHA 3", "OFFLINE · SALVO") +
      // Left vertical stylus tool rail
      '<rect x="28" y="60" width="70" height="514" fill="' +
      PALETTE.cardboard +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.1"/>' +
      // Tool buttons in rail
      '<rect x="42" y="82" width="42" height="42" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<polygon points="63,92 69,107 63,115 57,107" fill="' +
      PALETTE.paperHighlight +
      '"/>' +
      '<rect x="42" y="136" width="42" height="42" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.3"/>' +
      '<circle cx="63" cy="157" r="11" fill="none" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.6"/>' +
      '<rect x="42" y="190" width="42" height="42" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      '<line x1="51" y1="211" x2="75" y2="211" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.8"/>' +
      '<rect x="42" y="244" width="42" height="42" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      '<rect x="53" y="258" width="20" height="14" fill="none" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.4"/>' +
      // Ink palette dots at bottom of rail
      '<circle cx="63" cy="466" r="8" fill="' +
      PALETTE.ink +
      '"/>' +
      '<circle cx="63" cy="494" r="8" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<circle cx="63" cy="522" r="8" fill="' +
      PALETTE.vermilion +
      '"/>' +
      // Top mini bar above notebook page
      '<rect x="98" y="60" width="834" height="36" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.9"/>' +
      '<text x="120" y="82" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.3" fill="' +
      PALETTE.cobalt +
      '">ENCAIXE MAGNÉTICO · ATIVO</text>' +
      '<text x="348" y="82" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.muted +
      '">PRESSÃO · DUPLA CAMADA</text>' +
      '<rect x="782" y="67" width="128" height="22" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      '<text x="846" y="81" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="9.5" font-weight="600" letter-spacing="1.1" fill="' +
      PALETTE.ink +
      '">EXPORTAR PDF</text>' +
      // Ruled archival sheet
      '<rect x="116" y="106" width="796" height="452" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      rules.join("") +
      '<line x1="162" y1="106" x2="162" y2="558" stroke="' +
      PALETTE.vermilion +
      '" stroke-width="0.9" opacity="0.34"/>' +
      // Left side of sheet: Expressive handwritten calligraphic ink notes & pressure curves
      '<text x="184" y="156" font-family="' +
      SERIF_FONT +
      '" font-size="23" font-style="italic" fill="' +
      PALETTE.ink +
      '">Relações tangenciais &amp; projeção</text>' +
      '<path d="M 184 224 C 216 184, 276 182, 294 218 C 312 254, 232 308, 250 352 C 266 392, 336 376, 386 334 C 344 394, 252 414, 232 362 C 212 308, 290 248, 274 222 C 258 196, 214 206, 184 224 Z" fill="' +
      PALETTE.ink +
      '"/>' +
      '<path d="M 192 232 C 220 198, 266 196, 282 226 C 296 254, 226 306, 240 344 C 252 376, 308 364, 344 338 C 314 374, 244 390, 228 350 C 212 306, 282 252, 268 228 C 254 204, 216 212, 192 232 Z" fill="' +
      PALETTE.vermilion +
      '" opacity="0.72"/>' +
      '<path d="M 188 442 Q 254 422 332 438 T 446 432" fill="none" stroke="' +
      PALETTE.ink +
      '" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M 188 474 Q 262 464 344 472" fill="none" stroke="' +
      PALETTE.muted +
      '" stroke-width="1.5" stroke-linecap="round"/>' +
      // Right side of sheet: Snapped Cobalt Circle + Inscribed Triangle + Magnetic Guides
      '<line x1="650" y1="136" x2="650" y2="528" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="0.9" stroke-dasharray="4 4" opacity="0.55"/>' +
      '<line x1="468" y1="334" x2="844" y2="334" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="0.9" stroke-dasharray="4 4" opacity="0.55"/>' +
      '<circle cx="650" cy="334" r="134" fill="url(#' +
      uid("dots") +
      ')" opacity="0.45"/>' +
      '<circle cx="650" cy="334" r="134" fill="none" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="2.6"/>' +
      '<polygon points="650,200 766,401 534,401" fill="' +
      PALETTE.cobalt +
      '" fill-opacity="0.08" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="2"/>' +
      // Magnetic snap vertex squares & vermilion focal snap lock
      '<rect x="645" y="195" width="10" height="10" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.8"/>' +
      '<rect x="761" y="396" width="10" height="10" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.8"/>' +
      '<rect x="529" y="396" width="10" height="10" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.8"/>' +
      '<circle cx="650" cy="334" r="5" fill="' +
      PALETTE.vermilion +
      '"/>' +
      '<circle cx="650" cy="334" r="14" fill="none" stroke="' +
      PALETTE.vermilion +
      '" stroke-width="1.2"/>' +
      // Floating snap badge
      '<rect x="706" y="170" width="166" height="24" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<text x="789" y="186" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="9.5" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.paperHighlight +
      '">FORMA RECONHECIDA</text>';
    return wfShell(uid, body);
  }

  function buildCadernoWfLibrary(idPrefix) {
    var uid = makeUid(idPrefix || "gal", "caderno-digital", "library");
    var body =
      windowFrame(32, 30, 896, 540, "BIBLIOTECA DE MATÉRIAS & CADERNOS", "INDEXEDDB LOCAL") +
      // Left Subjects Sidebar
      '<rect x="32" y="64" width="234" height="506" fill="' +
      PALETTE.cardboard +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.1"/>' +
      '<text x="54" y="102" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.5" fill="' +
      PALETTE.muted +
      '">MATÉRIAS</text>' +
      '<rect x="48" y="118" width="202" height="36" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<text x="64" y="140" font-family="' +
      SANS_FONT +
      '" font-size="11.5" font-weight="600" fill="' +
      PALETTE.paperHighlight +
      '">Geometria &amp; Cálculo</text>' +
      '<rect x="48" y="164" width="202" height="34" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.9"/>' +
      '<text x="64" y="185" font-family="' +
      SANS_FONT +
      '" font-size="11.5" font-weight="500" fill="' +
      PALETTE.ink +
      '">Arquitetura de Sistemas</text>' +
      '<rect x="48" y="208" width="202" height="34" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.9"/>' +
      '<text x="64" y="229" font-family="' +
      SANS_FONT +
      '" font-size="11.5" font-weight="500" fill="' +
      PALETTE.ink +
      '">Rascunhos de Interface</text>' +
      '<rect x="48" y="252" width="202" height="34" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.9"/>' +
      '<text x="64" y="273" font-family="' +
      SANS_FONT +
      '" font-size="11.5" font-weight="500" fill="' +
      PALETTE.ink +
      '">Caderno de Estudos</text>' +
      // Offline status box at sidebar bottom
      '<rect x="48" y="486" width="202" height="62" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      '<circle cx="64" cy="508" r="4" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<text x="76" y="512" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.1" fill="' +
      PALETTE.cobalt +
      '">ARMAZENAMENTO OFFLINE</text>' +
      '<text x="64" y="534" font-family="' +
      SANS_FONT +
      '" font-size="10.5" fill="' +
      PALETTE.muted +
      '">18 folhas vetoriais salvas</text>' +
      // Right Notebooks Grid Header
      '<text x="294" y="106" font-family="' +
      SERIF_FONT +
      '" font-size="24" fill="' +
      PALETTE.ink +
      '">Geometria &amp; Cálculo</text>' +
      '<rect x="760" y="84" width="140" height="32" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<text x="830" y="104" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="10.5" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.paperHighlight +
      '">+ NOVO CADERNO</text>' +
      // Notebook Card 1
      '<rect x="294" y="132" width="292" height="196" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.2"/>' +
      '<rect x="308" y="146" width="264" height="114" fill="' +
      PALETTE.cardboard +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.8"/>' +
      '<circle cx="440" cy="203" r="36" fill="none" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="2"/>' +
      '<polygon points="440,167 471,221 409,221" fill="none" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.4"/>' +
      '<circle cx="440" cy="203" r="3.5" fill="' +
      PALETTE.vermilion +
      '"/>' +
      '<text x="308" y="284" font-family="' +
      SERIF_FONT +
      '" font-size="17" fill="' +
      PALETTE.ink +
      '">Projeções &amp; Tangentes</text>' +
      '<text x="308" y="306" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.1" fill="' +
      PALETTE.muted +
      '">6 PÁGINAS · ATUALIZADO HOJE</text>' +
      // Notebook Card 2
      '<rect x="608" y="132" width="292" height="196" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.2"/>' +
      '<rect x="622" y="146" width="264" height="114" fill="' +
      PALETTE.cardboard +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.8"/>' +
      '<path d="M 654 226 Q 714 162 778 214 T 858 176" fill="none" stroke="' +
      PALETTE.ink +
      '" stroke-width="2.4"/>' +
      '<path d="M 654 234 Q 724 184 794 222" fill="none" stroke="' +
      PALETTE.vermilion +
      '" stroke-width="1.5"/>' +
      '<line x1="646" y1="238" x2="862" y2="238" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1" stroke-dasharray="4 3"/>' +
      '<text x="622" y="284" font-family="' +
      SERIF_FONT +
      '" font-size="17" fill="' +
      PALETTE.ink +
      '">Curvas de Pressão</text>' +
      '<text x="622" y="306" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.1" fill="' +
      PALETTE.muted +
      '">8 PÁGINAS · PAUTA FINE</text>' +
      // Notebook Card 3
      '<rect x="294" y="348" width="292" height="196" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.2"/>' +
      '<rect x="308" y="362" width="264" height="114" fill="' +
      PALETTE.cardboard +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.8"/>' +
      '<rect x="348" y="384" width="66" height="44" fill="none" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.6"/>' +
      '<rect x="462" y="408" width="70" height="44" fill="none" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.6"/>' +
      '<line x1="414" y1="406" x2="462" y2="428" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.5"/>' +
      '<text x="308" y="500" font-family="' +
      SERIF_FONT +
      '" font-size="17" fill="' +
      PALETTE.ink +
      '">Diagramas Vetoriais</text>' +
      '<text x="308" y="522" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.1" fill="' +
      PALETTE.muted +
      '">4 PÁGINAS · GRADE PONTILHADA</text>' +
      // Notebook Card 4 (Create slot)
      '<rect x="608" y="348" width="292" height="196" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.2" stroke-dasharray="6 4"/>' +
      '<circle cx="754" cy="432" r="24" fill="none" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.5"/>' +
      '<line x1="744" y1="432" x2="764" y2="432" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.8"/>' +
      '<line x1="754" y1="422" x2="754" y2="442" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.8"/>' +
      '<text x="754" y="484" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="11" font-weight="600" letter-spacing="1.3" fill="' +
      PALETTE.cobalt +
      '">NOVA FOLHA EM BRANCO</text>';
    return wfShell(uid, body);
  }

  function buildCadernoWfPdf(idPrefix) {
    var uid = makeUid(idPrefix || "gal", "caderno-digital", "pdf");
    var body =
      windowFrame(36, 30, 888, 540, "EXPORTAÇÃO VETORIAL · PRÉ-VISUALIZAÇÃO PDF", "A4 · VETOR PURO") +
      // Left print-preview desk with 2 crisp A4 sheets
      '<rect x="56" y="84" width="582" height="464" fill="' +
      PALETTE.sand +
      '" opacity="0.58" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      // Page 1 A4
      '<rect x="88" y="122" width="246" height="348" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.25"/>' +
      // Cobalt bounding-box fit crop corners on Page 1
      '<rect x="108" y="144" width="206" height="304" fill="none" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="0.9" stroke-dasharray="4 4"/>' +
      '<text x="120" y="176" font-family="' +
      SERIF_FONT +
      '" font-size="14" fill="' +
      PALETTE.ink +
      '">Estudo de Curvas</text>' +
      '<path d="M 122 232 C 148 192, 198 206, 184 246 C 170 282, 232 292, 276 238" fill="none" stroke="' +
      PALETTE.ink +
      '" stroke-width="2.2"/>' +
      '<circle cx="212" cy="356" r="54" fill="none" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.8"/>' +
      '<polygon points="212,302 258,382 166,382" fill="none" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.3"/>' +
      '<circle cx="212" cy="356" r="3" fill="' +
      PALETTE.vermilion +
      '"/>' +
      '<text x="211" y="496" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.muted +
      '">PÁGINA 1</text>' +
      // Page 2 A4
      '<rect x="360" y="122" width="246" height="348" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.25"/>' +
      '<rect x="380" y="144" width="206" height="304" fill="none" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="0.9" stroke-dasharray="4 4"/>' +
      '<text x="392" y="176" font-family="' +
      SERIF_FONT +
      '" font-size="14" fill="' +
      PALETTE.ink +
      '">Notas de Projeto</text>' +
      '<line x1="392" y1="208" x2="564" y2="208" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.4"/>' +
      '<line x1="392" y1="232" x2="538" y2="232" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.1" opacity="0.6"/>' +
      '<line x1="392" y1="256" x2="554" y2="256" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.1" opacity="0.6"/>' +
      '<rect x="396" y="286" width="170" height="122" fill="url(#' +
      uid("dots") +
      ')" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.3"/>' +
      '<line x1="396" y1="347" x2="566" y2="347" stroke="' +
      PALETTE.vermilion +
      '" stroke-width="1.2"/>' +
      '<text x="483" y="496" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.muted +
      '">PÁGINA 2</text>' +
      // Right Inspector Controls
      '<rect x="658" y="84" width="246" height="464" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.1"/>' +
      '<text x="678" y="118" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.4" fill="' +
      PALETTE.cobalt +
      '">AJUSTE DE IMPRESSÃO</text>' +
      '<text x="678" y="156" font-family="' +
      SANS_FONT +
      '" font-size="10.5" font-weight="600" fill="' +
      PALETTE.muted +
      '">FORMATO</text>' +
      '<rect x="678" y="166" width="206" height="34" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      '<text x="692" y="187" font-family="' +
      SANS_FONT +
      '" font-size="11.5" font-weight="600" fill="' +
      PALETTE.ink +
      '">A4 Retrato · 2 Páginas</text>' +
      '<text x="678" y="232" font-family="' +
      SANS_FONT +
      '" font-size="10.5" font-weight="600" fill="' +
      PALETTE.muted +
      '">ENQUADRAMENTO</text>' +
      '<rect x="678" y="242" width="206" height="34" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.3"/>' +
      '<text x="692" y="263" font-family="' +
      SANS_FONT +
      '" font-size="11.5" font-weight="600" fill="' +
      PALETTE.cobalt +
      '">Ajuste Automático de Margem</text>' +
      '<text x="678" y="308" font-family="' +
      SANS_FONT +
      '" font-size="10.5" font-weight="600" fill="' +
      PALETTE.muted +
      '">SAÍDA</text>' +
      '<rect x="678" y="318" width="206" height="34" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      '<text x="692" y="339" font-family="' +
      SANS_FONT +
      '" font-size="11.5" font-weight="600" fill="' +
      PALETTE.ink +
      '">Curvas Vetoriais Puras</text>' +
      '<rect x="678" y="476" width="206" height="46" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<text x="781" y="504" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="11" font-weight="600" letter-spacing="1.4" fill="' +
      PALETTE.paperHighlight +
      '">BAIXAR PDF VETORIAL</text>';
    return wfShell(uid, body);
  }

  /* ========================================================================
     3. PROJCATÁLOGOS — Architecture Diagram & 3 Wireframe Plates
     ======================================================================== */
  function buildProjCatalogosArchSVG(idPrefix) {
    var uid = makeUid(idPrefix || "arch", "projcatalogos");
    var body =
      archCard(
        36,
        52,
        196,
        106,
        "LOJA PÚBLICA",
        "Vitrine Multi-Tema",
        "Busca inteligente e filtros",
        "Carrinho lateral responsivo",
        { accent: PALETTE.cobalt, titleSize: 15.5 }
      ) +
      archCard(
        36,
        198,
        196,
        106,
        "OPERAÇÃO INTERNA",
        "Painel Administrativo",
        "Produtos, zonas e horários",
        "Identidade white-label",
        { accent: PALETTE.ink, titleSize: 14.5 }
      ) +
      '<polyline points="232,105 252,105 252,158 270,158" fill="none" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.7" marker-end="url(#' +
      uid("arr-cobalt") +
      ')"/>' +
      '<polyline points="232,251 252,251 252,196 270,196" fill="none" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.5" marker-end="url(#' +
      uid("arr-ink") +
      ')"/>' +
      archCard(
        276,
        112,
        200,
        132,
        "APLICAÇÃO FULL STACK",
        "Next.js App Router",
        "Rotas, validação e temas",
        "Cálculo de carrinho e frete",
        { accent: PALETTE.cobalt, dot: PALETTE.cobalt, titleSize: 15.5 }
      ) +
      '<line x1="476" y1="178" x2="514" y2="178" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.8" marker-end="url(#' +
      uid("arr-cobalt") +
      ')"/>' +
      archCard(
        520,
        112,
        196,
        132,
        "CAMADA DE DADOS",
        "Drizzle & PostgreSQL",
        "Catálogo e estoque",
        "Zonas de entrega e pedidos",
        { accent: PALETTE.ink, titleSize: 15 }
      ) +
      // Flow to Delivery/PIX engine and WhatsApp Checkout
      '<polyline points="716,154 736,154 736,105 752,105" fill="none" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.6" marker-end="url(#' +
      uid("arr-cobalt") +
      ')"/>' +
      '<line x1="841" y1="158" x2="841" y2="192" stroke="' +
      PALETTE.vermilion +
      '" stroke-width="1.6" marker-end="url(#' +
      uid("arr-vermilion") +
      ')"/>' +
      archCard(
        758,
        52,
        166,
        106,
        "REGRAS DE ENVIO",
        "Zonas & PIX",
        "Frete por bairro",
        "Horário em tempo real",
        { accent: PALETTE.vermilion, titleSize: 15.5, dot: PALETTE.vermilion }
      ) +
      archCard(
        758,
        198,
        166,
        106,
        "CONVERSÃO DIRETA",
        "Pedido WhatsApp",
        "Mensagem estruturada",
        "Confirmação instantânea",
        { accent: PALETTE.cobalt, titleSize: 15.5 }
      );

    return archShell(
      uid,
      "Diagrama de arquitetura do ProjCatálogos: vitrine multi-tema e painel admin sobre Next.js App Router, Drizzle ORM com PostgreSQL, regras de zonas de entrega e checkout via WhatsApp",
      body
    );
  }

  function buildProjCatalogosWfStorefront(idPrefix) {
    var uid = makeUid(idPrefix || "gal", "projcatalogos", "storefront");
    var cards = [
      { x: 56, y: 218, name: "Vitamina C Pura", cat: "DERMOCOSMÉTICOS", price: "R$ 58,90", shape: "bottle" },
      { x: 344, y: 218, name: "Hidratante Facial", cat: "CUIDADOS DIÁRIOS", price: "R$ 44,50", shape: "jar" },
      { x: 632, y: 218, name: "Protetor Solar FPS", cat: "DERMOCOSMÉTICOS", price: "R$ 69,00", shape: "tube" },
      { x: 56, y: 394, name: "Complexo B Diário", cat: "VITAMINAS", price: "R$ 32,00", shape: "bottle" },
      { x: 344, y: 394, name: "Sabonete Suave", cat: "CUIDADOS DIÁRIOS", price: "R$ 24,90", shape: "jar" },
      { x: 632, y: 394, name: "Soro Fisiológico", cat: "ESSENCIAIS", price: "R$ 14,50", shape: "tube" }
    ];
    var cardSvg = cards
      .map(function (c) {
        var icon =
          c.shape === "bottle"
            ? '<rect x="' +
              (c.x + 28) +
              '" y="' +
              (c.y + 30) +
              '" width="28" height="44" rx="4" fill="' +
              PALETTE.cobalt +
              '"/>' +
              '<rect x="' +
              (c.x + 35) +
              '" y="' +
              (c.y + 22) +
              '" width="14" height="8" fill="' +
              PALETTE.ink +
              '"/>' +
              '<rect x="' +
              (c.x + 32) +
              '" y="' +
              (c.y + 44) +
              '" width="20" height="16" fill="' +
              PALETTE.paperHighlight +
              '"/>'
            : c.shape === "jar"
              ? '<rect x="' +
                (c.x + 22) +
                '" y="' +
                (c.y + 40) +
                '" width="40" height="34" rx="3" fill="' +
                PALETTE.ink +
                '"/>' +
                '<rect x="' +
                (c.x + 25) +
                '" y="' +
                (c.y + 32) +
                '" width="34" height="8" fill="' +
                PALETTE.cobalt +
                '"/>' +
                '<rect x="' +
                (c.x + 28) +
                '" y="' +
                (c.y + 50) +
                '" width="28" height="14" fill="' +
                PALETTE.paperHighlight +
                '"/>'
              : '<polygon points="' +
                (c.x + 26) +
                "," +
                (c.y + 26) +
                " " +
                (c.x + 58) +
                "," +
                (c.y + 26) +
                " " +
                (c.x + 50) +
                "," +
                (c.y + 68) +
                " " +
                (c.x + 34) +
                "," +
                (c.y + 68) +
                '" fill="' +
                PALETTE.cobalt +
                '"/>' +
                '<rect x="' +
                (c.x + 36) +
                '" y="' +
                (c.y + 68) +
                '" width="12" height="7" fill="' +
                PALETTE.ink +
                '"/>';
        return (
          '<rect x="' +
          c.x +
          '" y="' +
          c.y +
          '" width="272" height="156" fill="' +
          PALETTE.paperHighlight +
          '" stroke="' +
          PALETTE.ink +
          '" stroke-width="1.15"/>' +
          '<rect x="' +
          (c.x + 12) +
          '" y="' +
          (c.y + 14) +
          '" width="62" height="80" fill="' +
          PALETTE.cardboard +
          '" stroke="' +
          PALETTE.ink +
          '" stroke-width="0.75"/>' +
          icon +
          '<text x="' +
          (c.x + 88) +
          '" y="' +
          (c.y + 34) +
          '" font-family="' +
          SANS_FONT +
          '" font-size="9" font-weight="600" letter-spacing="1.1" fill="' +
          PALETTE.muted +
          '">' +
          escapeXML(c.cat) +
          "</text>" +
          '<text x="' +
          (c.x + 88) +
          '" y="' +
          (c.y + 58) +
          '" font-family="' +
          SERIF_FONT +
          '" font-size="16.5" fill="' +
          PALETTE.ink +
          '">' +
          escapeXML(c.name) +
          "</text>" +
          '<text x="' +
          (c.x + 88) +
          '" y="' +
          (c.y + 84) +
          '" font-family="' +
          SANS_FONT +
          '" font-size="14" font-weight="600" fill="' +
          PALETTE.ink +
          '">' +
          escapeXML(c.price) +
          "</text>" +
          '<rect x="' +
          (c.x + 14) +
          '" y="' +
          (c.y + 112) +
          '" width="244" height="30" fill="' +
          PALETTE.paper +
          '" stroke="' +
          PALETTE.cobalt +
          '" stroke-width="1.2"/>' +
          '<text x="' +
          (c.x + 136) +
          '" y="' +
          (c.y + 131) +
          '" text-anchor="middle" font-family="' +
          SANS_FONT +
          '" font-size="10" font-weight="600" letter-spacing="1.3" fill="' +
          PALETTE.cobalt +
          '">+ ADICIONAR À SACOLA</text>'
        );
      })
      .join("");

    var body =
      windowFrame(32, 26, 896, 548, "DROGARIA VILA SAÚDE · VITRINE DIGITAL", "TEMA WHITE-LABEL") +
      // Storefront Header Bar
      '<text x="56" y="98" font-family="' +
      SERIF_FONT +
      '" font-size="24" fill="' +
      PALETTE.ink +
      '">Drogaria Vila Saúde</text>' +
      '<circle cx="294" cy="90" r="4.5" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<text x="306" y="94" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.cobalt +
      '">ABERTO · ENTREGA ATÉ 21H</text>' +
      // Smart Search Bar + Cart Pill
      '<rect x="524" y="74" width="248" height="34" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.15"/>' +
      '<text x="540" y="95" font-family="' +
      SANS_FONT +
      '" font-size="11" fill="' +
      PALETTE.muted +
      '">Buscar produto ou categoria...</text>' +
      '<rect x="784" y="74" width="120" height="34" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<text x="844" y="95" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="10.5" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.paperHighlight +
      '">SACOLA · 3</text>' +
      // Category Pills Row
      '<line x1="56" y1="124" x2="904" y2="124" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.8" opacity="0.22"/>' +
      '<rect x="56" y="140" width="96" height="30" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<text x="104" y="159" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.paperHighlight +
      '">TODOS</text>' +
      '<rect x="162" y="140" width="154" height="30" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      '<text x="239" y="159" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.1" fill="' +
      PALETTE.ink +
      '">DERMOCOSMÉTICOS</text>' +
      '<rect x="326" y="140" width="144" height="30" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      '<text x="398" y="159" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.1" fill="' +
      PALETTE.ink +
      '">CUIDADOS DIÁRIOS</text>' +
      '<rect x="480" y="140" width="114" height="30" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      '<text x="537" y="159" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.1" fill="' +
      PALETTE.ink +
      '">VITAMINAS</text>' +
      '<rect x="604" y="140" width="122" height="30" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      '<text x="665" y="159" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.1" fill="' +
      PALETTE.ink +
      '">ESSENCIAIS</text>' +
      '<text x="56" y="202" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.4" fill="' +
      PALETTE.muted +
      '">DESTAQUES DO CATÁLOGO</text>' +
      cardSvg;
    return wfShell(uid, body);
  }

  function buildProjCatalogosWfCheckout(idPrefix) {
    var uid = makeUid(idPrefix || "gal", "projcatalogos", "checkout");
    var body =
      windowFrame(32, 26, 896, 548, "CARRINHO LATERAL & CHECKOUT WHATSAPP", "ZONA DE ENTREGA") +
      // Left muted storefront backdrop
      '<rect x="32" y="60" width="440" height="514" fill="' +
      PALETTE.sand +
      '" opacity="0.52"/>' +
      '<rect x="58" y="94" width="184" height="170" fill="' +
      PALETTE.paper +
      '" opacity="0.65" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.9"/>' +
      '<rect x="260" y="94" width="184" height="170" fill="' +
      PALETTE.paper +
      '" opacity="0.65" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.9"/>' +
      '<rect x="58" y="286" width="184" height="170" fill="' +
      PALETTE.paper +
      '" opacity="0.65" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.9"/>' +
      '<rect x="260" y="286" width="184" height="170" fill="' +
      PALETTE.paper +
      '" opacity="0.65" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.9"/>' +
      // Elevated Slide-Over Cart Drawer on Right
      '<rect x="472" y="60" width="456" height="514" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.5"/>' +
      '<text x="498" y="98" font-family="' +
      SERIF_FONT +
      '" font-size="22" fill="' +
      PALETTE.ink +
      '">Sua Sacola</text>' +
      '<text x="902" y="96" text-anchor="end" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.cobalt +
      '">3 ITENS</text>' +
      '<line x1="498" y1="112" x2="902" y2="112" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.9" opacity="0.26"/>' +
      // Cart Item 1
      '<text x="498" y="142" font-family="' +
      SERIF_FONT +
      '" font-size="16" fill="' +
      PALETTE.ink +
      '">Vitamina C Pura</text>' +
      '<text x="498" y="160" font-family="' +
      SANS_FONT +
      '" font-size="11" fill="' +
      PALETTE.muted +
      '">R$ 58,90 cada</text>' +
      '<rect x="816" y="130" width="86" height="28" fill="' +
      PALETTE.cardboard +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      '<text x="859" y="149" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="12" font-weight="600" fill="' +
      PALETTE.ink +
      '">-   1   +</text>' +
      // Cart Item 2
      '<line x1="498" y1="176" x2="902" y2="176" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.7" opacity="0.18"/>' +
      '<text x="498" y="204" font-family="' +
      SERIF_FONT +
      '" font-size="16" fill="' +
      PALETTE.ink +
      '">Hidratante Facial</text>' +
      '<text x="498" y="222" font-family="' +
      SANS_FONT +
      '" font-size="11" fill="' +
      PALETTE.muted +
      '">R$ 44,50 cada</text>' +
      '<rect x="816" y="192" width="86" height="28" fill="' +
      PALETTE.cardboard +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      '<text x="859" y="211" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="12" font-weight="600" fill="' +
      PALETTE.ink +
      '">-   1   +</text>' +
      // Delivery Zone Calculator Card
      '<rect x="498" y="246" width="404" height="94" fill="' +
      PALETTE.cardboard +
      '" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.25"/>' +
      '<circle cx="536" cy="293" r="24" fill="none" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1" stroke-dasharray="3 3"/>' +
      '<circle cx="536" cy="293" r="13" fill="' +
      PALETTE.cobalt +
      '" opacity="0.16" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.2"/>' +
      '<circle cx="536" cy="293" r="4" fill="' +
      PALETTE.vermilion +
      '"/>' +
      '<text x="576" y="274" font-family="' +
      SANS_FONT +
      '" font-size="9.5" font-weight="600" letter-spacing="1.3" fill="' +
      PALETTE.cobalt +
      '">ZONA DE ENTREGA SELECIONADA</text>' +
      '<text x="576" y="298" font-family="' +
      SERIF_FONT +
      '" font-size="17" fill="' +
      PALETTE.ink +
      '">Jardim Primavera · 25 min</text>' +
      '<text x="576" y="320" font-family="' +
      SANS_FONT +
      '" font-size="11" font-weight="600" fill="' +
      PALETTE.muted +
      '">Taxa calculada automaticamente: R$ 7,00</text>' +
      // Payment Method Selector (PIX Active)
      '<text x="498" y="370" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.3" fill="' +
      PALETTE.muted +
      '">FORMA DE PAGAMENTO</text>' +
      '<rect x="498" y="382" width="126" height="34" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<text x="561" y="403" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="11" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.paperHighlight +
      '">PIX</text>' +
      '<rect x="636" y="382" width="128" height="34" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      '<text x="700" y="403" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="11" font-weight="600" letter-spacing="1.1" fill="' +
      PALETTE.ink +
      '">CARTÃO</text>' +
      '<rect x="776" y="382" width="126" height="34" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      '<text x="839" y="403" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="11" font-weight="600" letter-spacing="1.1" fill="' +
      PALETTE.ink +
      '">DINHEIRO</text>' +
      // Total + WhatsApp Submit Button
      '<line x1="498" y1="436" x2="902" y2="436" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      '<text x="498" y="468" font-family="' +
      SANS_FONT +
      '" font-size="11" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.muted +
      '">TOTAL DO PEDIDO</text>' +
      '<text x="902" y="470" text-anchor="end" font-family="' +
      SERIF_FONT +
      '" font-size="24" fill="' +
      PALETTE.ink +
      '">R$ 110,40</text>' +
      '<rect x="498" y="496" width="404" height="50" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<text x="700" y="526" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="12" font-weight="600" letter-spacing="1.5" fill="' +
      PALETTE.paperHighlight +
      '">ENVIAR PEDIDO NO WHATSAPP</text>';
    return wfShell(uid, body);
  }

  function buildProjCatalogosWfAdmin(idPrefix) {
    var uid = makeUid(idPrefix || "gal", "projcatalogos", "admin");
    var body =
      windowFrame(32, 26, 896, 548, "PAINEL ADMINISTRATIVO · GESTÃO DA LOJA", "POSTGRESQL · DRIZZLE") +
      // Left Navigation Rail
      '<rect x="32" y="60" width="196" height="514" fill="' +
      PALETTE.cardboard +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.1"/>' +
      '<text x="50" y="96" font-family="' +
      SANS_FONT +
      '" font-size="9.5" font-weight="600" letter-spacing="1.4" fill="' +
      PALETTE.muted +
      '">BACK-OFFICE</text>' +
      '<rect x="46" y="112" width="168" height="34" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<text x="60" y="133" font-family="' +
      SANS_FONT +
      '" font-size="11" font-weight="600" fill="' +
      PALETTE.paperHighlight +
      '">Produtos &amp; Estoque</text>' +
      '<text x="60" y="174" font-family="' +
      SANS_FONT +
      '" font-size="11.5" font-weight="500" fill="' +
      PALETTE.ink +
      '">Fila de Pedidos</text>' +
      '<text x="60" y="210" font-family="' +
      SANS_FONT +
      '" font-size="11.5" font-weight="500" fill="' +
      PALETTE.ink +
      '">Categorias</text>' +
      '<text x="60" y="246" font-family="' +
      SANS_FONT +
      '" font-size="11.5" font-weight="500" fill="' +
      PALETTE.ink +
      '">Zonas de Entrega</text>' +
      '<text x="60" y="282" font-family="' +
      SANS_FONT +
      '" font-size="11.5" font-weight="500" fill="' +
      PALETTE.ink +
      '">Horários da Loja</text>' +
      '<text x="60" y="318" font-family="' +
      SANS_FONT +
      '" font-size="11.5" font-weight="500" fill="' +
      PALETTE.ink +
      '">Identidade &amp; Tema</text>' +
      // Top KPI Row
      '<rect x="248" y="82" width="206" height="84" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.1"/>' +
      '<text x="264" y="106" font-family="' +
      SANS_FONT +
      '" font-size="9.5" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.muted +
      '">ITENS NO CATÁLOGO</text>' +
      '<text x="264" y="144" font-family="' +
      SERIF_FONT +
      '" font-size="30" fill="' +
      PALETTE.ink +
      '">148</text>' +
      '<rect x="472" y="82" width="206" height="84" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.1"/>' +
      '<text x="488" y="106" font-family="' +
      SANS_FONT +
      '" font-size="9.5" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.cobalt +
      '">PEDIDOS HOJE</text>' +
      '<text x="488" y="144" font-family="' +
      SERIF_FONT +
      '" font-size="30" fill="' +
      PALETTE.cobalt +
      '">32</text>' +
      '<rect x="696" y="82" width="212" height="84" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.1"/>' +
      '<text x="712" y="106" font-family="' +
      SANS_FONT +
      '" font-size="9.5" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.muted +
      '">ZONAS ATIVAS</text>' +
      '<text x="712" y="144" font-family="' +
      SERIF_FONT +
      '" font-size="30" fill="' +
      PALETTE.ink +
      '">9 bairros</text>' +
      // Products Management Table (Left-Center)
      '<rect x="248" y="186" width="430" height="364" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.15"/>' +
      '<text x="266" y="216" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.3" fill="' +
      PALETTE.cobalt +
      '">CATÁLOGO &amp; DISPONIBILIDADE</text>' +
      '<line x1="266" y1="230" x2="660" y2="230" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.9" opacity="0.28"/>' +
      // Table rows
      '<text x="266" y="264" font-family="' +
      SERIF_FONT +
      '" font-size="16" fill="' +
      PALETTE.ink +
      '">Vitamina C Pura</text>' +
      '<text x="484" y="264" font-family="' +
      SANS_FONT +
      '" font-size="12" font-weight="600" fill="' +
      PALETTE.ink +
      '">R$ 58,90</text>' +
      '<rect x="596" y="248" width="60" height="22" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<text x="626" y="263" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="9" font-weight="600" fill="' +
      PALETTE.paperHighlight +
      '">ATIVO</text>' +
      '<line x1="266" y1="286" x2="660" y2="286" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.7" opacity="0.18"/>' +
      '<text x="266" y="320" font-family="' +
      SERIF_FONT +
      '" font-size="16" fill="' +
      PALETTE.ink +
      '">Hidratante Facial</text>' +
      '<text x="484" y="320" font-family="' +
      SANS_FONT +
      '" font-size="12" font-weight="600" fill="' +
      PALETTE.ink +
      '">R$ 44,50</text>' +
      '<rect x="596" y="304" width="60" height="22" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<text x="626" y="319" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="9" font-weight="600" fill="' +
      PALETTE.paperHighlight +
      '">ATIVO</text>' +
      '<line x1="266" y1="342" x2="660" y2="342" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.7" opacity="0.18"/>' +
      '<text x="266" y="376" font-family="' +
      SERIF_FONT +
      '" font-size="16" fill="' +
      PALETTE.ink +
      '">Protetor Solar FPS</text>' +
      '<text x="484" y="376" font-family="' +
      SANS_FONT +
      '" font-size="12" font-weight="600" fill="' +
      PALETTE.ink +
      '">R$ 69,00</text>' +
      '<rect x="596" y="360" width="60" height="22" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<text x="626" y="375" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="9" font-weight="600" fill="' +
      PALETTE.paperHighlight +
      '">ATIVO</text>' +
      '<line x1="266" y1="398" x2="660" y2="398" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.7" opacity="0.18"/>' +
      '<text x="266" y="432" font-family="' +
      SERIF_FONT +
      '" font-size="16" fill="' +
      PALETTE.muted +
      '">Sabonete Suave</text>' +
      '<text x="484" y="432" font-family="' +
      SANS_FONT +
      '" font-size="12" font-weight="600" fill="' +
      PALETTE.muted +
      '">R$ 24,90</text>' +
      '<rect x="596" y="416" width="60" height="22" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.vermilion +
      '" stroke-width="1.1"/>' +
      '<text x="626" y="431" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="9" font-weight="600" fill="' +
      PALETTE.vermilion +
      '">PAUSA</text>' +
      // Right Store Hours Settings Panel
      '<rect x="696" y="186" width="212" height="364" fill="' +
      PALETTE.cardboard +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.15"/>' +
      '<text x="714" y="216" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.3" fill="' +
      PALETTE.ink +
      '">HORÁRIOS DA LOJA</text>' +
      '<line x1="714" y1="230" x2="890" y2="230" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.9" opacity="0.28"/>' +
      '<text x="714" y="260" font-family="' +
      SANS_FONT +
      '" font-size="10.5" font-weight="600" fill="' +
      PALETTE.muted +
      '">SEGUNDA A SEXTA</text>' +
      '<rect x="714" y="270" width="176" height="32" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      '<text x="728" y="291" font-family="' +
      SANS_FONT +
      '" font-size="12" font-weight="600" fill="' +
      PALETTE.ink +
      '">08:00 — 21:00</text>' +
      '<text x="714" y="334" font-family="' +
      SANS_FONT +
      '" font-size="10.5" font-weight="600" fill="' +
      PALETTE.muted +
      '">SÁBADO</text>' +
      '<rect x="714" y="344" width="176" height="32" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      '<text x="728" y="365" font-family="' +
      SANS_FONT +
      '" font-size="12" font-weight="600" fill="' +
      PALETTE.ink +
      '">08:00 — 18:00</text>' +
      '<text x="714" y="408" font-family="' +
      SANS_FONT +
      '" font-size="10.5" font-weight="600" fill="' +
      PALETTE.muted +
      '">DOMINGO</text>' +
      '<rect x="714" y="418" width="176" height="32" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1" stroke-dasharray="3 3"/>' +
      '<text x="728" y="439" font-family="' +
      SANS_FONT +
      '" font-size="11.5" font-weight="500" fill="' +
      PALETTE.muted +
      '">Plantão · 09:00 — 13:00</text>' +
      '<rect x="714" y="486" width="176" height="42" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<text x="802" y="511" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="10.5" font-weight="600" letter-spacing="1.3" fill="' +
      PALETTE.paperHighlight +
      '">SALVAR HORÁRIOS</text>';
    return wfShell(uid, body);
  }

  /* ========================================================================
     4. CUTSYNC — Architecture Diagram & 3 Wireframe Plates
     ======================================================================== */
  function buildCutSyncArchSVG(idPrefix) {
    var uid = makeUid(idPrefix || "arch", "cutsync");
    var body =
      // Left Column: 4 Unified Monorepo Applications
      archCard(36, 30, 206, 62, "WEB PÚBLICA", "CutSync Web", "Reservas sem fricção", null, {
        accent: PALETTE.cobalt,
        titleSize: 15
      }) +
      archCard(36, 108, 206, 62, "MOBILE CLIENTE", "App Cliente · Expo", "Agendamento no bolso", null, {
        titleSize: 15
      }) +
      archCard(36, 186, 206, 62, "MOBILE OPERAÇÃO", "App Negócio · Expo", "Fila e agenda ao vivo", null, {
        titleSize: 15
      }) +
      archCard(36, 264, 206, 62, "CONSOLE PRIVADO", "CutSync Cloud", "Governança multi-unidade", null, {
        accent: PALETTE.vermilion,
        titleSize: 15
      }) +
      // Fan-in connectors into Shared Domain Packages
      '<polyline points="242,61 268,61 268,180 288,180" fill="none" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.6" marker-end="url(#' +
      uid("arr-cobalt") +
      ')"/>' +
      '<line x1="242" y1="139" x2="268" y2="139" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.3"/>' +
      '<line x1="242" y1="217" x2="268" y2="217" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.3"/>' +
      '<polyline points="242,295 268,295 268,180" fill="none" stroke="' +
      PALETTE.vermilion +
      '" stroke-width="1.4"/>' +
      '<circle cx="268" cy="180" r="4" fill="' +
      PALETTE.vermilion +
      '"/>' +
      // Center Spine: Shared Typed Domain Contracts
      archCard(
        294,
        74,
        234,
        212,
        "MONOREPO TYPESCRIPT",
        "Contratos Compartilhados",
        "Regras de agenda e duração",
        "Validação única de domínio",
        { accent: PALETTE.cobalt, dot: PALETTE.vermilion, titleSize: 15 }
      ) +
      // Inner contract pills inside Center card
      '<rect x="310" y="172" width="202" height="28" fill="' +
      PALETTE.cardboard +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.9"/>' +
      '<text x="322" y="190" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1" fill="' +
      PALETTE.cobalt +
      '">TIPAGEM · RESERVAS &amp; SLOTS</text>' +
      '<rect x="310" y="208" width="202" height="28" fill="' +
      PALETTE.cardboard +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.9"/>' +
      '<text x="322" y="226" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1" fill="' +
      PALETTE.ink +
      '">AUTENTICAÇÃO &amp; PERMISSÕES</text>' +
      '<rect x="310" y="244" width="202" height="28" fill="' +
      PALETTE.cardboard +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.9"/>' +
      '<text x="322" y="262" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1" fill="' +
      PALETTE.muted +
      '">SINCRONIZAÇÃO EM TEMPO REAL</text>' +
      // Arrows to Supabase Core & Governance Layer
      '<polyline points="528,144 556,144 556,108 576,108" fill="none" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.8" marker-end="url(#' +
      uid("arr-cobalt") +
      ')"/>' +
      '<polyline points="528,220 556,220 556,256 576,256" fill="none" stroke="' +
      PALETTE.vermilion +
      '" stroke-width="1.6" marker-end="url(#' +
      uid("arr-vermilion") +
      ')"/>' +
      // Right Top: Supabase Shared Core
      archCard(
        582,
        42,
        342,
        126,
        "NÚCLEO COMPARTILHADO",
        "Supabase & PostgreSQL",
        "Isolamento por linha (RLS) e Realtime",
        "Fonte única de verdade para os 4 apps",
        { accent: PALETTE.cobalt, dot: PALETTE.cobalt }
      ) +
      // Right Bottom: Governance & Security Layer
      archCard(
        582,
        196,
        342,
        126,
        "SEGURANÇA REFORÇADA",
        "Governança AAL2 / TOTP",
        "Sessões administrativas com segundo fator",
        "Auditoria cronológica multi-unidade",
        { accent: PALETTE.vermilion, fill: PALETTE.paperHighlight, dot: PALETTE.vermilion }
      ) +
      '<line x1="753" y1="168" x2="753" y2="190" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.3" marker-end="url(#' +
      uid("arr-ink") +
      ')"/>';

    return archShell(
      uid,
      "Diagrama de arquitetura do CutSync: quatro aplicações em monorepo TypeScript unidas por contratos compartilhados sobre Supabase PostgreSQL com camada de governança AAL2 e TOTP",
      body
    );
  }

  function buildCutSyncWfWeb(idPrefix) {
    var uid = makeUid(idPrefix || "gal", "cutsync", "booking");
    var slots = [
      { x: 356, y: 234, t: "09:30", active: false },
      { x: 454, y: 234, t: "10:15", active: false },
      { x: 552, y: 234, t: "11:00", active: false },
      { x: 356, y: 282, t: "14:00", active: true },
      { x: 454, y: 282, t: "14:45", active: false },
      { x: 552, y: 282, t: "15:30", active: false },
      { x: 356, y: 330, t: "16:15", active: false },
      { x: 454, y: 330, t: "17:00", active: false },
      { x: 552, y: 330, t: "18:00", active: false }
    ];
    var slotsSvg = slots
      .map(function (s) {
        return (
          '<rect x="' +
          s.x +
          '" y="' +
          s.y +
          '" width="88" height="36" fill="' +
          (s.active ? PALETTE.cobalt : PALETTE.paperHighlight) +
          '" stroke="' +
          (s.active ? PALETTE.cobalt : PALETTE.ink) +
          '" stroke-width="' +
          (s.active ? "1.5" : "1") +
          '"/>' +
          '<text x="' +
          (s.x + 44) +
          '" y="' +
          (s.y + 22) +
          '" text-anchor="middle" font-family="' +
          SANS_FONT +
          '" font-size="12" font-weight="600" fill="' +
          (s.active ? PALETTE.paperHighlight : PALETTE.ink) +
          '">' +
          s.t +
          "</text>"
        );
      })
      .join("");

    var body =
      windowFrame(32, 26, 896, 548, "CUTSYNC WEB · RESERVA PÚBLICA", "STUDIO CENTRAL") +
      // Top Booking Step Header
      '<text x="56" y="98" font-family="' +
      SERIF_FONT +
      '" font-size="24" fill="' +
      PALETTE.ink +
      '">Studio Central Barbearia</text>' +
      '<text x="580" y="94" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.muted +
      '">1 SERVIÇO</text>' +
      '<text x="676" y="94" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.cobalt +
      '">2 HORÁRIO</text>' +
      '<text x="776" y="94" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.muted +
      '">3 CONFIRMAÇÃO</text>' +
      '<line x1="56" y1="114" x2="904" y2="114" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.9" opacity="0.25"/>' +
      // Column 1: Service selection
      '<text x="56" y="146" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.4" fill="' +
      PALETTE.cobalt +
      '">SERVIÇO SELECIONADO</text>' +
      '<rect x="56" y="162" width="276" height="92" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.8"/>' +
      '<rect x="56" y="162" width="6" height="92" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<text x="76" y="194" font-family="' +
      SERIF_FONT +
      '" font-size="18" fill="' +
      PALETTE.ink +
      '">Corte Editorial</text>' +
      '<text x="76" y="218" font-family="' +
      SANS_FONT +
      '" font-size="11" fill="' +
      PALETTE.muted +
      '">45 minutos · Acabamento na navalha</text>' +
      '<text x="76" y="240" font-family="' +
      SANS_FONT +
      '" font-size="12" font-weight="600" fill="' +
      PALETTE.cobalt +
      '">R$ 65,00</text>' +
      '<rect x="56" y="268" width="276" height="82" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      '<text x="76" y="298" font-family="' +
      SERIF_FONT +
      '" font-size="17" fill="' +
      PALETTE.ink +
      '">Barba &amp; Toalha Quente</text>' +
      '<text x="76" y="322" font-family="' +
      SANS_FONT +
      '" font-size="11" fill="' +
      PALETTE.muted +
      '">30 minutos · R$ 45,00</text>' +
      '<rect x="56" y="364" width="276" height="82" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      '<text x="76" y="394" font-family="' +
      SERIF_FONT +
      '" font-size="17" fill="' +
      PALETTE.ink +
      '">Combo Completo</text>' +
      '<text x="76" y="418" font-family="' +
      SANS_FONT +
      '" font-size="11" fill="' +
      PALETTE.muted +
      '">75 minutos · R$ 95,00</text>' +
      // Column 2: Calendar & Time Slots
      '<text x="356" y="146" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.4" fill="' +
      PALETTE.ink +
      '">HORÁRIOS DISPONÍVEIS</text>' +
      // Day strip
      '<rect x="356" y="162" width="66" height="50" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      '<text x="389" y="183" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="9.5" font-weight="600" fill="' +
      PALETTE.muted +
      '">QUA</text>' +
      '<text x="389" y="201" text-anchor="middle" font-family="' +
      SERIF_FONT +
      '" font-size="16" fill="' +
      PALETTE.ink +
      '">21</text>' +
      '<rect x="430" y="162" width="66" height="50" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<text x="463" y="183" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="9.5" font-weight="600" fill="' +
      PALETTE.paperHighlight +
      '">QUI</text>' +
      '<text x="463" y="201" text-anchor="middle" font-family="' +
      SERIF_FONT +
      '" font-size="16" fill="' +
      PALETTE.paperHighlight +
      '">22</text>' +
      '<rect x="504" y="162" width="66" height="50" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      '<text x="537" y="183" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="9.5" font-weight="600" fill="' +
      PALETTE.muted +
      '">SEX</text>' +
      '<text x="537" y="201" text-anchor="middle" font-family="' +
      SERIF_FONT +
      '" font-size="16" fill="' +
      PALETTE.ink +
      '">23</text>' +
      '<rect x="578" y="162" width="62" height="50" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      '<text x="609" y="183" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="9.5" font-weight="600" fill="' +
      PALETTE.muted +
      '">SÁB</text>' +
      '<text x="609" y="201" text-anchor="middle" font-family="' +
      SERIF_FONT +
      '" font-size="16" fill="' +
      PALETTE.ink +
      '">24</text>' +
      slotsSvg +
      // Column 3: Live Confirmation Card
      '<rect x="664" y="146" width="240" height="398" fill="' +
      PALETTE.cardboard +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.25"/>' +
      '<text x="684" y="178" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.4" fill="' +
      PALETTE.cobalt +
      '">RESUMO DA RESERVA</text>' +
      '<line x1="684" y1="192" x2="884" y2="192" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.9" opacity="0.28"/>' +
      '<text x="684" y="224" font-family="' +
      SERIF_FONT +
      '" font-size="20" fill="' +
      PALETTE.ink +
      '">Corte Editorial</text>' +
      '<text x="684" y="252" font-family="' +
      SANS_FONT +
      '" font-size="11.5" font-weight="600" fill="' +
      PALETTE.ink +
      '">Quinta, 22 · 14:00</text>' +
      '<text x="684" y="274" font-family="' +
      SANS_FONT +
      '" font-size="11" fill="' +
      PALETTE.muted +
      '">Profissional: Lucas Silva</text>' +
      '<circle cx="690" cy="312" r="4" fill="' +
      PALETTE.vermilion +
      '"/>' +
      '<text x="702" y="316" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" fill="' +
      PALETTE.vermilion +
      '">AGENDA SINCRONIZADA AO VIVO</text>' +
      '<line x1="684" y1="428" x2="884" y2="428" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.9"/>' +
      '<text x="684" y="458" font-family="' +
      SANS_FONT +
      '" font-size="10.5" font-weight="600" fill="' +
      PALETTE.muted +
      '">TOTAL</text>' +
      '<text x="884" y="460" text-anchor="end" font-family="' +
      SERIF_FONT +
      '" font-size="22" fill="' +
      PALETTE.ink +
      '">R$ 65,00</text>' +
      '<rect x="684" y="480" width="200" height="44" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<text x="784" y="507" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="10.5" font-weight="600" letter-spacing="1.4" fill="' +
      PALETTE.paperHighlight +
      '">CONFIRMAR RESERVA</text>';
    return wfShell(uid, body);
  }

  function buildCutSyncWfMobileDuo(idPrefix) {
    var uid = makeUid(idPrefix || "gal", "cutsync", "mobile");
    var body =
      // Left Device Frame: Client Mobile App
      '<rect x="116" y="42" width="318" height="522" rx="20" fill="' +
      PALETTE.sand +
      '"/>' +
      '<rect x="108" y="34" width="318" height="522" rx="20" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="2"/>' +
      '<rect x="224" y="48" width="86" height="8" rx="4" fill="' +
      PALETTE.ink +
      '"/>' +
      '<text x="132" y="88" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.5" fill="' +
      PALETTE.cobalt +
      '">APP CLIENTE · EXPO</text>' +
      '<text x="132" y="122" font-family="' +
      SERIF_FONT +
      '" font-size="23" fill="' +
      PALETTE.ink +
      '">Suas Reservas</text>' +
      // Featured confirmed booking card
      '<rect x="132" y="142" width="270" height="148" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<text x="150" y="170" font-family="' +
      SANS_FONT +
      '" font-size="9.5" font-weight="600" letter-spacing="1.3" fill="' +
      PALETTE.paperHighlight +
      '" opacity="0.82">PRÓXIMO HORÁRIO</text>' +
      '<text x="150" y="204" font-family="' +
      SERIF_FONT +
      '" font-size="22" fill="' +
      PALETTE.paperHighlight +
      '">Corte Editorial</text>' +
      '<text x="150" y="232" font-family="' +
      SANS_FONT +
      '" font-size="12" font-weight="600" fill="' +
      PALETTE.paperHighlight +
      '">Hoje · 14:00 · Studio Central</text>' +
      '<rect x="150" y="250" width="114" height="24" fill="' +
      PALETTE.paperHighlight +
      '"/>' +
      '<text x="207" y="266" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="9.5" font-weight="600" letter-spacing="1.1" fill="' +
      PALETTE.cobalt +
      '">CONFIRMADO</text>' +
      // Client quick history list
      '<text x="132" y="324" font-family="' +
      SANS_FONT +
      '" font-size="9.5" font-weight="600" letter-spacing="1.3" fill="' +
      PALETTE.muted +
      '">REAGENDAR RAPIDAMENTE</text>' +
      '<rect x="132" y="338" width="270" height="58" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      '<text x="148" y="364" font-family="' +
      SERIF_FONT +
      '" font-size="15.5" fill="' +
      PALETTE.ink +
      '">Barba &amp; Acabamento</text>' +
      '<text x="148" y="383" font-family="' +
      SANS_FONT +
      '" font-size="10.5" fill="' +
      PALETTE.muted +
      '">30 min · R$ 45,00</text>' +
      '<rect x="132" y="408" width="270" height="58" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      '<text x="148" y="434" font-family="' +
      SERIF_FONT +
      '" font-size="15.5" fill="' +
      PALETTE.ink +
      '">Combo Completo</text>' +
      '<text x="148" y="453" font-family="' +
      SANS_FONT +
      '" font-size="10.5" fill="' +
      PALETTE.muted +
      '">75 min · R$ 95,00</text>' +
      // Client bottom tab bar
      '<line x1="120" y1="504" x2="414" y2="504" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.9" opacity="0.25"/>' +
      '<text x="172" y="532" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="9.5" font-weight="600" fill="' +
      PALETTE.cobalt +
      '">AGENDA</text>' +
      '<text x="267" y="532" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="9.5" font-weight="600" fill="' +
      PALETTE.muted +
      '">EXPLORAR</text>' +
      '<text x="362" y="532" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="9.5" font-weight="600" fill="' +
      PALETTE.muted +
      '">PERFIL</text>' +
      // Center Real-Time Sync Bridge between both apps
      '<line x1="426" y1="224" x2="534" y2="224" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.8" stroke-dasharray="4 3"/>' +
      '<line x1="426" y1="264" x2="534" y2="264" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.8" stroke-dasharray="4 3"/>' +
      '<circle cx="480" cy="244" r="24" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.8"/>' +
      '<circle cx="480" cy="244" r="8" fill="' +
      PALETTE.vermilion +
      '"/>' +
      '<text x="480" y="290" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="9" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.cobalt +
      '">SYNC REALTIME</text>' +
      // Right Device Frame: Business Operations App
      '<rect x="542" y="42" width="318" height="522" rx="20" fill="' +
      PALETTE.sand +
      '"/>' +
      '<rect x="534" y="34" width="318" height="522" rx="20" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="2"/>' +
      '<rect x="650" y="48" width="86" height="8" rx="4" fill="' +
      PALETTE.ink +
      '"/>' +
      '<text x="558" y="88" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.5" fill="' +
      PALETTE.vermilion +
      '">APP NEGÓCIO · OPERAÇÃO</text>' +
      '<text x="558" y="122" font-family="' +
      SERIF_FONT +
      '" font-size="23" fill="' +
      PALETTE.ink +
      '">Agenda do Dia</text>' +
      // Timeline Row 1 (Done)
      '<text x="558" y="166" font-family="' +
      SANS_FONT +
      '" font-size="11" font-weight="600" fill="' +
      PALETTE.muted +
      '">13:00</text>' +
      '<rect x="606" y="144" width="222" height="48" fill="' +
      PALETTE.cardboard +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.9"/>' +
      '<text x="620" y="166" font-family="' +
      SANS_FONT +
      '" font-size="11.5" font-weight="600" fill="' +
      PALETTE.muted +
      '">Rafael M. · Barba</text>' +
      '<text x="620" y="182" font-family="' +
      SANS_FONT +
      '" font-size="9.5" fill="' +
      PALETTE.muted +
      '">Concluído</text>' +
      // Timeline Row 2 (Live Active Synced with Left Phone!)
      '<text x="558" y="232" font-family="' +
      SANS_FONT +
      '" font-size="11" font-weight="600" fill="' +
      PALETTE.cobalt +
      '">14:00</text>' +
      '<rect x="606" y="206" width="222" height="76" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.8"/>' +
      '<rect x="606" y="206" width="6" height="76" fill="' +
      PALETTE.vermilion +
      '"/>' +
      '<text x="622" y="232" font-family="' +
      SERIF_FONT +
      '" font-size="16" fill="' +
      PALETTE.ink +
      '">Bruno V. · Corte Editorial</text>' +
      '<text x="622" y="252" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" fill="' +
      PALETTE.vermilion +
      '">EM ATENDIMENTO</text>' +
      '<text x="622" y="270" font-family="' +
      SANS_FONT +
      '" font-size="10" fill="' +
      PALETTE.muted +
      '">45 min · Confirmado pelo app</text>' +
      // Timeline Row 3 (Next)
      '<text x="558" y="320" font-family="' +
      SANS_FONT +
      '" font-size="11" font-weight="600" fill="' +
      PALETTE.ink +
      '">14:45</text>' +
      '<rect x="606" y="298" width="222" height="58" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1"/>' +
      '<text x="620" y="322" font-family="' +
      SANS_FONT +
      '" font-size="11.5" font-weight="600" fill="' +
      PALETTE.ink +
      '">Gabriel S. · Combo</text>' +
      '<text x="620" y="340" font-family="' +
      SANS_FONT +
      '" font-size="9.5" fill="' +
      PALETTE.cobalt +
      '">Aguardando check-in</text>' +
      // Timeline Row 4 (Open slot)
      '<text x="558" y="394" font-family="' +
      SANS_FONT +
      '" font-size="11" font-weight="600" fill="' +
      PALETTE.muted +
      '">16:00</text>' +
      '<rect x="606" y="372" width="222" height="48" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1" stroke-dasharray="4 3"/>' +
      '<text x="620" y="400" font-family="' +
      SANS_FONT +
      '" font-size="10.5" fill="' +
      PALETTE.muted +
      '">Horário disponível na vitrine</text>' +
      // Business Quick Action
      '<rect x="558" y="444" width="270" height="40" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<text x="693" y="469" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="10.5" font-weight="600" letter-spacing="1.3" fill="' +
      PALETTE.paperHighlight +
      '">+ NOVO ENCAIXE</text>' +
      // Business bottom tab bar
      '<line x1="546" y1="504" x2="840" y2="504" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.9" opacity="0.25"/>' +
      '<text x="598" y="532" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="9.5" font-weight="600" fill="' +
      PALETTE.cobalt +
      '">FILA</text>' +
      '<text x="693" y="532" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="9.5" font-weight="600" fill="' +
      PALETTE.muted +
      '">EQUIPE</text>' +
      '<text x="788" y="532" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="9.5" font-weight="600" fill="' +
      PALETTE.muted +
      '">CAIXA</text>';
    return wfShell(uid, body);
  }

  function buildCutSyncWfGovernance(idPrefix) {
    var uid = makeUid(idPrefix || "gal", "cutsync", "governance");
    var body =
      windowFrame(32, 26, 896, 548, "CUTSYNC CLOUD · CONSOLE PRIVADO DE GOVERNANÇA", "AMBIENTE ISOLADO") +
      // Top Security Header Strip
      '<rect x="54" y="78" width="852" height="54" fill="' +
      PALETTE.cardboard +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.15"/>' +
      '<circle cx="78" cy="105" r="6" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<text x="94" y="109" font-family="' +
      SANS_FONT +
      '" font-size="11" font-weight="600" letter-spacing="1.4" fill="' +
      PALETTE.cobalt +
      '">SESSÃO PROTEGIDA · AAL2 / TOTP VERIFICADO</text>' +
      '<circle cx="742" cy="105" r="4.5" fill="' +
      PALETTE.vermilion +
      '"/>' +
      '<text x="754" y="109" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.vermilion +
      '">AUDITORIA ATIVA</text>' +
      // Left Security Card (TOTP + Policy Status)
      '<rect x="54" y="152" width="254" height="398" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.2"/>' +
      '<rect x="54" y="152" width="254" height="4" fill="' +
      PALETTE.vermilion +
      '"/>' +
      '<text x="74" y="186" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.4" fill="' +
      PALETTE.vermilion +
      '">SEGURANÇA DE SESSÃO</text>' +
      '<text x="74" y="218" font-family="' +
      SERIF_FONT +
      '" font-size="20" fill="' +
      PALETTE.ink +
      '">Segundo Fator TOTP</text>' +
      // 6 clean TOTP slot boxes
      '<rect x="74" y="236" width="30" height="38" fill="' +
      PALETTE.cardboard +
      '" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.3"/>' +
      '<rect x="110" y="236" width="30" height="38" fill="' +
      PALETTE.cardboard +
      '" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.3"/>' +
      '<rect x="146" y="236" width="30" height="38" fill="' +
      PALETTE.cardboard +
      '" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.3"/>' +
      '<rect x="182" y="236" width="30" height="38" fill="' +
      PALETTE.cardboard +
      '" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.3"/>' +
      '<rect x="218" y="236" width="30" height="38" fill="' +
      PALETTE.cardboard +
      '" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.3"/>' +
      '<rect x="254" y="236" width="30" height="38" fill="' +
      PALETTE.cardboard +
      '" stroke="' +
      PALETTE.cobalt +
      '" stroke-width="1.3"/>' +
      '<circle cx="89" cy="255" r="3.5" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<circle cx="125" cy="255" r="3.5" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<circle cx="161" cy="255" r="3.5" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<circle cx="197" cy="255" r="3.5" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<circle cx="233" cy="255" r="3.5" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<circle cx="269" cy="255" r="3.5" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<line x1="74" y1="302" x2="288" y2="302" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.8" opacity="0.25"/>' +
      '<text x="74" y="332" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.muted +
      '">POLÍTICAS ATIVAS</text>' +
      '<text x="74" y="362" font-family="' +
      SANS_FONT +
      '" font-size="11.5" font-weight="600" fill="' +
      PALETTE.ink +
      '">RLS por unidade aplicado</text>' +
      '<text x="74" y="390" font-family="' +
      SANS_FONT +
      '" font-size="11.5" font-weight="600" fill="' +
      PALETTE.ink +
      '">Chaves rotacionadas</text>' +
      '<text x="74" y="418" font-family="' +
      SANS_FONT +
      '" font-size="11.5" font-weight="600" fill="' +
      PALETTE.ink +
      '">Registro imutável de ações</text>' +
      '<rect x="74" y="480" width="214" height="44" fill="' +
      PALETTE.ink +
      '"/>' +
      '<text x="181" y="507" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="10.5" font-weight="600" letter-spacing="1.3" fill="' +
      PALETTE.paper +
      '">REVALIDAR CREDENCIAL</text>' +
      // Right Multi-Store Audit Table
      '<rect x="328" y="152" width="578" height="398" fill="' +
      PALETTE.paperHighlight +
      '" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.2"/>' +
      '<text x="350" y="186" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.4" fill="' +
      PALETTE.cobalt +
      '">AUDITORIA MULTI-UNIDADE</text>' +
      '<text x="884" y="186" text-anchor="end" font-family="' +
      SANS_FONT +
      '" font-size="10" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.muted +
      '">12 UNIDADES ATIVAS</text>' +
      // Column Headers
      '<rect x="350" y="202" width="534" height="30" fill="' +
      PALETTE.cardboard +
      '"/>' +
      '<text x="364" y="221" font-family="' +
      SANS_FONT +
      '" font-size="9.5" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.muted +
      '">UNIDADE</text>' +
      '<text x="514" y="221" font-family="' +
      SANS_FONT +
      '" font-size="9.5" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.muted +
      '">EVENTO DE GOVERNANÇA</text>' +
      '<text x="726" y="221" font-family="' +
      SANS_FONT +
      '" font-size="9.5" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.muted +
      '">NÍVEL</text>' +
      '<text x="802" y="221" font-family="' +
      SANS_FONT +
      '" font-size="9.5" font-weight="600" letter-spacing="1.2" fill="' +
      PALETTE.muted +
      '">ESTADO</text>' +
      // Audit Row 1
      '<text x="364" y="266" font-family="' +
      SERIF_FONT +
      '" font-size="15.5" fill="' +
      PALETTE.ink +
      '">Studio Central</text>' +
      '<text x="514" y="266" font-family="' +
      SANS_FONT +
      '" font-size="11.5" fill="' +
      PALETTE.ink +
      '">Política de horários atualizada</text>' +
      '<text x="726" y="266" font-family="' +
      SANS_FONT +
      '" font-size="10.5" font-weight="600" fill="' +
      PALETTE.cobalt +
      '">AAL2</text>' +
      '<rect x="798" y="250" width="76" height="22" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<text x="836" y="265" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="9" font-weight="600" fill="' +
      PALETTE.paperHighlight +
      '">APROVADO</text>' +
      '<line x1="350" y1="288" x2="884" y2="288" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.7" opacity="0.2"/>' +
      // Audit Row 2
      '<text x="364" y="324" font-family="' +
      SERIF_FONT +
      '" font-size="15.5" fill="' +
      PALETTE.ink +
      '">Unidade Sul</text>' +
      '<text x="514" y="324" font-family="' +
      SANS_FONT +
      '" font-size="11.5" fill="' +
      PALETTE.ink +
      '">Novo operador vinculado</text>' +
      '<text x="726" y="324" font-family="' +
      SANS_FONT +
      '" font-size="10.5" font-weight="600" fill="' +
      PALETTE.cobalt +
      '">AAL2</text>' +
      '<rect x="798" y="308" width="76" height="22" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<text x="836" y="323" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="9" font-weight="600" fill="' +
      PALETTE.paperHighlight +
      '">APROVADO</text>' +
      '<line x1="350" y1="346" x2="884" y2="346" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.7" opacity="0.2"/>' +
      // Audit Row 3
      '<text x="364" y="382" font-family="' +
      SERIF_FONT +
      '" font-size="15.5" fill="' +
      PALETTE.ink +
      '">Norte Barber</text>' +
      '<text x="514" y="382" font-family="' +
      SANS_FONT +
      '" font-size="11.5" fill="' +
      PALETTE.ink +
      '">Permissão administrativa</text>' +
      '<text x="726" y="382" font-family="' +
      SANS_FONT +
      '" font-size="10.5" font-weight="600" fill="' +
      PALETTE.vermilion +
      '">TOTP</text>' +
      '<rect x="798" y="366" width="76" height="22" fill="' +
      PALETTE.paper +
      '" stroke="' +
      PALETTE.vermilion +
      '" stroke-width="1.2"/>' +
      '<text x="836" y="381" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="9" font-weight="600" fill="' +
      PALETTE.vermilion +
      '">REVISÃO</text>' +
      '<line x1="350" y1="404" x2="884" y2="404" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.7" opacity="0.2"/>' +
      // Audit Row 4
      '<text x="364" y="440" font-family="' +
      SERIF_FONT +
      '" font-size="15.5" fill="' +
      PALETTE.ink +
      '">Vila Paulista</text>' +
      '<text x="514" y="440" font-family="' +
      SANS_FONT +
      '" font-size="11.5" fill="' +
      PALETTE.ink +
      '">Sincronização de contratos</text>' +
      '<text x="726" y="440" font-family="' +
      SANS_FONT +
      '" font-size="10.5" font-weight="600" fill="' +
      PALETTE.cobalt +
      '">AAL2</text>' +
      '<rect x="798" y="424" width="76" height="22" fill="' +
      PALETTE.cobalt +
      '"/>' +
      '<text x="836" y="439" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="9" font-weight="600" fill="' +
      PALETTE.paperHighlight +
      '">APROVADO</text>' +
      // Footer summary inside table
      '<text x="350" y="516" font-family="' +
      SANS_FONT +
      '" font-size="10.5" fill="' +
      PALETTE.muted +
      '">Todos os eventos replicados no banco compartilhado Supabase com trilha de auditoria.</text>';
    return wfShell(uid, body);
  }

  /* ========================================================================
     SHARED DOSSIER CONTRACT (window.PORTFOLIO_DOSSIERS)
     ======================================================================== */
  var DOSSIERS = {
    ui: {
      scrollCue: { pt: "Explorar dossiê", en: "Explore dossier" },
      sections: {
        challenge: { pt: "Desafio & Abordagem", en: "Challenge & Approach" },
        highlights: { pt: "Particularidades", en: "Key Highlights" },
        architecture: { pt: "Arquitetura & Fluxo", en: "System Architecture" },
        gallery: { pt: "Por Dentro da Aplicação", en: "Inside the App" }
      },
      labels: {
        challengeCol: { pt: "O Desafio", en: "The Challenge" },
        approachCol: { pt: "A Abordagem", en: "The Approach" },
        wireframeTag: {
          pt: "Esboço editorial · Prancha pronta para captura",
          en: "Editorial wireframe · Ready for capture"
        },
        photoTag: {
          pt: "Captura real da aplicação",
          en: "Live application capture"
        },
        expandHint: { pt: "Ampliar", en: "Expand" },
        closeLightbox: { pt: "Fechar", en: "Close" }
      }
    },
    byId: {
      "zorin-copilot": {
        challenge: {
          pt: "Assistentes visuais para desktop costumam depender de capturas contínuas de tela e OCR em nuvem — um ciclo lento, caro e invasivo que descarta a estrutura real da interface. No Linux com Wayland, o isolamento estrito entre janelas torna a automação contextual ainda mais desafiadora sem integração nativa ao sistema operacional.",
          en: "Desktop AI assistants typically rely on continuous full-screen captures and cloud OCR — a slow, costly, and intrusive loop that discards the interface's true structure. On Linux under Wayland, strict window isolation makes contextual automation even harder without native OS integration."
        },
        approach: {
          pt: "O Zorin Copilot conecta-se diretamente aos barramentos nativos de acessibilidade e desktop (AT-SPI2 e D-Bus) para ler a árvore semântica de widgets em milissegundos. A visão computacional entra sob demanda apenas sobre a região recortada de interesse, alimentando um agente supervisionado acessível por barra flutuante GTK4, CLI ou terminal.",
          en: "Zorin Copilot connects directly to native desktop and accessibility buses (AT-SPI2 and D-Bus) to read the live semantic widget tree in milliseconds. Computer vision activates only on demand over cropped regions of interest, feeding a supervised agent reachable via a floating GTK4 bar, CLI, or terminal."
        },
        highlights: [
          {
            kickerPt: "INTROSPECÇÃO NATIVA",
            kickerEn: "NATIVE INTROSPECTION",
            titlePt: "Árvore Semântica via AT-SPI2 & D-Bus",
            titleEn: "Semantic AT-SPI2 & D-Bus Inspection",
            bodyPt: "Lê hierarquias vivas de botões, campos e estados diretamente do desktop Linux, eliminando screenshots constantes e OCR lento.",
            bodyEn: "Reads live hierarchies of buttons, inputs, and states straight from the Linux desktop, removing constant screenshots and slow OCR."
          },
          {
            kickerPt: "VISÃO SELETIVA",
            kickerEn: "SELECTIVE VISION",
            titlePt: "Visão Sob Demanda por Região (ROI)",
            titleEn: "On-Demand Region-of-Interest Vision",
            bodyPt: "Quando elementos gráficos não expõem metadados semânticos, recorta exclusivamente a área necessária, reduzindo latência e preservando privacidade.",
            bodyEn: "When graphic elements lack semantic metadata, crops strictly the required region, lowering latency while preserving user privacy."
          },
          {
            kickerPt: "CONTROLE HUMANO",
            kickerEn: "HUMAN IN THE LOOP",
            titlePt: "Agente Multi-Etapa Supervisionado",
            titleEn: "Supervised Multi-Step Agent",
            bodyPt: "Executa sequências planejadas com confirmação prévia em pontos sensíveis, trilha auditável passo a passo e parada de emergência imediata.",
            bodyEn: "Runs planned sequences with explicit confirmation before sensitive actions, a step-by-step audit trail, and an immediate emergency stop."
          },
          {
            kickerPt: "SUPERFÍCIE UNIFICADA",
            kickerEn: "UNIFIED SURFACE",
            titlePt: "Três Interfaces: GUI, CLI & Terminal",
            titleEn: "Three Unified Interfaces: GUI, CLI & Terminal",
            bodyPt: "O mesmo núcleo local alimenta a barra flutuante GTK4/Libadwaita, comandos diretos de linha de comando e sessões interativas de terminal.",
            bodyEn: "One local core powers the floating GTK4/Libadwaita bar, direct CLI invocations, and continuous interactive terminal sessions."
          }
        ],
        architecture: {
          summaryPt: "Três superfícies leves (barra flutuante GTK4, CLI e terminal) convergem para o leitor semântico AT-SPI2/D-Bus. Apenas quando um controle não possui semântica estrutural o módulo de visão ROI recorta a área alvo; cada ação do agente retorna à árvore do sistema para validação pós-execução.",
          summaryEn: "Three lightweight surfaces (floating GTK4 bar, CLI, and terminal) converge on the AT-SPI2/D-Bus semantic reader. Only when a control lacks structural semantics does the ROI vision module crop the target region; every agent action loops back to the live OS tree for post-action verification.",
          buildDiagramSVG: buildZorinArchSVG
        },
        gallery: [
          {
            id: "spotlight-bar",
            featured: true,
            image: null,
            suggestedPath: "./assets/gallery/zorin-copilot/spotlight-bar.webp",
            eyebrowPt: "INTERFACE FLUTUANTE",
            eyebrowEn: "FLOATING SURFACE",
            titlePt: "Barra Spotlight GTK4 / Libadwaita",
            titleEn: "GTK4 / Libadwaita Spotlight Bar",
            captionPt: "Invocação instantânea sobre o desktop Wayland com entrada contextual, chips de ação rápida e leitura imediata da janela ativa.",
            captionEn: "Instant overlay over the Wayland desktop featuring contextual prompt input, quick action chips, and live active-window awareness.",
            buildWireframeSVG: buildZorinWfSpotlight
          },
          {
            id: "semantic-inspection",
            featured: false,
            image: null,
            suggestedPath: "./assets/gallery/zorin-copilot/semantic-inspection.webp",
            eyebrowPt: "ÁRVORE DE WIDGETS",
            eyebrowEn: "WIDGET TREE",
            titlePt: "Inspeção Semântica AT-SPI2 & ROI",
            titleEn: "Semantic AT-SPI2 & ROI Inspection",
            captionPt: "Mapeamento em tempo real de botões e campos via D-Bus, com recorte visual em vermelhão acionado somente em áreas gráficas.",
            captionEn: "Live mapping of buttons and inputs over D-Bus, triggering a vermilion visual ROI crop strictly over graphic canvas regions.",
            buildWireframeSVG: buildZorinWfInspection
          },
          {
            id: "agent-stepper",
            featured: false,
            image: null,
            suggestedPath: "./assets/gallery/zorin-copilot/agent-stepper.webp",
            eyebrowPt: "AGENTE SUPERVISIONADO",
            eyebrowEn: "SUPERVISED AGENT",
            titlePt: "Fluxo Multi-Etapa & Trilha Auditável",
            titleEn: "Multi-Step Stepper & Audit Trail",
            captionPt: "Execução transparente com aprovação humana antes de comandos críticos, registro cronológico local e botão de parada imediata.",
            captionEn: "Transparent execution with human approval before critical commands, local chronological logging, and an immediate emergency stop.",
            buildWireframeSVG: buildZorinWfStepper
          }
        ]
      },

      "caderno-digital": {
        challenge: {
          pt: "Cadernos web raramente alcançam a imediatez física de papel e caneta em mesas digitalizadoras: traços longos sofrem atraso de repintura, esboços geométricos perdem precisão e a dependência constante de servidores interrompe o ritmo natural de estudo e desenho offline.",
          en: "Web notebooks rarely match the physical immediacy of pen on paper with drawing tablets: dense strokes suffer redraw lag, freehand geometry loses precision, and constant cloud dependency interrupts offline study and sketching rhythm."
        },
        approach: {
          pt: "O Caderno Digital separa a tinta ativa das folhas consolidadas em um motor Canvas 2D em dupla camada de custo constante por ponto, com resposta sensível à pressão. Um reconhecedor em tempo real encaixa retas, círculos e polígonos com guias magnéticas, salvando tudo localmente em IndexedDB com exportação vetorial limpa para PDF.",
          en: "Caderno Digital separates live ink from committed pages in a double-buffered 2D Canvas engine with constant-time per-point rendering and pressure response. A real-time recognizer snaps lines, circles, and polygons with magnetic guides, saving everything locally in IndexedDB with clean vector PDF export."
        },
        highlights: [
          {
            kickerPt: "MOTOR DE TINTA",
            kickerEn: "INKING ENGINE",
            titlePt: "Canvas em Dupla Camada O(1)",
            titleEn: "Double-Buffered O(1) Inking",
            bodyPt: "Separa o traço em andamento da camada estática em cache, mantendo resposta imediata à pressão da caneta mesmo em folhas densas.",
            bodyEn: "Separates the active stroke from the cached static layer, maintaining instant stylus-pressure response even on dense pages."
          },
          {
            kickerPt: "GEOMETRIA VIVA",
            kickerEn: "LIVE GEOMETRY",
            titlePt: "Reconhecimento & Encaixe Magnético",
            titleEn: "Geometric Recognition & Magnetic Snap",
            bodyPt: "Transforma gestos à mão livre em círculos, retas e polígonos precisos ao final do traço, alinhando vértices e centros com guias visuais.",
            bodyEn: "Transforms freehand gestures into crisp circles, lines, and polygons at release while aligning vertices and centers with visual snap guides."
          },
          {
            kickerPt: "LOCAL & OFFLINE",
            kickerEn: "OFFLINE FIRST",
            titlePt: "Cadernos Estruturados em IndexedDB",
            titleEn: "Offline-First IndexedDB Notebooks",
            bodyPt: "Organiza matérias, cadernos e páginas vetoriais diretamente no navegador com gravação instantânea e zero dependência de internet.",
            bodyEn: "Organizes subjects, notebooks, and vector pages directly inside the browser with instant persistence and zero network dependency."
          },
          {
            kickerPt: "IMPRESSÃO VETORIAL",
            kickerEn: "VECTOR OUTPUT",
            titlePt: "Exportação Vetorial para PDF",
            titleEn: "Clean Vector PDF Export",
            bodyPt: "Gera documentos PDF nítidos diretamente das curvas vetoriais com ajuste automático de enquadramento, prontos para estudo ou impressão.",
            bodyEn: "Produces crisp PDF documents directly from vector curves with automatic margin fitting, ready for review or print."
          }
        ],
        architecture: {
          summaryPt: "Eventos coalescidos da caneta alimentam a camada ativa de baixa latência no Canvas 2D; ao concluir o gesto, o reconhecedor geométrico opcionalmente aplica encaixe magnético antes de consolidar o vetor no estado do caderno, persistido em IndexedDB e exportável como PDF vetorial.",
          summaryEn: "Coalesced stylus pointer events feed the low-latency active 2D Canvas layer; upon stroke release, the geometric recognizer optionally applies magnetic snapping before committing pure vectors to notebook state, persisted in IndexedDB and exportable as vector PDF.",
          buildDiagramSVG: buildCadernoArchSVG
        },
        gallery: [
          {
            id: "canvas-workspace",
            featured: true,
            image: "./assets/gallery/caderno-digital/canvas-workspace.webp",
            suggestedPath: "./assets/gallery/caderno-digital/canvas-workspace.webp",
            eyebrowPt: "ESTÚDIO DE ESCRITA",
            eyebrowEn: "INKING WORKSPACE",
            titlePt: "Folha A4 Quadriculada com Tinta & Geometria",
            titleEn: "A4 Grid Workspace with Ink & Geometry",
            captionPt: "Área de trabalho em A4 paginado com barra lateral de matérias, paleta de caneta acoplada, escrita manuscrita sensível à pressão e formas geométricas encaixadas.",
            captionEn: "Paginated A4 workspace featuring a collapsible subjects sidebar, docked stylus toolbar, pressure-sensitive handwritten notes, and snapped geometric shapes.",
            buildWireframeSVG: buildCadernoWfWorkspace
          },
          {
            id: "notebooks-library",
            featured: false,
            image: "./assets/gallery/caderno-digital/notebooks-library.webp",
            suggestedPath: "./assets/gallery/caderno-digital/notebooks-library.webp",
            eyebrowPt: "ACERVO LOCAL",
            eyebrowEn: "LOCAL ARCHIVE",
            titlePt: "Painel de Estudos — Matérias & Cadernos",
            titleEn: "Study Dashboard — Subjects & Notebooks",
            captionPt: "Organização em grade por disciplinas identificadas por cor, contagem de páginas, busca instantânea e atalho direto para retomar os estudos.",
            captionEn: "Color-coded subject grid displaying notebook topics, page counts, instant search, and one-click shortcuts to resume studying.",
            buildWireframeSVG: buildCadernoWfLibrary
          },
          {
            id: "vector-pdf-export",
            featured: false,
            image: "./assets/gallery/caderno-digital/vector-pdf-export.webp",
            suggestedPath: "./assets/gallery/caderno-digital/vector-pdf-export.webp",
            eyebrowPt: "PUBLICAÇÃO VETORIAL",
            eyebrowEn: "VECTOR EXPORT",
            titlePt: "Exportação PDF, PNG & Backup JSON",
            titleEn: "PDF, PNG & JSON Backup Export",
            captionPt: "Diálogo de exportação sobre a folha ativa com escolha de formato (PDF, PNG ou backup JSON), intervalo de páginas e opção para manter pautas ou grade.",
            captionEn: "Export modal over the active study sheet offering format selection (PDF, PNG, or JSON backup), page range control, and ruling/grid preservation.",
            buildWireframeSVG: buildCadernoWfPdf
          }
        ]
      },

      projcatalogos: {
        challenge: {
          pt: "Comércios locais de bairro — como drogarias, empórios e lojas especializadas — frequentemente dividem-se entre marketplaces com taxas elevadas e catálogos em PDF estáticos que dificultam a busca e geram pedidos incompletos no WhatsApp.",
          en: "Neighborhood retailers — pharmacies, local grocers, and specialty shops — are often torn between high-fee marketplaces and static PDF lists that frustrate search and lead to incomplete WhatsApp orders."
        },
        approach: {
          pt: "O ProjCatálogos entrega uma plataforma full stack white-label em Next.js, PostgreSQL e Drizzle ORM. Cada loja personaliza tema, catálogo, zonas de entrega e horários no painel operacional, enquanto o cliente pesquisa em segundos e envia pedidos completos via carrinho lateral direto para o WhatsApp.",
          en: "ProjCatálogos delivers a white-label full-stack platform built with Next.js, PostgreSQL, and Drizzle ORM. Each merchant customizes theme, catalog, delivery zones, and operating hours from the back-office while shoppers search in seconds and send complete slide-over cart orders straight to WhatsApp."
        },
        highlights: [
          {
            kickerPt: "MULTI-TEMA",
            kickerEn: "WHITE-LABEL",
            titlePt: "Vitrine Digital Multi-Tema",
            titleEn: "White-Label Multi-Theme Storefront",
            bodyPt: "Adapta paleta, identidade visual, banners e horários para diferentes lojas sobre a mesma base confiável e responsiva.",
            bodyEn: "Adapts palette, visual identity, banners, and store hours across distinct merchants over one dependable responsive codebase."
          },
          {
            kickerPt: "NAVEGAÇÃO RÁPIDA",
            kickerEn: "FAST DISCOVERY",
            titlePt: "Busca Inteligente & Carrinho Lateral",
            titleEn: "Smart Search & Slide-Over Cart",
            bodyPt: "Combina busca instantânea, filtros por categoria e drawer de sacola que mantém o cliente no fluxo de compra sem recarregar páginas.",
            bodyEn: "Pairs instant search, category pills, and a slide-over cart drawer that keeps shoppers in flow without page reloads."
          },
          {
            kickerPt: "CONVERSÃO LOCAL",
            kickerEn: "LOCAL CHECKOUT",
            titlePt: "Zonas de Entrega & Pedido WhatsApp",
            titleEn: "Delivery Zones & WhatsApp Checkout",
            bodyPt: "Calcula taxas por bairro em tempo real, seleciona PIX ou cartão e gera o resumo estruturado pronto para confirmação no WhatsApp.",
            bodyEn: "Calculates neighborhood delivery fees live, selects PIX or card payment, and formats a structured WhatsApp order summary."
          },
          {
            kickerPt: "OPERAÇÃO COMPLETA",
            kickerEn: "BACK-OFFICE",
            titlePt: "Painel Administrativo Integrado",
            titleEn: "Full Operational Back-Office",
            bodyPt: "Permite cadastrar produtos, pausar estoque, ajustar bairros de atendimento e configurar horários da loja com persistência relacional.",
            bodyEn: "Manages products, stock availability, delivery-zone pricing, and business hours with relational PostgreSQL persistence."
          }
        ],
        architecture: {
          summaryPt: "A vitrine pública white-label e o painel administrativo compartilham rotas e validações no Next.js App Router sobre PostgreSQL com Drizzle ORM. No fechamento, o motor de regras calcula frete por bairro e horário ativo antes de compor a mensagem estruturada de checkout no WhatsApp.",
          summaryEn: "The white-label public storefront and administrative back-office share Next.js App Router handlers and validation over PostgreSQL with Drizzle ORM. At checkout, the rules engine resolves delivery-zone fees and live store hours before generating the structured WhatsApp order.",
          buildDiagramSVG: buildProjCatalogosArchSVG
        },
        gallery: [
          {
            id: "storefront-catalog",
            featured: true,
            image: "./assets/gallery/projcatalogos/storefront-catalog.webp",
            suggestedPath: "./assets/gallery/projcatalogos/storefront-catalog.webp",
            eyebrowPt: "VITRINE WHITE-LABEL",
            eyebrowEn: "WHITE-LABEL STOREFRONT",
            titlePt: "Vitrine Digital — Drogaria Vila Saúde",
            titleEn: "Storefront View — Drogaria Vila Saúde",
            captionPt: "Cabeçalho com status da loja e busca inteligente, cartões de navegação por categoria e grade de destaques com selos promocionais e adição rápida.",
            captionEn: "Storefront header with live store status and smart search, category navigation cards, and featured products with promotional badges and quick-add buttons.",
            buildWireframeSVG: buildProjCatalogosWfStorefront
          },
          {
            id: "whatsapp-checkout",
            featured: false,
            image: "./assets/gallery/projcatalogos/whatsapp-checkout.webp",
            suggestedPath: "./assets/gallery/projcatalogos/whatsapp-checkout.webp",
            eyebrowPt: "CHECKOUT DIRETO",
            eyebrowEn: "DIRECT CHECKOUT",
            titlePt: "Finalização de Pedido & Cálculo de Entrega",
            titleEn: "Order Checkout & Delivery Zone Pricing",
            captionPt: "Checkout sem cadastro longo com escolha entre entrega local ou retirada, cálculo automático de frete e prazo por bairro e geração da mensagem no WhatsApp.",
            captionEn: "Frictionless checkout with local delivery or pickup toggle, automatic neighborhood fee and ETA calculation, and structured WhatsApp order generation.",
            buildWireframeSVG: buildProjCatalogosWfCheckout
          },
          {
            id: "backoffice-admin",
            featured: false,
            image: "./assets/gallery/projcatalogos/backoffice-admin.webp",
            suggestedPath: "./assets/gallery/projcatalogos/backoffice-admin.webp",
            eyebrowPt: "PAINEL OPERACIONAL",
            eyebrowEn: "BACK-OFFICE PANEL",
            titlePt: "Painel Operacional — Visão Geral",
            titleEn: "Operations Back-Office — Overview",
            captionPt: "Painel administrativo autenticado com indicadores do dia, tabela de pedidos recebidos via WhatsApp, alertas de estoque baixo e status da vitrine.",
            captionEn: "Authenticated admin dashboard displaying daily metrics, incoming WhatsApp orders, low-stock alerts, and live storefront status.",
            buildWireframeSVG: buildProjCatalogosWfAdmin
          }
        ]
      },

      cutsync: {
        challenge: {
          pt: "Barbearias e negócios de agendamento recorrente frequentemente operam sobre ferramentas desconectadas — links improvisados na web, planilhas paralelas e apps separados — provocando conflitos de horário, duplicação de regras e falta de governança centralizada.",
          en: "Barbershops and appointment-driven businesses often run on fragmented tools — ad-hoc web links, side spreadsheets, and disconnected apps — causing double-bookings, duplicated business rules, and weak central governance."
        },
        approach: {
          pt: "O CutSync reúne quatro aplicações em um monorepo TypeScript sobre um núcleo Supabase compartilhado: portal web de reservas públicas, app mobile do cliente, app operacional do negócio e console privado de governança com proteção AAL2/TOTP, unidos por contratos tipados de domínio.",
          en: "CutSync brings four applications together inside one TypeScript monorepo over a shared Supabase backend: a public web booking portal, client mobile app, business operations mobile app, and a private governance cloud protected by AAL2/TOTP — all anchored by shared typed domain contracts."
        },
        highlights: [
          {
            kickerPt: "ECOSSISTEMA MONOREPO",
            kickerEn: "MONOREPO SUITE",
            titlePt: "Quatro Produtos Sincronizados",
            titleEn: "Four-Product Monorepo",
            bodyPt: "Portal web, app cliente, app de gestão do negócio e console cloud evoluem no mesmo repositório sem divergência de comportamento.",
            bodyEn: "Public web, client app, business operations app, and governance cloud evolve together in one repository with zero behavioral drift."
          },
          {
            kickerPt: "FONTE ÚNICA",
            kickerEn: "SINGLE SOURCE",
            titlePt: "Contratos Tipados de Domínio",
            titleEn: "Shared Typed Domain Contracts",
            bodyPt: "Pacotes compartilhados validam durações, janelas de agenda e transições de status de forma idêntica na web e no mobile.",
            bodyEn: "Shared TypeScript packages enforce durations, booking slots, and status transitions identically across web and mobile."
          },
          {
            kickerPt: "EXPERIÊNCIA DUPLA",
            kickerEn: "DUAL JOURNEY",
            titlePt: "Reserva Web + Apps Cliente & Negócio",
            titleEn: "Public Booking + Client & Business Mobile",
            bodyPt: "O cliente escolhe serviço e horário em segundos enquanto a equipe acompanha fila, check-in e encaixes em tempo real pelo Expo.",
            bodyEn: "Clients pick services and live slots in seconds while shop staff manage daily queue, check-ins, and walk-ins live on Expo."
          },
          {
            kickerPt: "GOVERNANÇA CLOUD",
            kickerEn: "CLOUD GOVERNANCE",
            titlePt: "Console Privado com AAL2 / TOTP",
            titleEn: "Private Governance Cloud with AAL2/TOTP",
            bodyPt: "Painel isolado para supervisão multi-unidade, políticas de acesso e auditoria cronológica sob autenticação de segundo fator.",
            bodyEn: "Isolated console for multi-store oversight, access policies, and chronological audit trails behind second-factor TOTP sessions."
          }
        ],
        architecture: {
          summaryPt: "As quatro frentes do monorepo (CutSync Web, App Cliente, App Negócio e CutSync Cloud) consomem pacotes tipados compartilhados de domínio antes de operar sobre PostgreSQL com RLS e Realtime no Supabase, enquanto o console privado impõe verificação AAL2/TOTP e trilha de auditoria.",
          summaryEn: "All four monorepo surfaces (CutSync Web, Client App, Business App, and CutSync Cloud) consume shared typed domain contracts over Supabase PostgreSQL with RLS and Realtime, while the private console enforces AAL2/TOTP verification and audit logging.",
          buildDiagramSVG: buildCutSyncArchSVG
        },
        gallery: [
          {
            id: "public-booking",
            featured: true,
            image: "./assets/gallery/cutsync/public-booking.webp",
            suggestedPath: "./assets/gallery/cutsync/public-booking.webp",
            eyebrowPt: "PORTAL WEB PÚBLICO",
            eyebrowEn: "PUBLIC WEB PORTAL",
            titlePt: "Fluxo de Agendamento CutSync Web",
            titleEn: "CutSync Web Public Booking Flow",
            captionPt: "Portal público de agendamento em quatro etapas — da escolha do serviço com duração e preço à seleção de profissional, horário e confirmação.",
            captionEn: "Four-step public web booking flow — from service selection with duration and pricing to specialist choice, time slots, and confirmation.",
            buildWireframeSVG: buildCutSyncWfWeb
          },
          {
            id: "mobile-duo",
            featured: false,
            image: "./assets/gallery/cutsync/mobile-duo.webp",
            suggestedPath: "./assets/gallery/cutsync/mobile-duo.webp",
            eyebrowPt: "EXPERIÊNCIA MOBILE",
            eyebrowEn: "MOBILE EXPERIENCE",
            titlePt: "Descoberta Mobile & Escolha de Especialista",
            titleEn: "Mobile Discovery & Specialist Selection",
            captionPt: "Duas telas móveis lado a lado: busca pública por bairro ou serviço na vitrine conectada e seleção do especialista no fluxo de agendamento.",
            captionEn: "Two live mobile screens side by side: public discovery by neighborhood or service paired with specialist selection inside the booking flow.",
            buildWireframeSVG: buildCutSyncWfMobileDuo
          },
          {
            id: "governance-cloud",
            featured: false,
            image: null,
            suggestedPath: "./assets/gallery/cutsync/governance-cloud.webp",
            eyebrowPt: "GOVERNANÇA CLOUD",
            eyebrowEn: "GOVERNANCE CLOUD",
            titlePt: "Console Privado & Auditoria AAL2",
            titleEn: "Private Console & AAL2 Audit Log",
            captionPt: "Painel restrito com verificação TOTP, status de políticas de segurança e registro auditável de alterações entre unidades.",
            captionEn: "Restricted administrative console featuring TOTP verification, active security policies, and an auditable multi-store activity table.",
            buildWireframeSVG: buildCutSyncWfGovernance
          }
        ]
      }
    }
  };

  if (root && typeof root === "object") {
    root.PORTFOLIO_DOSSIERS = DOSSIERS;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = DOSSIERS;
  }
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : this);
