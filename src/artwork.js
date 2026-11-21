(function (root) {
  "use strict";

  var PALETTE = {
    cardboard: "#EFECE4",
    paperHighlight: "#FAF8F2",
    sand: "#DFD9CB",
    ink: "#141414",
    muted: "#6D6A63",
    cobalt: "#1F3FB0",
    vermilion: "#C83E2B"
  };

  var COVER_VIEWBOX = { width: 504, height: 900 };
  var SERIF_FONT = "Newsreader, Georgia, serif";
  var SANS_FONT = "'Inter Tight', system-ui, sans-serif";

  var AUTHOR = {
    name: "Bruno Vinícius",
    fullName: "Bruno Vinícius da Silva Santos",
    location: "Araraquara, São Paulo — Brasil",
    github: "https://github.com/BrunoCHRBN",
    linkedin: "https://www.linkedin.com/in/bruno-vin%C3%ADcius-da-silva-santos/",
    email: "brusantos777@gmail.com",
    bioPt:
      "Engenheiro de software em Araraquara, São Paulo, dedicado à criação de sistemas desktop, aplicações web e plataformas móveis que unem arquitetura rigorosa, baixa latência e interfaces táteis. Cada monografia deste acervo nasce de um ofício concreto — da introspecção nativa no Linux à escrita manuscrita com caneta, vitrines digitais e ecossistemas multiplataforma.",
    bioEn:
      "Software engineer based in Araraquara, São Paulo, crafting desktop systems, web studios, and cross-platform mobile products where rigorous architecture meets tactile interface design. Each monograph in this archive grows from a real operational craft — from native Linux introspection to pressure-sensitive ink, digital storefronts, and multi-app ecosystems."
  };

  var CATEGORIES = [
    { id: "all", label: "TODOS / ALL", targetIndex: 0 },
    { id: "system", label: "SISTEMA / SYSTEM", targetIndex: 0 },
    { id: "ink", label: "TINTA / INK", targetIndex: 1 },
    { id: "retail", label: "VITRINE / RETAIL", targetIndex: 2 },
    { id: "mobile", label: "AGENDA / MOBILE", targetIndex: 3 }
  ];

  var PROJECTS = [
    {
      id: "zorin-copilot",
      categoryId: "system",
      title: "Zorin Copilot",
      subtitle: "ASSISTENTE NATIVO PARA LINUX / NATIVE LINUX AI ASSISTANT",
      yearStatus: "2026 · CÓDIGO ABERTO / OPEN SOURCE",
      meta: "2026 / DESKTOP LINUX / PYTHON · GTK4 · WAYLAND",
      spineSeal: "SISTEMA",
      coverUrl: "./assets/covers/zorin-copilot.webp",
      githubUrl: "https://github.com/BrunoCHRBN/zorin-copilot",
      liveUrl: null,
      comingSoon: false,
      synopsisPt:
        "Assistente de inteligência artificial integrado diretamente aos barramentos do sistema Linux. Em vez de depender de capturas constantes de tela e OCR lento, lê a árvore semântica da interface em tempo real e aciona visão apenas nas regiões necessárias, com barra flutuante e modo agente supervisionado.",
      synopsisEn:
        "Native Linux AI assistant connected directly to OS introspection buses for low-latency semantic UI understanding and supervised agent workflows."
    },
    {
      id: "caderno-digital",
      categoryId: "ink",
      title: "Caderno Digital",
      subtitle: "ESCRITA MANUSCRITA E GEOMETRIA / HANDWRITING AND GEOMETRY",
      yearStatus: "2026 · CÓDIGO ABERTO / OPEN SOURCE",
      meta: "2026 / ESTÚDIO WEB / TYPESCRIPT · CANVAS · INDEXEDDB",
      spineSeal: "TINTA",
      coverUrl: "./assets/covers/caderno-digital.webp",
      githubUrl: "https://github.com/BrunoCHRBN/caderno-digital",
      liveUrl: null,
      comingSoon: false,
      synopsisPt:
        "Caderno web projetado para mesas digitalizadoras com caneta sensível à pressão. Combina motor de tinta em dupla camada de baixa latência, reconhecimento automático de formas geométricas com encaixe magnético, armazenamento local offline e exportação vetorial limpa para PDF.",
      synopsisEn:
        "Stylus-first web notebook featuring a double-buffered pressure inking engine, real-time geometric shape recognition, offline persistence and vector PDF export."
    },
    {
      id: "projcatalogos",
      categoryId: "retail",
      title: "ProjCatálogos",
      subtitle: "VITRINE DIGITAL E PEDIDOS / DIGITAL STOREFRONT AND ORDERS",
      yearStatus: "2026 · EM BREVE / COMING SOON",
      meta: "2026 / COMÉRCIO FULL STACK / NEXT.JS · POSTGRESQL · DRIZZLE",
      spineSeal: "PRÉVIA",
      coverUrl: "./assets/covers/projcatalogos.webp",
      githubUrl: null,
      liveUrl: null,
      comingSoon: true,
      synopsisPt:
        "Plataforma completa de catálogo online multi-tema com pedido rápido via WhatsApp. Reúne vitrine responsiva com busca inteligente, carrinho lateral, cálculo por zonas de entrega e painel administrativo completo para gestão de produtos, categorias, horários e pedidos.",
      synopsisEn:
        "White-label digital storefront and WhatsApp ordering platform combining customizable themes, smart filtering, delivery zones and a full back-office panel."
    },
    {
      id: "cutsync",
      categoryId: "mobile",
      title: "CutSync",
      subtitle: "ECOSSISTEMA DE AGENDAMENTO / BOOKING AND OPERATIONS SUITE",
      yearStatus: "2026 · NO AR / LIVE",
      meta: "2026 / MONOREPO MULTIPLATAFORMA / TYPESCRIPT · EXPO · SUPABASE",
      spineSeal: "MÓVEL",
      coverUrl: "./assets/covers/cutsync.webp",
      githubUrl: "https://github.com/BrunoCHRBN/CutSync",
      liveUrl: "https://cut-sync.vercel.app",
      comingSoon: false,
      synopsisPt:
        "Ecossistema em monorepo que integra quatro aplicações sobre um banco compartilhado: portal web de reservas públicas, aplicativo mobile para clientes, aplicativo operacional para negócios e painel privado de governança, unidos por contratos tipados de domínio e validação.",
      synopsisEn:
        "Four-app booking and operations monorepo uniting public web booking, client and business mobile apps, and a private governance cloud over a shared Supabase backend."
    }
  ];

  // Exact hero-artwork crop coordinates for each 768x1376 cover inside the
  // 154x154 spine thumbnail window (x=28..182, y=38..192, center=(105, 115)),
  // isolating only the central screen-print illustration with zero title bleed.
  var SPINE_SPEC = {
    "zorin-copilot": {
      titleSize: 38,
      letterSpacing: 3,
      crop: { x: 15.5, y: -79.0, width: 179.0, height: 320.71 }
    },
    "caderno-digital": {
      titleSize: 35,
      letterSpacing: 2.6,
      crop: { x: 13.5, y: -89.9, width: 183.0, height: 327.88 }
    },
    projcatalogos: {
      titleSize: 36,
      letterSpacing: 2.8,
      crop: { x: 24.0, y: -54.8, width: 162.0, height: 290.25 }
    },
    cutsync: {
      titleSize: 44,
      letterSpacing: 3.6,
      crop: { x: 26.0, y: -43.5, width: 158.0, height: 283.08 }
    }
  };

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

  function resolveProject(projectOrId) {
    if (typeof projectOrId === "string") {
      for (var i = 0; i < PROJECTS.length; i++) {
        if (PROJECTS[i].id === projectOrId) {
          return PROJECTS[i];
        }
      }
      return PROJECTS[0];
    }
    return projectOrId && projectOrId.id ? projectOrId : PROJECTS[0];
  }

  function buildCoverInnerSVG(projectOrId, idPrefix) {
    var proj = resolveProject(projectOrId);
    var prefix = sanitizePrefix(idPrefix, "cv");
    var uid = function (name) {
      return prefix + "-" + proj.id + "-" + name;
    };
    var coverHref = escapeXML(proj.coverUrl || "./assets/covers/" + proj.id + ".webp");

    return (
      "<defs>" +
      // 1990s matte-cardboard left-edge spine hinge crease overlay (0..18px)
      '<linearGradient id="' +
      uid("hinge") +
      '" x1="0" y1="0" x2="18" y2="0" gradientUnits="userSpaceOnUse">' +
      '<stop offset="0%" stop-color="' +
      PALETTE.ink +
      '" stop-opacity="0.24"/>' +
      '<stop offset="28%" stop-color="' +
      PALETTE.ink +
      '" stop-opacity="0.06"/>' +
      '<stop offset="56%" stop-color="' +
      PALETTE.ink +
      '" stop-opacity="0.14"/>' +
      '<stop offset="74%" stop-color="' +
      PALETTE.paperHighlight +
      '" stop-opacity="0.48"/>' +
      '<stop offset="100%" stop-color="' +
      PALETTE.cardboard +
      '" stop-opacity="0"/>' +
      "</linearGradient>" +
      // Delicate right outer box bevel shading
      '<linearGradient id="' +
      uid("right-bevel") +
      '" x1="494" y1="0" x2="504" y2="0" gradientUnits="userSpaceOnUse">' +
      '<stop offset="0%" stop-color="' +
      PALETTE.ink +
      '" stop-opacity="0"/>' +
      '<stop offset="65%" stop-color="' +
      PALETTE.ink +
      '" stop-opacity="0.04"/>' +
      '<stop offset="100%" stop-color="' +
      PALETTE.ink +
      '" stop-opacity="0.14"/>' +
      "</linearGradient>" +
      // Subtle top cardboard box edge catchlight
      '<linearGradient id="' +
      uid("top-bevel") +
      '" x1="0" y1="0" x2="0" y2="10" gradientUnits="userSpaceOnUse">' +
      '<stop offset="0%" stop-color="' +
      PALETTE.paperHighlight +
      '" stop-opacity="0.38"/>' +
      '<stop offset="100%" stop-color="' +
      PALETTE.paperHighlight +
      '" stop-opacity="0"/>' +
      "</linearGradient>" +
      // Subtle bottom cardboard box edge shadow
      '<linearGradient id="' +
      uid("bottom-bevel") +
      '" x1="0" y1="888" x2="0" y2="900" gradientUnits="userSpaceOnUse">' +
      '<stop offset="0%" stop-color="' +
      PALETTE.ink +
      '" stop-opacity="0"/>' +
      '<stop offset="100%" stop-color="' +
      PALETTE.ink +
      '" stop-opacity="0.14"/>' +
      "</linearGradient>" +
      "</defs>" +
      // Warm matte-cardboard fallback substrate underneath cover image
      '<rect x="0" y="0" width="504" height="900" fill="' +
      PALETTE.cardboard +
      '"/>' +
      // Full-bleed 1990s retro software box cover art (pure SVG2 href)
      '<image href="' +
      coverHref +
      '" x="0" y="0" width="504" height="900" preserveAspectRatio="xMidYMid slice"/>' +
      // Physical cardboard left spine hinge crease & subtle outer box bevel shading
      '<rect x="0" y="0" width="18" height="900" fill="url(#' +
      uid("hinge") +
      ')"/>' +
      '<line x1="10.2" y1="0" x2="10.2" y2="900" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.75" opacity="0.16"/>' +
      '<line x1="11.4" y1="0" x2="11.4" y2="900" stroke="' +
      PALETTE.paperHighlight +
      '" stroke-width="0.85" opacity="0.45"/>' +
      '<rect x="494" y="0" width="10" height="900" fill="url(#' +
      uid("right-bevel") +
      ')"/>' +
      '<rect x="0" y="0" width="504" height="10" fill="url(#' +
      uid("top-bevel") +
      ')"/>' +
      '<rect x="0" y="888" width="504" height="12" fill="url(#' +
      uid("bottom-bevel") +
      ')"/>' +
      '<rect x="0.5" y="0.5" width="503" height="899" fill="none" stroke="' +
      PALETTE.ink +
      '" stroke-width="1" opacity="0.12"/>'
    );
  }

  function buildCoverSVG(projectOrId, idPrefix) {
    var inner = buildCoverInnerSVG(projectOrId, idPrefix || "cv");
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
      COVER_VIEWBOX.width +
      " " +
      COVER_VIEWBOX.height +
      '" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">' +
      inner +
      "</svg>"
    );
  }

  function buildSpineSVG(projectOrId, idPrefix) {
    var proj = resolveProject(projectOrId);
    var prefix = sanitizePrefix(idPrefix, "sp");
    var uid = function (name) {
      return prefix + "-" + proj.id + "-" + name;
    };
    var spec = SPINE_SPEC[proj.id] || SPINE_SPEC["caderno-digital"];
    var crop = spec.crop;
    var coverHref = escapeXML(proj.coverUrl || "./assets/covers/" + proj.id + ".webp");
    var sealColor = proj.comingSoon ? PALETTE.vermilion : PALETTE.ink;
    var upperTitle = proj.title.toUpperCase();

    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 900" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">' +
      "<defs>" +
      // 1990s matte-cardboard 3D spine edge wear & curvature shading
      '<linearGradient id="' +
      uid("curve") +
      '" x1="0%" y1="0%" x2="100%" y2="0%">' +
      '<stop offset="0%" stop-color="' +
      PALETTE.ink +
      '" stop-opacity="0.22"/>' +
      '<stop offset="7%" stop-color="' +
      PALETTE.ink +
      '" stop-opacity="0.05"/>' +
      '<stop offset="16%" stop-color="' +
      PALETTE.paperHighlight +
      '" stop-opacity="0.46"/>' +
      '<stop offset="48%" stop-color="' +
      PALETTE.cardboard +
      '" stop-opacity="0"/>' +
      '<stop offset="88%" stop-color="' +
      PALETTE.ink +
      '" stop-opacity="0.05"/>' +
      '<stop offset="100%" stop-color="' +
      PALETTE.ink +
      '" stop-opacity="0.26"/>' +
      "</linearGradient>" +
      // Top box flap fold shadow
      '<linearGradient id="' +
      uid("top-band") +
      '" x1="0%" y1="0%" x2="0%" y2="100%">' +
      '<stop offset="0%" stop-color="' +
      PALETTE.ink +
      '" stop-opacity="0.16"/>' +
      '<stop offset="100%" stop-color="' +
      PALETTE.ink +
      '" stop-opacity="0"/>' +
      "</linearGradient>" +
      // Bottom box flap fold shadow
      '<linearGradient id="' +
      uid("bottom-band") +
      '" x1="0%" y1="100%" x2="0%" y2="0%">' +
      '<stop offset="0%" stop-color="' +
      PALETTE.ink +
      '" stop-opacity="0.18"/>' +
      '<stop offset="100%" stop-color="' +
      PALETTE.ink +
      '" stop-opacity="0"/>' +
      "</linearGradient>" +
      // Vintage archival cardboard paper stipple
      '<pattern id="' +
      uid("dots") +
      '" width="10" height="10" patternUnits="userSpaceOnUse">' +
      '<circle cx="2" cy="2.5" r="0.7" fill="' +
      PALETTE.ink +
      '" opacity="0.048"/>' +
      '<circle cx="7.5" cy="7" r="0.6" fill="' +
      PALETTE.ink +
      '" opacity="0.036"/>' +
      '<circle cx="5" cy="1.5" r="0.45" fill="' +
      PALETTE.sand +
      '" opacity="0.35"/>' +
      "</pattern>" +
      // Clip path for top 154x154 framed illustration window
      '<clipPath id="' +
      uid("thumb-clip") +
      '">' +
      '<rect x="28" y="38" width="154" height="154"/>' +
      "</clipPath>" +
      "</defs>" +
      // Warm matte-cardboard spine base
      '<rect x="0" y="0" width="210" height="900" fill="' +
      PALETTE.cardboard +
      '"/>' +
      '<rect x="0" y="0" width="210" height="900" fill="url(#' +
      uid("dots") +
      ')"/>' +
      // Top cardboard hairline echo matching the front cover header rule
      '<line x1="28" y1="24" x2="182" y2="24" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.5"/>' +
      // Framed illustration thumbnail window (cropped to hero artwork only, zero title text)
      '<g clip-path="url(#' +
      uid("thumb-clip") +
      ')">' +
      '<rect x="28" y="38" width="154" height="154" fill="' +
      PALETTE.cardboard +
      '"/>' +
      '<image href="' +
      coverHref +
      '" x="' +
      crop.x +
      '" y="' +
      crop.y +
      '" width="' +
      crop.width +
      '" height="' +
      crop.height +
      '" preserveAspectRatio="xMidYMid slice"/>' +
      "</g>" +
      '<rect x="28" y="38" width="154" height="154" fill="none" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.25"/>' +
      // Signature bold cobalt horizontal bar echoing the 4 front covers
      '<rect x="28" y="206" width="154" height="9" fill="' +
      PALETTE.cobalt +
      '"/>' +
      // High-contrast vertical editorial serif title
      '<text transform="translate(105, 470) rotate(-90)" text-anchor="middle" dy="0.34em" font-family="' +
      SERIF_FONT +
      '" font-size="' +
      spec.titleSize +
      '" font-weight="500" letter-spacing="' +
      spec.letterSpacing +
      '" fill="' +
      PALETTE.ink +
      '">' +
      escapeXML(upperTitle) +
      "</text>" +
      // Bottom cardboard rule, author imprint, year & matching boxed editorial seal
      '<line x1="28" y1="724" x2="182" y2="724" stroke="' +
      PALETTE.ink +
      '" stroke-width="1.6"/>' +
      '<text x="105" y="758" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="13.5" font-weight="600" letter-spacing="1.8" fill="' +
      PALETTE.ink +
      '">BRUNO VINÍCIUS</text>' +
      '<text x="105" y="782" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="12" font-weight="600" letter-spacing="2.2" fill="' +
      PALETTE.muted +
      '">2026</text>' +
      '<rect x="44" y="804" width="122" height="38" fill="' +
      PALETTE.cardboard +
      '" stroke="' +
      sealColor +
      '" stroke-width="1.8"/>' +
      '<text x="105" y="828" text-anchor="middle" font-family="' +
      SANS_FONT +
      '" font-size="14.5" font-weight="600" letter-spacing="2.8" fill="' +
      sealColor +
      '">' +
      escapeXML(proj.spineSeal) +
      "</text>" +
      // 3D cardboard spine edge shading, crease highlights & flap wear
      '<rect x="0" y="0" width="210" height="900" fill="url(#' +
      uid("curve") +
      ')"/>' +
      '<line x1="12" y1="0" x2="12" y2="900" stroke="' +
      PALETTE.paperHighlight +
      '" stroke-width="0.9" opacity="0.32"/>' +
      '<line x1="198" y1="0" x2="198" y2="900" stroke="' +
      PALETTE.ink +
      '" stroke-width="0.8" opacity="0.1"/>' +
      '<rect x="0" y="0" width="210" height="16" fill="url(#' +
      uid("top-band") +
      ')"/>' +
      '<rect x="0" y="884" width="210" height="16" fill="url(#' +
      uid("bottom-band") +
      ')"/>' +
      "</svg>"
    );
  }

  var CATALOG = {
    author: AUTHOR,
    categories: CATEGORIES,
    defaultIndex: 1,
    coverViewBox: COVER_VIEWBOX,
    projects: PROJECTS,
    buildCoverInnerSVG: buildCoverInnerSVG,
    buildCoverSVG: buildCoverSVG,
    buildSpineSVG: buildSpineSVG
  };

  if (root && typeof root === "object") {
    root.PORTFOLIO_CATALOG = CATALOG;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = CATALOG;
  }
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : this);
