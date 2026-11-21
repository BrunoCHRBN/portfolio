/* ==========================================================================
   Bruno Vinícius — 3D Editorial Monograph Shelf Engine
   Single rAF loop + Web Animations API · Archival print motion
   ========================================================================== */

(function () {
  'use strict';

  var catalog = window.PORTFOLIO_CATALOG;
  if (!catalog || !Array.isArray(catalog.projects) || catalog.projects.length === 0) {
    return;
  }

  var projects = catalog.projects;
  var categories = Array.isArray(catalog.categories) ? catalog.categories : [];
  var author = catalog.author || {};
  var coverBox = catalog.coverViewBox || { width: 504, height: 900 };
  var coverW = Number(coverBox.width) > 0 ? Number(coverBox.width) : 504;
  var coverH = Number(coverBox.height) > 0 ? Number(coverBox.height) : 900;
  var N = projects.length;
  var isLoopMode = N >= 8;
  var preloadedCovers = [];

  /* ------------------------------------------------------------------------
     DOM References
     ------------------------------------------------------------------------ */
  var hProbe = document.getElementById('h-probe');
  var btnAbout = document.getElementById('btn-about');
  var tabsWrap = document.querySelector('.tabs-wrap');
  var tabsEl = document.getElementById('tabs');
  var tabIndicator = document.getElementById('tab-indicator');
  var shelfSection = document.getElementById('shelf-section');
  var stageEl = document.getElementById('stage');
  var openRingBtn = document.getElementById('open-ring');
  var arrowPrev = document.getElementById('arrow-prev');
  var arrowNext = document.getElementById('arrow-next');

  var capTitle = document.getElementById('cap-title');
  var capSub = document.getElementById('cap-sub');
  var capYear = document.getElementById('cap-year');

  var detailSheet = document.getElementById('detail-sheet');
  var detailClose = document.getElementById('detail-close');
  var detailSub = document.getElementById('detail-sub');
  var detailTitle = document.getElementById('detail-title');
  var detailMeta = document.getElementById('detail-meta');
  var detailSynopsisPt = document.getElementById('detail-synopsis-pt');
  var detailSynopsisEn = document.getElementById('detail-synopsis-en');
  var detailActions = document.getElementById('detail-actions');
  var detailScrollCue = document.getElementById('detail-scroll-cue');
  var detailScrollCueText = document.getElementById('detail-scroll-cue-text');
  var detailDossier = document.getElementById('detail-dossier');
  var dossierChallengeSec = document.getElementById('dossier-challenge');
  var dossierChallengeLabel = document.getElementById('dossier-challenge-label');
  var dossierChallengeBody = document.getElementById('dossier-challenge-body');
  var dossierApproachLabel = document.getElementById('dossier-approach-label');
  var dossierApproachBody = document.getElementById('dossier-approach-body');
  var dossierHighlightsGrid = document.getElementById('dossier-highlights-grid');
  var dossierArchPlate = document.getElementById('dossier-arch-plate');
  var dossierArchSummary = document.getElementById('dossier-arch-summary');
  var dossierGalleryGrid = document.getElementById('dossier-gallery-grid');
  var dossierSections = Array.prototype.slice.call(
    detailDossier.querySelectorAll('.dossier-section')
  );
  var langButtons = Array.prototype.slice.call(
    document.querySelectorAll('.lang-btn')
  );
  var posterArtG = document.getElementById('poster-art');
  var inkBlobs = Array.prototype.slice.call(
    detailSheet.querySelectorAll('.ink-blob')
  ).map(function (el) {
    return {
      el: el,
      delay: Number(el.getAttribute('data-delay')) || 0
    };
  });

  var lightboxEl = document.getElementById('gallery-lightbox');
  var lightboxClose = document.getElementById('lightbox-close');
  var lightboxCounter = document.getElementById('lightbox-counter');
  var lightboxPrev = document.getElementById('lightbox-prev');
  var lightboxNext = document.getElementById('lightbox-next');
  var lightboxMedia = document.getElementById('lightbox-media');
  var lightboxEyebrow = document.getElementById('lightbox-eyebrow');
  var lightboxTag = document.getElementById('lightbox-tag');
  var lightboxTitle = document.getElementById('lightbox-title');
  var lightboxDesc = document.getElementById('lightbox-desc');

  var aboutSheet = document.getElementById('about-sheet');
  var aboutClose = document.getElementById('about-close');
  var aboutTitle = document.getElementById('about-title');
  var aboutLocation = document.getElementById('about-location');
  var aboutBioPt = document.getElementById('about-bio-pt');
  var aboutBioEn = document.getElementById('about-bio-en');
  var aboutContacts = document.getElementById('about-contacts');
  var aboutIndexList = document.getElementById('about-index-list');

  var cursorEl = document.getElementById('cursor');

  /* ------------------------------------------------------------------------
     Motion & Capability Media Queries
     ------------------------------------------------------------------------ */
  var reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointerQuery = window.matchMedia('(pointer: fine)');
  var reducedMotion = reducedMotionQuery.matches;
  var pointerFine = finePointerQuery.matches;

  function onReducedMotionChange(e) {
    reducedMotion = e.matches;
    if (reducedMotion && openSheet === 'detail') {
      disconnectDossierObserver();
      clearDossierAnimations();
      for (var i = 0; i < dossierSections.length; i++) {
        dossierSections[i].classList.add('is-revealed');
      }
    }
  }
  function onFinePointerChange(e) {
    pointerFine = e.matches;
    if (!pointerFine) {
      hasPointer = false;
      hoveredSlot = -1;
    }
  }
  if (typeof reducedMotionQuery.addEventListener === 'function') {
    reducedMotionQuery.addEventListener('change', onReducedMotionChange);
    finePointerQuery.addEventListener('change', onFinePointerChange);
  } else if (typeof reducedMotionQuery.addListener === 'function') {
    reducedMotionQuery.addListener(onReducedMotionChange);
    finePointerQuery.addListener(onFinePointerChange);
  }

  /* ------------------------------------------------------------------------
     Safe Helpers (Math, URLs, Sanitized SVG Parsing)
     ------------------------------------------------------------------------ */
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var domParser = new DOMParser();

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function smoothstep(t) {
    var c = clamp(t, 0, 1);
    return c * c * (3 - 2 * c);
  }

  function wrapIndex(idx) {
    return ((idx % N) + N) % N;
  }

  function isSafeHref(url) {
    if (typeof url !== 'string' || !url.trim()) return false;
    try {
      var parsed = new URL(url, window.location.href);
      return (
        parsed.protocol === 'https:' ||
        parsed.protocol === 'http:' ||
        parsed.protocol === 'mailto:'
      );
    } catch (_) {
      return false;
    }
  }

  function isSafeSvgHref(val) {
    if (typeof val !== 'string') return false;
    var trimmed = val.trim();
    if (!trimmed) return false;
    var lower = trimmed.toLowerCase();
    if (
      lower.indexOf('javascript:') === 0 ||
      lower.indexOf('vbscript:') === 0 ||
      lower.indexOf('data:text/') === 0
    ) {
      return false;
    }
    return (
      trimmed.charAt(0) === '#' ||
      trimmed.indexOf('./') === 0 ||
      trimmed.indexOf('../') === 0 ||
      trimmed.charAt(0) === '/' ||
      lower.indexOf('https://') === 0 ||
      lower.indexOf('http://') === 0 ||
      lower.indexOf('data:image/') === 0
    );
  }

  function sanitizeSvgSubtree(node) {
    if (!node || node.nodeType !== 1) return;
    var tag = node.localName ? node.localName.toLowerCase() : '';
    if (tag === 'script' || tag === 'foreignobject' || tag === 'iframe') {
      if (node.parentNode) node.parentNode.removeChild(node);
      return;
    }
    var attrs = Array.prototype.slice.call(node.attributes || []);
    for (var i = 0; i < attrs.length; i++) {
      var name = attrs[i].name.toLowerCase();
      var val = attrs[i].value || '';
      if (name.indexOf('on') === 0) {
        node.removeAttribute(attrs[i].name);
      } else if (
        (name === 'href' || name === 'xlink:href') &&
        !isSafeSvgHref(val)
      ) {
        node.removeAttribute(attrs[i].name);
      }
    }
    var children = Array.prototype.slice.call(node.childNodes || []);
    for (var j = 0; j < children.length; j++) {
      sanitizeSvgSubtree(children[j]);
    }
  }

  function mountFullSvg(container, svgMarkup) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    if (typeof svgMarkup !== 'string' || !svgMarkup.trim()) return;
    var doc = domParser.parseFromString(svgMarkup, 'image/svg+xml');
    if (doc.getElementsByTagName('parsererror').length > 0) return;
    var root = doc.documentElement;
    sanitizeSvgSubtree(root);
    container.appendChild(document.importNode(root, true));
  }

  function mountSvgInnerFragment(targetGroup, innerMarkup) {
    while (targetGroup.firstChild) {
      targetGroup.removeChild(targetGroup.firstChild);
    }
    if (typeof innerMarkup !== 'string' || !innerMarkup.trim()) return;
    var wrapped =
      '<svg xmlns="' +
      SVG_NS +
      '" viewBox="0 0 ' +
      coverW +
      ' ' +
      coverH +
      '">' +
      innerMarkup +
      '</svg>';
    var doc = domParser.parseFromString(wrapped, 'image/svg+xml');
    if (doc.getElementsByTagName('parsererror').length > 0) return;
    var root = doc.documentElement;
    sanitizeSvgSubtree(root);
    var nodes = Array.prototype.slice.call(root.childNodes);
    for (var i = 0; i < nodes.length; i++) {
      targetGroup.appendChild(document.importNode(nodes[i], true));
    }
  }

  function preloadCoverAssets() {
    for (var i = 0; i < N; i++) {
      var url = projects[i] && projects[i].coverUrl;
      if (typeof url === 'string' && isSafeSvgHref(url)) {
        var img = new window.Image();
        img.decoding = 'async';
        img.src = url;
        preloadedCovers.push(img);
      }
    }
  }

  /* ------------------------------------------------------------------------
     State
     ------------------------------------------------------------------------ */
  var W = window.innerWidth;
  var VH = window.innerHeight;
  var H = 400;
  var ws = 94;
  var d = 224;
  var gap = 18;
  var shelfCy = VH / 2;

  function readInitialIndex() {
    try {
      var params = new URLSearchParams(window.location.search);
      var obra = params.get('obra');
      if (obra) {
        for (var i = 0; i < N; i++) {
          if (projects[i].id === obra) return i;
        }
      }
    } catch (_) {
      // Safe fallback when URLSearchParams or location.search is unavailable
    }
    var def = typeof catalog.defaultIndex === 'number' ? catalog.defaultIndex : 1;
    return clamp(def, 0, N - 1);
  }

  var initialIndex = readInitialIndex();
  var T = initialIndex;
  var s = initialIndex;
  var activeIdx = initialIndex;

  var volumes = [];
  var tabButtons = [];

  // Pointer, drag, wheel, tilt, cursor states
  var mx = W / 2;
  var my = VH / 2;
  var cx = W / 2;
  var cy = VH / 2;
  var hasPointer = false;
  var pointerInitialized = false;
  var hoveredSlot = -1;
  var hoveredInteractive = false;
  var tiltX = 0;
  var tiltY = 0;

  var pointerDown = false;
  var isDragging = false;
  var dragPointerId = null;
  var dragStartX = 0;
  var dragStartY = 0;
  var dragStartT = 0;
  var suppressNextClick = false;
  var suppressTimer = null;

  var wheelRawT = T;
  var wheelActive = false;
  var wheelSettleTimer = null;

  // Sheet states
  var openSheet = null; // null | 'detail' | 'about'
  var sheetClosing = false;
  var sheetOpId = 0;
  var activeSheetAnimations = [];
  var lastTriggerEl = null;

  // Dossier & Lightbox states
  var currentLang = 'pt';
  var currentDossierProjectId = null;
  var dossierObserver = null;
  var activeDossierAnimations = [];
  var dossierDomRefs = { highlights: [], gallery: [] };
  var preloadedGalleryImages = [];

  var lightboxOpen = false;
  var lightboxClosing = false;
  var lightboxOpId = 0;
  var lightboxIndex = 0;
  var activeLightboxAnimations = [];

  // 7-blob ink reveal state (driven in the single rAF loop)
  var inkRevealActive = false;
  var inkRevealStart = 0;

  /* ------------------------------------------------------------------------
     URL Deep-Link Synchronization
     ------------------------------------------------------------------------ */
  function syncUrl(projectId) {
    try {
      var url = new URL(window.location.href);
      if (url.searchParams.get('obra') === projectId) return;
      url.searchParams.set('obra', projectId);
      window.history.replaceState(null, '', url.toString());
    } catch (_) {
      // Sandboxed or file:// origins may reject replaceState
    }
  }

  /* ------------------------------------------------------------------------
     Category Tabs Setup & Sliding Cobalt Block
     ------------------------------------------------------------------------ */
  function initTabs() {
    while (tabsEl.children.length > 1) {
      tabsEl.removeChild(tabsEl.lastElementChild);
    }
    tabButtons = [];

    var list = categories.length
      ? categories
      : [
          { id: 'all', label: 'TODOS / ALL', targetIndex: 0 },
          { id: 'system', label: 'SISTEMA / SYSTEM', targetIndex: 0 },
          { id: 'ink', label: 'TINTA / INK', targetIndex: 1 },
          { id: 'retail', label: 'VITRINE / RETAIL', targetIndex: 2 },
          { id: 'mobile', label: 'AGENDA / MOBILE', targetIndex: 3 }
        ];

    for (var i = 0; i < list.length; i++) {
      var cat = list[i];
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lbl tab-btn';
      btn.dataset.cat = cat.id;
      btn.dataset.targetIndex = String(
        typeof cat.targetIndex === 'number' ? cat.targetIndex : 0
      );
      btn.textContent = cat.label;
      btn.addEventListener('click', onTabClick);
      tabsEl.appendChild(btn);
      tabButtons.push(btn);
    }
  }

  function onTabClick(e) {
    if (openSheet) return;
    var btn = e.currentTarget;
    var targetIdx = clamp(Number(btn.dataset.targetIndex) || 0, 0, N - 1);
    navigateToIndex(targetIdx);
  }

  function syncTabIndicator(projIdx, animate) {
    var proj = projects[projIdx];
    if (!proj) return;
    var activeBtn = null;

    for (var i = 0; i < tabButtons.length; i++) {
      var btn = tabButtons[i];
      var match = btn.dataset.cat !== 'all' && btn.dataset.cat === proj.categoryId;
      btn.classList.toggle('is-active', match);
      if (match) {
        btn.setAttribute('aria-current', 'true');
        activeBtn = btn;
      } else {
        btn.removeAttribute('aria-current');
      }
    }

    if (!activeBtn) return;

    if (!animate || reducedMotion) {
      tabIndicator.classList.remove('is-ready');
    } else {
      tabIndicator.classList.add('is-ready');
    }

    tabIndicator.style.width = activeBtn.offsetWidth + 'px';
    tabIndicator.style.transform = 'translateX(' + activeBtn.offsetLeft + 'px)';

    if (!animate && !reducedMotion) {
      // Force geometry commit, then enable smooth transitions for future swaps
      void tabIndicator.offsetWidth;
      tabIndicator.classList.add('is-ready');
    }

    // Keep active tab comfortably visible on narrow mobile horizontal scroller
    if (tabsWrap && tabsWrap.scrollWidth > tabsWrap.clientWidth) {
      var targetScroll =
        activeBtn.offsetLeft - (tabsWrap.clientWidth - activeBtn.offsetWidth) / 2;
      tabsWrap.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: animate && !reducedMotion ? 'smooth' : 'auto'
      });
    }
  }

  /* ------------------------------------------------------------------------
     Build 3D Volumes (Adaptive: N unique for N < 8, 3*N modular for N >= 8)
     ------------------------------------------------------------------------ */
  function buildVolumes() {
    while (stageEl.firstChild) {
      stageEl.removeChild(stageEl.firstChild);
    }
    volumes = [];

    var totalSlots = isLoopMode ? N * 3 : N;

    for (var slot = 0; slot < totalSlots; slot++) {
      var projIdx = slot % N;
      var copyNum = Math.floor(slot / N);
      var proj = projects[projIdx];

      var volEl = document.createElement('div');
      volEl.className = 'volume';
      volEl.dataset.slot = String(slot);
      volEl.dataset.index = String(projIdx);
      volEl.dataset.projectId = proj.id;

      var spEl = document.createElement('div');
      spEl.className = 'face sp';
      var spPrefix = isLoopMode ? 'sp' + copyNum : 'sp';
      mountFullSvg(spEl, catalog.buildSpineSVG(proj, spPrefix));

      var cvEl = document.createElement('div');
      cvEl.className = 'face cv';
      var cvPrefix = isLoopMode ? 'cv' + copyNum : 'cv';
      mountFullSvg(cvEl, catalog.buildCoverSVG(proj, cvPrefix));

      volEl.appendChild(spEl);
      volEl.appendChild(cvEl);
      stageEl.appendChild(volEl);

      volumes.push({
        slot: slot,
        projIdx: projIdx,
        el: volEl,
        sp: spEl,
        cv: cvEl,
        lift: 0,
        lastR: slot - s
      });
    }
  }

  /* ------------------------------------------------------------------------
     Measure Viewport & Adaptive Monograph Proportions
     ------------------------------------------------------------------------ */
  function measure() {
    W = window.innerWidth;
    VH = window.innerHeight;
    var probed = hProbe.getBoundingClientRect().height;
    H = probed > 0 ? probed : Math.min(VH * 0.49, W * 0.34);

    var shelfRect = shelfSection.getBoundingClientRect();
    shelfCy = shelfRect.height > 0 ? shelfRect.top + shelfRect.height / 2 : VH / 2;

    if (isLoopMode) {
      ws = H * (142 / 840);
      d = H * (coverW / coverH);
      gap = H * 0.03;
    } else {
      ws = H * 0.235;
      d = H * 0.56;
      gap = H * 0.045;
    }

    stageEl.style.setProperty('--ws', ws.toFixed(2) + 'px');
    stageEl.style.setProperty('--d', d.toFixed(2) + 'px');
    syncTabIndicator(activeIdx, false);
  }

  /* ------------------------------------------------------------------------
     Masked Caption Swap (WAAPI vertical clip slide)
     ------------------------------------------------------------------------ */
  function swapMaskedLine(container, nextText, dir, animate) {
    var existing = Array.prototype.slice.call(container.querySelectorAll('.cap-text'));

    if (!animate || reducedMotion || existing.length === 0) {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      var directSpan = document.createElement('span');
      directSpan.className = 'cap-text';
      directSpan.textContent = nextText;
      container.appendChild(directSpan);
      return;
    }

    // Remove any already-leaving spans beyond the current primary one
    for (var i = 0; i < existing.length; i++) {
      var oldEl = existing[i];
      if (oldEl.classList.contains('cap-leaving')) {
        if (oldEl.parentNode) oldEl.parentNode.removeChild(oldEl);
        continue;
      }
      var currentTransform = window.getComputedStyle(oldEl).transform;
      var fromTransform =
        currentTransform && currentTransform !== 'none'
          ? currentTransform
          : 'translateY(0%)';
      oldEl.classList.add('cap-leaving');
      var outAnim = oldEl.animate(
        [
          { transform: fromTransform },
          { transform: 'translateY(calc(' + (-dir * 105) + '% + ' + (-dir * 10) + 'px))' }
        ],
        {
          duration: 650,
          easing: 'cubic-bezier(.2, .8, .2, 1)',
          fill: 'both'
        }
      );
      (function (elToRemove) {
        outAnim.onfinish = function () {
          if (elToRemove.parentNode) elToRemove.parentNode.removeChild(elToRemove);
        };
        outAnim.oncancel = function () {
          if (elToRemove.parentNode) elToRemove.parentNode.removeChild(elToRemove);
        };
      })(oldEl);
    }

    var nextSpan = document.createElement('span');
    nextSpan.className = 'cap-text';
    nextSpan.textContent = nextText;
    container.appendChild(nextSpan);

    nextSpan.animate(
      [
        { transform: 'translateY(calc(' + (dir * 105) + '% + ' + (dir * 10) + 'px))' },
        { transform: 'translateY(0%)' }
      ],
      {
        duration: 650,
        easing: 'cubic-bezier(.2, .8, .2, 1)',
        fill: 'backwards'
      }
    );
  }

  function updateCaption(projIdx, dir, animate) {
    var proj = projects[projIdx];
    if (!proj) return;
    var direction = dir || 1;
    swapMaskedLine(capTitle, proj.title, direction, animate);
    swapMaskedLine(capSub, proj.subtitle, direction, animate);
    swapMaskedLine(capYear, proj.yearStatus, direction, animate);
  }

  /* ------------------------------------------------------------------------
     Active Project Synchronization
     ------------------------------------------------------------------------ */
  function commitActiveIndex(nextIdx, animate, updateUrl) {
    var resolved = isLoopMode ? wrapIndex(nextIdx) : clamp(nextIdx, 0, N - 1);
    if (resolved === activeIdx && animate) return;

    var dir = Math.sign(T - s) || (resolved > activeIdx ? 1 : -1) || 1;
    activeIdx = resolved;
    updateCaption(activeIdx, dir, animate);
    syncTabIndicator(activeIdx, animate);
    updateAboutIndexHighlight();
    if (updateUrl) {
      syncUrl(projects[activeIdx].id);
    }
  }

  function applyRubberBand(val) {
    if (isLoopMode) return val;
    if (val < 0) return val * 0.28;
    if (val > N - 1) return (N - 1) + (val - (N - 1)) * 0.28;
    return val;
  }

  function navigateToIndex(targetIdx) {
    var clamped = clamp(targetIdx, 0, N - 1);
    if (isLoopMode) {
      var curMod = wrapIndex(Math.round(T));
      var diff = clamped - curMod;
      if (diff > N / 2) diff -= N;
      if (diff < -N / 2) diff += N;
      T = Math.round(T) + diff;
    } else {
      T = clamped;
    }
    wheelRawT = T;
    commitActiveIndex(clamped, true, true);
  }

  function stepBy(delta) {
    if (openSheet) return;
    if (isLoopMode) {
      T = Math.round(T) + delta;
      wheelRawT = T;
      commitActiveIndex(wrapIndex(Math.round(T)), true, true);
    } else {
      var base = clamp(Math.round(T), 0, N - 1);
      var next = wrapIndex(base + delta);
      T = next;
      wheelRawT = T;
      commitActiveIndex(next, true, true);
    }
  }

  /* ------------------------------------------------------------------------
     About Sheet Static & Dynamic Content Population
     ------------------------------------------------------------------------ */
  function populateAboutSheet() {
    aboutTitle.textContent = author.name || 'Bruno Vinícius';
    aboutLocation.textContent = (
      author.location || 'Araraquara, São Paulo — Brasil'
    ).toUpperCase();
    aboutBioPt.textContent =
      author.bioPt ||
      'Engenheiro de software em Araraquara, São Paulo, dedicado a construir sistemas nativos, aplicativos multiplataforma e interfaces web com arquitetura limpa e acabamento tátil.';
    aboutBioEn.textContent =
      author.bioEn ||
      'Software engineer based in Araraquara, São Paulo, focused on native systems, cross-platform products and tactile editorial web interfaces.';

    while (aboutContacts.firstChild) {
      aboutContacts.removeChild(aboutContacts.firstChild);
    }

    var contactLinks = [
      {
        label: 'GITHUB / @BRUNOCHRBN',
        href: author.github || 'https://github.com/BrunoCHRBN',
        cls: 'cta-btn cta-primary',
        external: true
      },
      {
        label: 'LINKEDIN',
        href:
          author.linkedin ||
          'https://www.linkedin.com/in/bruno-vin%C3%ADcius-da-silva-santos/',
        cls: 'cta-btn cta-secondary',
        external: true
      },
      {
        label: (author.email || 'brusantos777@gmail.com').toUpperCase(),
        href: 'mailto:' + (author.email || 'brusantos777@gmail.com'),
        cls: 'cta-btn cta-secondary',
        external: false
      }
    ];

    for (var i = 0; i < contactLinks.length; i++) {
      var item = contactLinks[i];
      if (!isSafeHref(item.href)) continue;
      var a = document.createElement('a');
      a.className = item.cls;
      a.href = item.href;
      a.textContent = item.label;
      if (item.external) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
      aboutContacts.appendChild(a);
    }

    while (aboutIndexList.firstChild) {
      aboutIndexList.removeChild(aboutIndexList.firstChild);
    }

    for (var pIdx = 0; pIdx < N; pIdx++) {
      var proj = projects[pIdx];
      var li = document.createElement('li');
      li.className = 'about-index-row';

      var maskDiv = document.createElement('div');
      maskDiv.className = 'about-index-mask';

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'reveal-item about-index-item';
      btn.dataset.index = String(pIdx);

      var topRow = document.createElement('span');
      topRow.className = 'about-index-top';

      var titleSpan = document.createElement('span');
      titleSpan.className = 'about-index-title';
      titleSpan.textContent = proj.title;

      var sealSpan = document.createElement('span');
      sealSpan.className = 'lbl about-index-seal';
      sealSpan.textContent = proj.spineSeal || '';

      topRow.appendChild(titleSpan);
      topRow.appendChild(sealSpan);

      var subSpan = document.createElement('span');
      subSpan.className = 'lbl about-index-sub';
      subSpan.textContent = proj.subtitle;

      btn.appendChild(topRow);
      btn.appendChild(subSpan);

      (function (targetIndex) {
        btn.addEventListener('click', function () {
          closeAbout(function () {
            navigateToIndex(targetIndex);
          });
        });
      })(pIdx);

      maskDiv.appendChild(btn);
      li.appendChild(maskDiv);
      aboutIndexList.appendChild(li);
    }

    updateAboutIndexHighlight();
  }

  function updateAboutIndexHighlight() {
    var items = aboutIndexList.querySelectorAll('.about-index-item');
    for (var i = 0; i < items.length; i++) {
      var isCur = Number(items[i].dataset.index) === activeIdx;
      items[i].classList.toggle('is-current', isCur);
      if (isCur) {
        items[i].setAttribute('aria-current', 'true');
      } else {
        items[i].removeAttribute('aria-current');
      }
    }
  }

  /* ------------------------------------------------------------------------
     Sheet Geometry & Focus Management Helpers
     ------------------------------------------------------------------------ */
  function getActiveCoverRect() {
    var bestVol = null;
    var bestDist = Infinity;
    for (var i = 0; i < volumes.length; i++) {
      var dist = Math.abs(volumes[i].lastR);
      if (dist < bestDist) {
        bestDist = dist;
        bestVol = volumes[i];
      }
    }
    if (bestVol && bestVol.cv) {
      var rect = bestVol.cv.getBoundingClientRect();
      if (rect.width > 10 && rect.height > 10) {
        return rect;
      }
    }
    return {
      left: W / 2 - d / 2,
      top: shelfCy - H / 2,
      right: W / 2 + d / 2,
      bottom: shelfCy + H / 2,
      width: d,
      height: H
    };
  }

  function rectToInset(rect, radiusPx) {
    var top = Math.max(0, rect.top);
    var right = Math.max(0, W - rect.right);
    var bottom = Math.max(0, VH - rect.bottom);
    var left = Math.max(0, rect.left);
    return (
      'inset(' +
      top.toFixed(1) + 'px ' +
      right.toFixed(1) + 'px ' +
      bottom.toFixed(1) + 'px ' +
      left.toFixed(1) + 'px round ' +
      radiusPx + 'px)'
    );
  }

  function clearActiveSheetAnimations() {
    for (var i = 0; i < activeSheetAnimations.length; i++) {
      try {
        activeSheetAnimations[i].cancel();
      } catch (_) {
        // Ignore already-cancelled animations
      }
    }
    activeSheetAnimations = [];
  }

  function getFocusableElements(container) {
    var nodes = container.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    var list = [];
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.offsetParent !== null || window.getComputedStyle(el).position === 'fixed') {
        list.push(el);
      }
    }
    return list;
  }

  function trapFocus(e, container) {
    if (e.key !== 'Tab') return;
    var focusables = getFocusableElements(container);
    if (focusables.length === 0) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first || !container.contains(document.activeElement)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last || !container.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  /* ------------------------------------------------------------------------
     Detail Sheet (openDetail / closeDetail) + 7-Blob Ink Reveal
     ------------------------------------------------------------------------ */
  function buildDetailActions(proj) {
    while (detailActions.firstChild) {
      detailActions.removeChild(detailActions.firstChild);
    }

    if (proj.comingSoon) {
      var stampBtn = document.createElement('button');
      stampBtn.type = 'button';
      stampBtn.className = 'cta-btn cta-stamp';
      stampBtn.setAttribute('aria-disabled', 'true');
      stampBtn.textContent = 'EM BREVE NO GITHUB / COMING SOON';
      stampBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
      });
      detailActions.appendChild(stampBtn);

      var profileUrl = author.github || 'https://github.com/BrunoCHRBN';
      if (isSafeHref(profileUrl)) {
        var profileLink = document.createElement('a');
        profileLink.className = 'cta-btn cta-secondary';
        profileLink.href = profileUrl;
        profileLink.target = '_blank';
        profileLink.rel = 'noopener noreferrer';
        profileLink.textContent = 'PERFIL GITHUB / GITHUB PROFILE';
        detailActions.appendChild(profileLink);
      }
      return;
    }

    if (proj.liveUrl && isSafeHref(proj.liveUrl)) {
      var liveLink = document.createElement('a');
      liveLink.className = 'cta-btn cta-primary';
      liveLink.href = proj.liveUrl;
      liveLink.target = '_blank';
      liveLink.rel = 'noopener noreferrer';
      liveLink.textContent = 'ACESSAR PROJETO / LIVE SITE';
      detailActions.appendChild(liveLink);

      if (proj.githubUrl && isSafeHref(proj.githubUrl)) {
        var srcLink = document.createElement('a');
        srcLink.className = 'cta-btn cta-secondary';
        srcLink.href = proj.githubUrl;
        srcLink.target = '_blank';
        srcLink.rel = 'noopener noreferrer';
        srcLink.textContent = 'VER NO GITHUB / SOURCE';
        detailActions.appendChild(srcLink);
      }
      return;
    }

    if (proj.githubUrl && isSafeHref(proj.githubUrl)) {
      var repoLink = document.createElement('a');
      repoLink.className = 'cta-btn cta-primary';
      repoLink.href = proj.githubUrl;
      repoLink.target = '_blank';
      repoLink.rel = 'noopener noreferrer';
      repoLink.textContent = 'VER NO GITHUB / GITHUB REPO';
      detailActions.appendChild(repoLink);
    }
  }

  /* ------------------------------------------------------------------------
     Continuous Editorial Dossier & Full-Screen Gallery Lightbox
     ------------------------------------------------------------------------ */
  function getDossierStore() {
    return window.PORTFOLIO_DOSSIERS || null;
  }

  function getActiveDossier() {
    var store = getDossierStore();
    if (!store || !store.byId || !currentDossierProjectId) return null;
    return store.byId[currentDossierProjectId] || null;
  }

  function getDossierUi() {
    var store = getDossierStore();
    var fallback = {
      scrollCue: { pt: 'Explorar dossiê', en: 'Explore dossier' },
      labels: {
        challengeCol: { pt: 'O Desafio', en: 'The Challenge' },
        approachCol: { pt: 'A Abordagem', en: 'The Approach' },
        wireframeTag: {
          pt: 'Esboço editorial · Prancha pronta para captura',
          en: 'Editorial wireframe · Ready for capture'
        },
        photoTag: {
          pt: 'Captura real da aplicação',
          en: 'Live application capture'
        },
        expandHint: { pt: 'Ampliar', en: 'Expand' },
        closeLightbox: { pt: 'Fechar', en: 'Close' }
      }
    };
    return (store && store.ui) ? store.ui : fallback;
  }

  function pickLangField(obj, baseKey) {
    if (!obj) return '';
    var key = baseKey + (currentLang === 'en' ? 'En' : 'Pt');
    if (typeof obj[key] === 'string') return obj[key];
    return typeof obj[baseKey + 'Pt'] === 'string' ? obj[baseKey + 'Pt'] : '';
  }

  function pickLangObj(obj) {
    if (!obj) return '';
    if (typeof obj[currentLang] === 'string') return obj[currentLang];
    return typeof obj.pt === 'string' ? obj.pt : '';
  }

  function hasValidGalleryImage(item) {
    return Boolean(
      item &&
      typeof item.image === 'string' &&
      item.image.trim() !== '' &&
      isSafeSvgHref(item.image)
    );
  }

  function clearDossierAnimations() {
    for (var i = 0; i < activeDossierAnimations.length; i++) {
      try {
        activeDossierAnimations[i].cancel();
      } catch (_) {
        // Ignore already-cancelled animations
      }
    }
    activeDossierAnimations = [];
  }

  function clearLightboxAnimations() {
    for (var i = 0; i < activeLightboxAnimations.length; i++) {
      try {
        activeLightboxAnimations[i].cancel();
      } catch (_) {
        // Ignore already-cancelled animations
      }
    }
    activeLightboxAnimations = [];
  }

  function disconnectDossierObserver() {
    if (dossierObserver) {
      dossierObserver.disconnect();
      dossierObserver = null;
    }
  }

  function revealDossierSection(sec, animate) {
    if (!sec || sec.classList.contains('is-revealed')) return;
    sec.classList.add('is-revealed');

    if (!animate || reducedMotion) return;

    var rule = sec.querySelector('.dossier-rule');
    if (rule) {
      var ruleAnim = rule.animate(
        [
          { transform: 'scaleX(0)' },
          { transform: 'scaleX(1)' }
        ],
        {
          duration: 720,
          easing: 'cubic-bezier(.2, .8, .2, 1)',
          fill: 'backwards'
        }
      );
      activeDossierAnimations.push(ruleAnim);
    }

    var items = sec.querySelectorAll('.dossier-reveal-item');
    for (var i = 0; i < items.length; i++) {
      var itemAnim = items[i].animate(
        [
          { transform: 'translateY(calc(100% + 12px))' },
          { transform: 'translateY(0%)' }
        ],
        {
          duration: 650,
          delay: i * 60,
          easing: 'cubic-bezier(.2, .8, .2, 1)',
          fill: 'backwards'
        }
      );
      activeDossierAnimations.push(itemAnim);
    }
  }

  function checkVisibleDossierSections() {
    if (openSheet !== 'detail') return;
    var rootRect = detailSheet.getBoundingClientRect();
    if (rootRect.height <= 0) return;
    for (var i = 0; i < dossierSections.length; i++) {
      var sec = dossierSections[i];
      if (sec.classList.contains('is-revealed')) continue;
      var r = sec.getBoundingClientRect();
      var visibleH = Math.min(r.bottom, rootRect.bottom) - Math.max(r.top, rootRect.top);
      if (visibleH >= Math.min(r.height * 0.12, 80)) {
        revealDossierSection(sec, true);
        if (dossierObserver) dossierObserver.unobserve(sec);
      }
    }
  }

  function setupDossierObserver() {
    disconnectDossierObserver();
    clearDossierAnimations();

    for (var i = 0; i < dossierSections.length; i++) {
      dossierSections[i].classList.remove('is-revealed');
    }

    if (reducedMotion || typeof window.IntersectionObserver !== 'function') {
      for (var j = 0; j < dossierSections.length; j++) {
        revealDossierSection(dossierSections[j], false);
      }
      return;
    }

    dossierObserver = new window.IntersectionObserver(
      function (entries) {
        for (var k = 0; k < entries.length; k++) {
          if (entries[k].isIntersecting) {
            revealDossierSection(entries[k].target, true);
            if (dossierObserver) {
              dossierObserver.unobserve(entries[k].target);
            }
          }
        }
      },
      {
        root: detailSheet,
        threshold: 0.12
      }
    );

    for (var m = 0; m < dossierSections.length; m++) {
      dossierObserver.observe(dossierSections[m]);
    }
  }

  function syncLangButtons() {
    for (var i = 0; i < langButtons.length; i++) {
      var btn = langButtons[i];
      var isCur = btn.dataset.lang === currentLang;
      btn.classList.toggle('is-active', isCur);
      btn.setAttribute('aria-pressed', isCur ? 'true' : 'false');
    }
  }

  function applyDossierLanguage() {
    var savedScroll = detailSheet.scrollTop;
    syncLangButtons();

    var ui = getDossierUi();
    var labels = ui.labels || {};
    detailScrollCueText.textContent = pickLangObj(ui.scrollCue).toUpperCase();
    dossierChallengeLabel.textContent = pickLangObj(labels.challengeCol).toUpperCase();
    dossierApproachLabel.textContent = pickLangObj(labels.approachCol).toUpperCase();

    var dossier = getActiveDossier();
    if (!dossier) return;

    dossierChallengeBody.textContent = pickLangObj(dossier.challenge);
    dossierApproachBody.textContent = pickLangObj(dossier.approach);

    var highlights = Array.isArray(dossier.highlights) ? dossier.highlights : [];
    for (var i = 0; i < dossierDomRefs.highlights.length; i++) {
      var ref = dossierDomRefs.highlights[i];
      var item = highlights[i];
      if (!item) continue;
      ref.kicker.textContent = pickLangField(item, 'kicker').toUpperCase();
      ref.title.textContent = pickLangField(item, 'title');
      ref.body.textContent = pickLangField(item, 'body');
    }

    if (dossier.architecture) {
      dossierArchSummary.textContent = pickLangField(dossier.architecture, 'summary');
    }

    var gallery = Array.isArray(dossier.gallery) ? dossier.gallery : [];
    var expandText = pickLangObj(labels.expandHint).toUpperCase() + ' ↗';
    for (var g = 0; g < dossierDomRefs.gallery.length; g++) {
      var gRef = dossierDomRefs.gallery[g];
      var gItem = gallery[g];
      if (!gItem) continue;
      var titleText = pickLangField(gItem, 'title');
      var hasImg = hasValidGalleryImage(gItem);
      gRef.eyebrow.textContent = pickLangField(gItem, 'eyebrow').toUpperCase();
      gRef.tag.textContent = pickLangObj(
        hasImg ? labels.photoTag : labels.wireframeTag
      ).toUpperCase();
      gRef.title.textContent = titleText;
      gRef.caption.textContent = pickLangField(gItem, 'caption');
      gRef.expand.textContent = expandText;
      gRef.button.setAttribute(
        'aria-label',
        titleText + ' — ' + pickLangObj(labels.expandHint)
      );
      if (gRef.imgEl) {
        gRef.imgEl.alt = titleText;
      }
    }

    if (lightboxOpen) {
      updateLightboxCaptionOnly();
    }

    detailSheet.scrollTop = savedScroll;
  }

  function setDossierLang(nextLang) {
    if (nextLang !== 'pt' && nextLang !== 'en') return;
    if (nextLang === currentLang) return;
    currentLang = nextLang;
    applyDossierLanguage();
  }

  function renderDossier(proj) {
    currentDossierProjectId = proj ? proj.id : null;
    dossierDomRefs = { highlights: [], gallery: [] };
    preloadedGalleryImages = [];

    var dossier = getActiveDossier();
    if (!dossier) {
      detailDossier.style.display = 'none';
      detailScrollCue.style.display = 'none';
      return;
    }

    detailDossier.style.display = '';
    detailScrollCue.style.display = '';

    // Section 2: Highlights
    while (dossierHighlightsGrid.firstChild) {
      dossierHighlightsGrid.removeChild(dossierHighlightsGrid.firstChild);
    }
    var highlights = Array.isArray(dossier.highlights) ? dossier.highlights : [];
    for (var i = 0; i < highlights.length; i++) {
      var card = document.createElement('article');
      card.className = 'highlight-card';

      var kMask = document.createElement('div');
      kMask.className = 'dossier-reveal-mask';
      var kEl = document.createElement('p');
      kEl.className = 'dossier-reveal-item lbl highlight-kicker';
      kMask.appendChild(kEl);

      var tMask = document.createElement('div');
      tMask.className = 'dossier-reveal-mask';
      var tEl = document.createElement('h4');
      tEl.className = 'dossier-reveal-item highlight-title';
      tMask.appendChild(tEl);

      var bMask = document.createElement('div');
      bMask.className = 'dossier-reveal-mask';
      var bEl = document.createElement('p');
      bEl.className = 'dossier-reveal-item highlight-body';
      bMask.appendChild(bEl);

      card.appendChild(kMask);
      card.appendChild(tMask);
      card.appendChild(bMask);
      dossierHighlightsGrid.appendChild(card);

      dossierDomRefs.highlights.push({
        kicker: kEl,
        title: tEl,
        body: bEl
      });
    }

    // Section 3: Architecture Diagram SVG
    if (dossier.architecture && typeof dossier.architecture.buildDiagramSVG === 'function') {
      mountFullSvg(dossierArchPlate, dossier.architecture.buildDiagramSVG('arch'));
    } else {
      while (dossierArchPlate.firstChild) {
        dossierArchPlate.removeChild(dossierArchPlate.firstChild);
      }
    }

    // Section 4: Gallery Plates (auto-swaps between real image and wireframe SVG)
    while (dossierGalleryGrid.firstChild) {
      dossierGalleryGrid.removeChild(dossierGalleryGrid.firstChild);
    }
    var gallery = Array.isArray(dossier.gallery) ? dossier.gallery : [];
    for (var g = 0; g < gallery.length; g++) {
      var gItem = gallery[g];
      var wrap = document.createElement('div');
      wrap.className =
        'dossier-reveal-mask gallery-plate-wrap' + (gItem.featured ? ' is-featured' : '');

      var plateBtn = document.createElement('button');
      plateBtn.type = 'button';
      plateBtn.className = 'dossier-reveal-item gallery-plate';
      plateBtn.dataset.plateIndex = String(g);
      plateBtn.dataset.plateId = gItem.id || ('plate-' + g);

      var mediaBox = document.createElement('div');
      mediaBox.className = 'gallery-media';

      var imgEl = null;
      if (hasValidGalleryImage(gItem)) {
        imgEl = document.createElement('img');
        imgEl.className = 'gallery-img';
        imgEl.src = gItem.image;
        imgEl.alt = pickLangField(gItem, 'title');
        imgEl.loading = 'lazy';
        imgEl.decoding = 'async';
        mediaBox.appendChild(imgEl);

        // Preload real gallery image for instant Lightbox display
        var preImg = new window.Image();
        preImg.decoding = 'async';
        preImg.src = gItem.image;
        preloadedGalleryImages.push(preImg);
      } else if (typeof gItem.buildWireframeSVG === 'function') {
        mountFullSvg(mediaBox, gItem.buildWireframeSVG('gal-' + g));
      }

      var footer = document.createElement('div');
      footer.className = 'gallery-footer';

      var metaRow = document.createElement('div');
      metaRow.className = 'gallery-meta-row';
      var eyebrowEl = document.createElement('span');
      eyebrowEl.className = 'lbl gallery-eyebrow';
      var tagEl = document.createElement('span');
      tagEl.className = 'lbl gallery-tag';
      metaRow.appendChild(eyebrowEl);
      metaRow.appendChild(tagEl);

      var titleRow = document.createElement('div');
      titleRow.className = 'gallery-title-row';
      var titleEl = document.createElement('span');
      titleEl.className = 'gallery-title';
      var expandEl = document.createElement('span');
      expandEl.className = 'lbl gallery-expand';
      titleRow.appendChild(titleEl);
      titleRow.appendChild(expandEl);

      var captionEl = document.createElement('p');
      captionEl.className = 'gallery-caption';

      footer.appendChild(metaRow);
      footer.appendChild(titleRow);
      footer.appendChild(captionEl);

      plateBtn.appendChild(mediaBox);
      plateBtn.appendChild(footer);

      (function (plateIdx, btnNode) {
        btnNode.addEventListener('click', function () {
          openLightbox(plateIdx, btnNode);
        });
      })(g, plateBtn);

      wrap.appendChild(plateBtn);
      dossierGalleryGrid.appendChild(wrap);

      dossierDomRefs.gallery.push({
        button: plateBtn,
        eyebrow: eyebrowEl,
        tag: tagEl,
        title: titleEl,
        caption: captionEl,
        expand: expandEl,
        imgEl: imgEl
      });
    }

    applyDossierLanguage();
  }

  function updateLightboxCaptionOnly() {
    var dossier = getActiveDossier();
    if (!dossier || !Array.isArray(dossier.gallery)) return;
    var item = dossier.gallery[lightboxIndex];
    if (!item) return;

    var ui = getDossierUi();
    var labels = ui.labels || {};
    var hasImg = hasValidGalleryImage(item);
    var titleText = pickLangField(item, 'title');

    lightboxCounter.textContent =
      (lightboxIndex + 1) + ' / ' + dossier.gallery.length;
    lightboxEyebrow.textContent = pickLangField(item, 'eyebrow').toUpperCase();
    lightboxTag.textContent = pickLangObj(
      hasImg ? labels.photoTag : labels.wireframeTag
    ).toUpperCase();
    lightboxTitle.textContent = titleText;
    lightboxDesc.textContent = pickLangField(item, 'caption');

    var lbImg = lightboxMedia.querySelector('.lightbox-img');
    if (lbImg) {
      lbImg.alt = titleText;
    }
  }

  function renderLightboxSlide(index) {
    var dossier = getActiveDossier();
    if (!dossier || !Array.isArray(dossier.gallery) || dossier.gallery.length === 0) {
      return;
    }

    var len = dossier.gallery.length;
    lightboxIndex = ((index % len) + len) % len;
    var item = dossier.gallery[lightboxIndex];

    while (lightboxMedia.firstChild) {
      lightboxMedia.removeChild(lightboxMedia.firstChild);
    }

    if (hasValidGalleryImage(item)) {
      lightboxMedia.classList.remove('is-wireframe');
      lightboxMedia.classList.add('is-photo');
      var img = document.createElement('img');
      img.className = 'lightbox-img';
      img.src = item.image;
      img.alt = pickLangField(item, 'title');
      img.decoding = 'async';
      lightboxMedia.appendChild(img);
    } else {
      lightboxMedia.classList.remove('is-photo');
      lightboxMedia.classList.add('is-wireframe');
      if (typeof item.buildWireframeSVG === 'function') {
        mountFullSvg(lightboxMedia, item.buildWireframeSVG('lb-' + lightboxIndex));
      }
    }

    updateLightboxCaptionOnly();
  }

  function getGalleryPlateButton(index) {
    return dossierGalleryGrid.querySelector(
      '.gallery-plate[data-plate-index="' + index + '"]'
    );
  }

  function getPlateRect(index, fallbackEl) {
    var btn = fallbackEl || getGalleryPlateButton(index);
    var target = btn ? (btn.querySelector('.gallery-media') || btn) : null;
    if (target) {
      var rect = target.getBoundingClientRect();
      if (rect.width > 10 && rect.height > 10) {
        return rect;
      }
    }
    return {
      left: W * 0.15,
      top: VH * 0.2,
      right: W * 0.85,
      bottom: VH * 0.8,
      width: W * 0.7,
      height: VH * 0.6
    };
  }

  function forceHideLightbox() {
    clearLightboxAnimations();
    lightboxEl.style.visibility = 'hidden';
    lightboxEl.setAttribute('aria-hidden', 'true');
    while (lightboxMedia.firstChild) {
      lightboxMedia.removeChild(lightboxMedia.firstChild);
    }
    lightboxOpen = false;
    lightboxClosing = false;
    lightboxOpId += 1;
  }

  function openLightbox(plateIndex, triggerBtn) {
    if (openSheet !== 'detail' || sheetClosing) return;
    var dossier = getActiveDossier();
    if (!dossier || !Array.isArray(dossier.gallery) || dossier.gallery.length === 0) {
      return;
    }

    lightboxOpen = true;
    lightboxClosing = false;
    lightboxOpId += 1;
    cursorEl.classList.remove('open', 'spine');

    renderLightboxSlide(plateIndex);
    syncLangButtons();

    var rect = getPlateRect(lightboxIndex, triggerBtn);
    var fromInset = rectToInset(rect, 2);

    clearLightboxAnimations();
    lightboxEl.style.visibility = 'visible';
    lightboxEl.setAttribute('aria-hidden', 'false');
    lightboxEl.scrollTop = 0;

    var openAnim = lightboxEl.animate(
      [
        { clipPath: fromInset },
        { clipPath: 'inset(0px 0px 0px 0px round 0px)' }
      ],
      {
        duration: reducedMotion ? 1 : 650,
        easing: 'cubic-bezier(.76, 0, .18, 1)',
        fill: 'backwards'
      }
    );
    activeLightboxAnimations.push(openAnim);

    lightboxClose.focus({ preventScroll: true });
  }

  function stepLightbox(delta) {
    if (!lightboxOpen || lightboxClosing) return;
    renderLightboxSlide(lightboxIndex + delta);
  }

  function closeLightbox() {
    if (!lightboxOpen || lightboxClosing) return;

    lightboxClosing = true;
    var opId = ++lightboxOpId;
    var targetBtn = getGalleryPlateButton(lightboxIndex);
    var rect = getPlateRect(lightboxIndex, targetBtn);
    var toInset = rectToInset(rect, 2);

    clearLightboxAnimations();
    var closeAnim = lightboxEl.animate(
      [
        { clipPath: 'inset(0px 0px 0px 0px round 0px)' },
        { clipPath: toInset }
      ],
      {
        duration: reducedMotion ? 1 : 500,
        easing: 'cubic-bezier(.76, 0, .18, 1)',
        fill: 'both'
      }
    );
    activeLightboxAnimations.push(closeAnim);

    closeAnim.finished.then(
      function () {
        if (opId !== lightboxOpId) return;
        lightboxEl.style.visibility = 'hidden';
        lightboxEl.setAttribute('aria-hidden', 'true');
        clearLightboxAnimations();
        while (lightboxMedia.firstChild) {
          lightboxMedia.removeChild(lightboxMedia.firstChild);
        }
        lightboxOpen = false;
        lightboxClosing = false;
        if (targetBtn && document.contains(targetBtn)) {
          targetBtn.focus({ preventScroll: true });
        } else {
          detailClose.focus({ preventScroll: true });
        }
      },
      function () {
        if (opId === lightboxOpId) {
          lightboxClosing = false;
        }
      }
    );
  }

  function openDetail(triggerEl) {
    if (openSheet === 'detail' && !sheetClosing) return;

    if (lightboxOpen) {
      forceHideLightbox();
    }

    if (openSheet === 'about') {
      aboutSheet.style.visibility = 'hidden';
      aboutSheet.setAttribute('aria-hidden', 'true');
      clearActiveSheetAnimations();
      openSheet = null;
    }

    // Settle T cleanly to integer so active cover geometry is exact
    var settledIdx = isLoopMode
      ? wrapIndex(Math.round(T))
      : clamp(Math.round(T), 0, N - 1);
    T = isLoopMode ? Math.round(T) : settledIdx;
    s = T;
    wheelRawT = T;
    commitActiveIndex(settledIdx, false, true);
    renderVolumes(0, false);

    var proj = projects[activeIdx];
    if (!proj) return;

    lastTriggerEl = triggerEl || document.activeElement;
    openSheet = 'detail';
    sheetClosing = false;
    sheetOpId += 1;

    cursorEl.classList.remove('open', 'spine');

    detailSub.textContent = proj.subtitle;
    detailTitle.textContent = proj.title;
    detailMeta.textContent = proj.meta;
    detailSynopsisPt.textContent = proj.synopsisPt;
    detailSynopsisEn.textContent = proj.synopsisEn;
    buildDetailActions(proj);
    renderDossier(proj);

    // Inject full inner cover SVG inside masked poster group
    mountSvgInnerFragment(posterArtG, catalog.buildCoverInnerSVG(proj, 'poster'));

    // Reset 7 ink blobs (or reveal immediately under reduced motion)
    for (var b = 0; b < inkBlobs.length; b++) {
      inkBlobs[b].el.setAttribute('r', reducedMotion ? '720' : '0');
    }

    var rect = getActiveCoverRect();
    var originX = rect.left + rect.width / 2;
    var originY = rect.top + rect.height / 2;
    var fromInset = rectToInset(rect, 3);

    clearActiveSheetAnimations();
    detailSheet.style.visibility = 'visible';
    detailSheet.setAttribute('aria-hidden', 'false');
    detailSheet.scrollTop = 0;
    detailSheet.style.transformOrigin =
      originX.toFixed(1) + 'px ' + originY.toFixed(1) + 'px';

    setupDossierObserver();

    var sheetAnim = detailSheet.animate(
      [
        { clipPath: fromInset, transform: 'rotate(-4.5deg)' },
        { clipPath: 'inset(0px 0px 0px 0px round 0px)', transform: 'rotate(0deg)' }
      ],
      {
        duration: reducedMotion ? 1 : 1050,
        easing: 'cubic-bezier(.76, 0, .18, 1)',
        fill: 'backwards'
      }
    );
    activeSheetAnimations.push(sheetAnim);

    var revealItems = detailSheet.querySelectorAll('.detail-info .reveal-item');
    for (var idx = 0; idx < revealItems.length; idx++) {
      var lineAnim = revealItems[idx].animate(
        [
          { transform: 'translateY(calc(100% + 14px))' },
          { transform: 'translateY(0%)' }
        ],
        {
          duration: reducedMotion ? 1 : 900,
          delay: reducedMotion ? 0 : (620 + idx * 75),
          easing: 'cubic-bezier(.2, .8, .2, 1)',
          fill: 'backwards'
        }
      );
      activeSheetAnimations.push(lineAnim);
    }

    // Schedule 7-blob ink reveal in the single master rAF loop
    inkRevealActive = true;
    inkRevealStart = reducedMotion
      ? performance.now() - 5000
      : performance.now() + 520;

    detailClose.focus({ preventScroll: true });
  }

  function closeDetail() {
    if (openSheet !== 'detail' || sheetClosing) return;

    if (lightboxOpen) {
      forceHideLightbox();
    }

    sheetClosing = true;
    inkRevealActive = false;
    disconnectDossierObserver();
    clearDossierAnimations();
    var opId = ++sheetOpId;

    var rect = getActiveCoverRect();
    var originX = rect.left + rect.width / 2;
    var originY = rect.top + rect.height / 2;
    var toInset = rectToInset(rect, 3);

    detailSheet.style.transformOrigin =
      originX.toFixed(1) + 'px ' + originY.toFixed(1) + 'px';

    clearActiveSheetAnimations();
    var closeAnim = detailSheet.animate(
      [
        { clipPath: 'inset(0px 0px 0px 0px round 0px)', transform: 'rotate(0deg)' },
        { clipPath: toInset, transform: 'rotate(-4.5deg)' }
      ],
      {
        duration: reducedMotion ? 1 : 850,
        easing: 'cubic-bezier(.76, 0, .18, 1)',
        fill: 'both'
      }
    );
    activeSheetAnimations.push(closeAnim);

    closeAnim.finished.then(
      function () {
        if (opId !== sheetOpId) return;
        detailSheet.style.visibility = 'hidden';
        detailSheet.setAttribute('aria-hidden', 'true');
        clearActiveSheetAnimations();
        openSheet = null;
        sheetClosing = false;
        restoreFocus();
      },
      function () {
        if (opId === sheetOpId) {
          sheetClosing = false;
        }
      }
    );
  }

  /* ------------------------------------------------------------------------
     About / Colophon Sheet (openAbout / closeAbout)
     ------------------------------------------------------------------------ */
  function openAbout(triggerEl) {
    if (openSheet === 'about' && !sheetClosing) return;

    if (lightboxOpen) {
      forceHideLightbox();
    }

    if (openSheet === 'detail') {
      detailSheet.style.visibility = 'hidden';
      detailSheet.setAttribute('aria-hidden', 'true');
      inkRevealActive = false;
      disconnectDossierObserver();
      clearDossierAnimations();
      clearActiveSheetAnimations();
      openSheet = null;
    }

    lastTriggerEl = triggerEl || btnAbout;
    openSheet = 'about';
    sheetClosing = false;
    sheetOpId += 1;
    cursorEl.classList.remove('open', 'spine');
    updateAboutIndexHighlight();

    var triggerRect = (triggerEl || btnAbout).getBoundingClientRect();
    var fromInset = rectToInset(triggerRect, 2);

    clearActiveSheetAnimations();
    aboutSheet.style.visibility = 'visible';
    aboutSheet.setAttribute('aria-hidden', 'false');
    aboutSheet.scrollTop = 0;

    var sheetAnim = aboutSheet.animate(
      [
        { clipPath: fromInset },
        { clipPath: 'inset(0px 0px 0px 0px round 0px)' }
      ],
      {
        duration: reducedMotion ? 1 : 800,
        easing: 'cubic-bezier(.76, 0, .18, 1)',
        fill: 'backwards'
      }
    );
    activeSheetAnimations.push(sheetAnim);

    var revealItems = aboutSheet.querySelectorAll('.reveal-item');
    for (var idx = 0; idx < revealItems.length; idx++) {
      var itemAnim = revealItems[idx].animate(
        [
          { transform: 'translateY(calc(100% + 14px))' },
          { transform: 'translateY(0%)' }
        ],
        {
          duration: reducedMotion ? 1 : 800,
          delay: reducedMotion ? 0 : (360 + idx * 55),
          easing: 'cubic-bezier(.2, .8, .2, 1)',
          fill: 'backwards'
        }
      );
      activeSheetAnimations.push(itemAnim);
    }

    aboutClose.focus({ preventScroll: true });
  }

  function closeAbout(afterClose) {
    if (openSheet !== 'about' || sheetClosing) return;

    sheetClosing = true;
    var opId = ++sheetOpId;
    var triggerRect = btnAbout.getBoundingClientRect();
    var toInset = rectToInset(triggerRect, 2);

    clearActiveSheetAnimations();
    var closeAnim = aboutSheet.animate(
      [
        { clipPath: 'inset(0px 0px 0px 0px round 0px)' },
        { clipPath: toInset }
      ],
      {
        duration: reducedMotion ? 1 : 650,
        easing: 'cubic-bezier(.76, 0, .18, 1)',
        fill: 'both'
      }
    );
    activeSheetAnimations.push(closeAnim);

    closeAnim.finished.then(
      function () {
        if (opId !== sheetOpId) return;
        aboutSheet.style.visibility = 'hidden';
        aboutSheet.setAttribute('aria-hidden', 'true');
        clearActiveSheetAnimations();
        openSheet = null;
        sheetClosing = false;
        if (typeof afterClose === 'function') {
          afterClose();
        } else {
          restoreFocus();
        }
      },
      function () {
        if (opId === sheetOpId) {
          sheetClosing = false;
        }
      }
    );
  }

  function restoreFocus() {
    if (
      lastTriggerEl &&
      document.contains(lastTriggerEl) &&
      typeof lastTriggerEl.focus === 'function'
    ) {
      lastTriggerEl.focus({ preventScroll: true });
    }
  }

  /* ------------------------------------------------------------------------
     3D Volume Transform & Lighting Render (called inside single rAF loop)
     ------------------------------------------------------------------------ */
  function renderVolumes(dt, allowHover) {
    var totalSlots = volumes.length;
    var liftAlpha = reducedMotion ? 1 : (1 - Math.exp(-12 * dt));

    for (var i = 0; i < totalSlots; i++) {
      var vol = volumes[i];
      var r;
      if (isLoopMode) {
        var raw = (((vol.slot - s) % totalSlots) + totalSlots) % totalSlots;
        r = raw > totalSlots / 2 ? raw - totalSlots : raw;
      } else {
        r = vol.slot - s;
      }
      vol.lastR = r;

      var absR = Math.abs(r);
      var B = absR < 1
        ? (r + Math.sin(Math.PI * r) / Math.PI) / 2
        : Math.sign(r) * 0.5;
      var x = r * (ws + gap) + (d - ws + 1.6 * gap) * B;
      var o = smoothstep(Math.max(0, 1 - absR));

      var liftTarget =
        allowHover &&
        !openSheet &&
        !isDragging &&
        pointerFine &&
        hoveredSlot === vol.slot &&
        absR > 0.5
          ? 1
          : 0;

      if (dt > 0) {
        vol.lift += (liftTarget - vol.lift) * liftAlpha;
        if (Math.abs(liftTarget - vol.lift) < 1e-4) vol.lift = liftTarget;
      }

      var ry = -90 * o + tiltY * o;
      var rx = tiltX * o;
      var rz = -4.5 * o;
      var tz = o * 0.20 * H;
      var ty = -o * 0.025 * H - vol.lift * 0.045 * H;

      vol.el.style.transform =
        'translate3d(' +
        x.toFixed(2) + 'px, ' +
        ty.toFixed(2) + 'px, ' +
        tz.toFixed(2) + 'px) rotateZ(' +
        rz.toFixed(3) + 'deg) rotateX(' +
        rx.toFixed(3) + 'deg) rotateY(' +
        ry.toFixed(3) + 'deg)';
      vol.el.style.zIndex = String(Math.round(100 - absR * 4));
      vol.el.dataset.active = absR < 0.5 ? 'true' : 'false';

      vol.sp.style.setProperty('--shade', (o * 0.55).toFixed(4));
      vol.cv.style.setProperty('--shade', ((1 - o) * 0.50).toFixed(4));
    }
  }

  /* ------------------------------------------------------------------------
     Single Master requestAnimationFrame Loop
     ------------------------------------------------------------------------ */
  var lastTime = performance.now();

  function tick(now) {
    var dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;

    // 1. Exponential shelf spring
    var k = isDragging ? 18 : 5.2;
    var springAlpha = reducedMotion ? 1 : (1 - Math.exp(-k * dt));
    s += (T - s) * springAlpha;
    if (Math.abs(T - s) < 1e-4) {
      s = T;
      if (isLoopMode && !isDragging && !wheelActive && Math.abs(T) > N * 10) {
        var shift = Math.trunc(T / N) * N;
        T -= shift;
        s -= shift;
        wheelRawT -= shift;
      }
    }

    // 2. Cursor tilt toward active cover
    var settled = Math.abs(T - s) < 0.3;
    var overActiveCover =
      hasPointer &&
      pointerFine &&
      !openSheet &&
      !isDragging &&
      settled &&
      Math.abs(mx - W / 2) < 0.55 * d &&
      Math.abs(my - shelfCy) < 0.55 * H;

    var targetTiltY = 0;
    var targetTiltX = 0;
    if (!reducedMotion && !openSheet && hasPointer && pointerFine) {
      if (overActiveCover) {
        targetTiltY = ((mx - W / 2) / (0.55 * d)) * 9;
        targetTiltX = -((my - shelfCy) / (H / 2)) * 6;
      } else {
        targetTiltY = ((mx - W / 2) / W) * 5;
        targetTiltX = 0;
      }
    }
    var tiltAlpha = reducedMotion ? 1 : (1 - Math.exp(-7 * dt));
    tiltY += (targetTiltY - tiltY) * tiltAlpha;
    tiltX += (targetTiltX - tiltX) * tiltAlpha;

    // 3. Render 3D volumes
    renderVolumes(dt, true);

    // 4. Open ring button anchored at lower-left corner of active cover
    var ringScale = openSheet
      ? 0
      : smoothstep(Math.max(0, 1 - Math.abs(T - s) * 3));
    openRingBtn.style.left = (W / 2 - 0.5 * d - 6).toFixed(1) + 'px';
    openRingBtn.style.top = (shelfCy + 0.36 * H).toFixed(1) + 'px';
    openRingBtn.style.transform =
      'translate(-50%, -50%) scale(' + ringScale.toFixed(4) + ')';
    openRingBtn.style.pointerEvents = ringScale > 0.5 ? 'auto' : 'none';

    // 5. Custom editorial cursor (fine pointer only)
    if (pointerFine) {
      var cursorAlpha = reducedMotion ? 1 : (1 - Math.exp(-16 * dt));
      cx += (mx - cx) * cursorAlpha;
      cy += (my - cy) * cursorAlpha;
      cursorEl.style.transform =
        'translate3d(' +
        cx.toFixed(2) + 'px, ' +
        cy.toFixed(2) + 'px, 0) scale(' +
        (hasPointer ? 1 : 0) + ')';

      var hoveringInactiveSpine = false;
      if (!openSheet && hoveredSlot >= 0 && hoveredSlot < volumes.length) {
        hoveringInactiveSpine = Math.abs(volumes[hoveredSlot].lastR) > 0.5;
      }

      if (hoveredInteractive) {
        cursorEl.classList.add('btn');
        cursorEl.classList.remove('open', 'spine');
      } else if (overActiveCover) {
        cursorEl.classList.add('open');
        cursorEl.classList.remove('btn', 'spine');
      } else if (hoveringInactiveSpine) {
        cursorEl.classList.add('spine');
        cursorEl.classList.remove('open', 'btn');
      } else {
        cursorEl.classList.remove('open', 'spine', 'btn');
      }
    }

    // 6. 7-blob SVG ink bleed mask reveal
    if (inkRevealActive) {
      var elapsed = now - inkRevealStart;
      var allDone = elapsed >= 2400;
      for (var b = 0; b < inkBlobs.length; b++) {
        var blob = inkBlobs[b];
        var p = clamp((elapsed - blob.delay) / 1250, 0, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        var radius = allDone ? 720 : eased * 720;
        blob.el.setAttribute('r', radius.toFixed(2));
      }
      if (allDone) {
        inkRevealActive = false;
      }
    }

    window.requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------------------
     Event Listeners (Click, Drag, Wheel, Keyboard, Pointer, Resize)
     ------------------------------------------------------------------------ */
  function updateHoverTargets(target) {
    if (!target || typeof target.closest !== 'function') {
      hoveredInteractive = false;
      hoveredSlot = -1;
      return;
    }
    var btnOrLink = target.closest('button:not([aria-disabled="true"]), a[href]');
    hoveredInteractive = Boolean(btnOrLink);

    if (!openSheet) {
      var volNode = target.closest('.volume');
      hoveredSlot = volNode ? Number(volNode.dataset.slot) : -1;
    } else {
      hoveredSlot = -1;
    }
  }

  shelfSection.addEventListener('pointerdown', function (e) {
    if (openSheet) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    pointerDown = true;
    isDragging = false;
    dragPointerId = e.pointerId;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartT = T;
  });

  window.addEventListener('pointermove', function (e) {
    mx = e.clientX;
    my = e.clientY;

    if (e.pointerType !== 'touch' && pointerFine) {
      if (!pointerInitialized) {
        cx = mx;
        cy = my;
        pointerInitialized = true;
      }
      hasPointer = true;
      if (!isDragging) {
        updateHoverTargets(e.target);
      }
    }

    if (!pointerDown) return;

    var dx = e.clientX - dragStartX;
    var dy = e.clientY - dragStartY;

    if (!isDragging && Math.abs(dx) > 5 && Math.abs(dx) >= Math.abs(dy) * 0.8) {
      isDragging = true;
      hoveredSlot = -1;
      if (wheelSettleTimer) {
        window.clearTimeout(wheelSettleTimer);
        wheelSettleTimer = null;
        wheelActive = false;
      }
      try {
        shelfSection.setPointerCapture(dragPointerId);
      } catch (_) {
        // Synthetic or detached pointer events may not support capture
      }
    }

    if (isDragging) {
      var stepX = Math.max(40, ws + gap);
      var rawT = dragStartT - dx / stepX;
      T = applyRubberBand(rawT);
      wheelRawT = T;

      var nearest = isLoopMode
        ? wrapIndex(Math.round(T))
        : clamp(Math.round(T), 0, N - 1);
      if (nearest !== activeIdx) {
        commitActiveIndex(nearest, true, true);
      }
    }
  });

  function finishDrag() {
    if (!pointerDown) return;
    var wasDragging = isDragging;
    pointerDown = false;
    isDragging = false;

    if (dragPointerId !== null) {
      try {
        if (shelfSection.hasPointerCapture(dragPointerId)) {
          shelfSection.releasePointerCapture(dragPointerId);
        }
      } catch (_) {
        // Ignore release errors
      }
      dragPointerId = null;
    }

    if (wasDragging) {
      var snapped = isLoopMode
        ? Math.round(T)
        : clamp(Math.round(T), 0, N - 1);
      T = snapped;
      wheelRawT = T;
      commitActiveIndex(isLoopMode ? wrapIndex(snapped) : snapped, true, true);

      suppressNextClick = true;
      if (suppressTimer) window.clearTimeout(suppressTimer);
      suppressTimer = window.setTimeout(function () {
        suppressNextClick = false;
        suppressTimer = null;
      }, 60);
    }
  }

  window.addEventListener('pointerup', finishDrag);
  window.addEventListener('pointercancel', finishDrag);

  document.addEventListener('pointerleave', function () {
    hasPointer = false;
    hoveredSlot = -1;
    hoveredInteractive = false;
  });

  window.addEventListener('blur', function () {
    hasPointer = false;
    hoveredSlot = -1;
    hoveredInteractive = false;
    finishDrag();
  });

  shelfSection.addEventListener('click', function (e) {
    if (suppressNextClick || openSheet) return;

    var volNode = e.target.closest('.volume');
    var vol = volNode ? volumes[Number(volNode.dataset.slot)] : null;

    if (!vol) {
      // Fallback: click directly on center open cover region
      if (
        Math.abs(T - s) < 0.3 &&
        Math.abs(e.clientX - W / 2) < 0.55 * d &&
        Math.abs(e.clientY - shelfCy) < 0.55 * H
      ) {
        openDetail(openRingBtn);
      }
      return;
    }

    if (Math.abs(vol.lastR) < 0.5) {
      openDetail(openRingBtn);
    } else if (isLoopMode) {
      T = Math.round(s + vol.lastR);
      wheelRawT = T;
      commitActiveIndex(wrapIndex(Math.round(T)), true, true);
    } else {
      T = vol.slot;
      wheelRawT = T;
      commitActiveIndex(vol.slot, true, true);
    }
  });

  window.addEventListener(
    'wheel',
    function (e) {
      if (openSheet) return;
      var delta = Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!delta) return;
      e.preventDefault();

      if (!wheelActive) {
        wheelActive = true;
        wheelRawT = T;
      }

      var stepX = Math.max(40, ws + gap);
      wheelRawT += (delta / stepX) * 0.5;
      T = applyRubberBand(wheelRawT);

      var nearest = isLoopMode
        ? wrapIndex(Math.round(T))
        : clamp(Math.round(T), 0, N - 1);
      if (nearest !== activeIdx) {
        commitActiveIndex(nearest, true, true);
      }

      if (wheelSettleTimer) window.clearTimeout(wheelSettleTimer);
      wheelSettleTimer = window.setTimeout(function () {
        wheelActive = false;
        wheelSettleTimer = null;
        var snapped = isLoopMode
          ? Math.round(T)
          : clamp(Math.round(T), 0, N - 1);
        T = snapped;
        wheelRawT = T;
        commitActiveIndex(isLoopMode ? wrapIndex(snapped) : snapped, true, true);
      }, 160);
    },
    { passive: false }
  );

  // Navigation & Sheet Trigger Controls
  arrowPrev.addEventListener('click', function () {
    stepBy(-1);
  });

  arrowNext.addEventListener('click', function () {
    stepBy(1);
  });

  openRingBtn.addEventListener('click', function () {
    openDetail(openRingBtn);
  });

  detailClose.addEventListener('click', function () {
    closeDetail();
  });

  detailSheet.addEventListener(
    'scroll',
    function () {
      checkVisibleDossierSections();
    },
    { passive: true }
  );

  detailScrollCue.addEventListener('click', function () {
    if (!dossierChallengeSec) return;
    dossierChallengeSec.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'start'
    });
  });

  for (var lbIdx = 0; lbIdx < langButtons.length; lbIdx++) {
    langButtons[lbIdx].addEventListener('click', function (e) {
      setDossierLang(e.currentTarget.dataset.lang);
    });
  }

  lightboxClose.addEventListener('click', function () {
    closeLightbox();
  });

  lightboxPrev.addEventListener('click', function () {
    stepLightbox(-1);
  });

  lightboxNext.addEventListener('click', function () {
    stepLightbox(1);
  });

  btnAbout.addEventListener('click', function () {
    openAbout(btnAbout);
  });

  aboutClose.addEventListener('click', function () {
    closeAbout();
  });

  // Keyboard Navigation & Dialog Focus Trap
  document.addEventListener('keydown', function (e) {
    if (lightboxOpen) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepLightbox(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepLightbox(1);
      } else {
        trapFocus(e, lightboxEl);
      }
      return;
    }

    if (openSheet === 'detail') {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeDetail();
      } else {
        trapFocus(e, detailSheet);
      }
      return;
    }

    if (openSheet === 'about') {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeAbout();
      } else {
        trapFocus(e, aboutSheet);
      }
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      stepBy(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      stepBy(1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      navigateToIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      navigateToIndex(N - 1);
    } else if (e.key === 'Enter') {
      var tag = document.activeElement
        ? document.activeElement.tagName.toLowerCase()
        : '';
      if (tag !== 'button' && tag !== 'a') {
        e.preventDefault();
        openDetail(openRingBtn);
      }
    }
  });

  var resizeScheduled = false;
  window.addEventListener('resize', function () {
    if (resizeScheduled) return;
    resizeScheduled = true;
    window.requestAnimationFrame(function () {
      resizeScheduled = false;
      measure();
    });
  });

  /* ------------------------------------------------------------------------
     Bootstrap
     ------------------------------------------------------------------------ */
  preloadCoverAssets();
  initTabs();
  buildVolumes();
  populateAboutSheet();
  measure();
  updateCaption(activeIdx, 1, false);
  syncTabIndicator(activeIdx, false);
  renderVolumes(0, false);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      measure();
    });
  }

  window.requestAnimationFrame(tick);
})();
