#!/usr/bin/env node
/**
 * Automated Static, Contract, Accessibility, SEO, Performance & Live Browser E2E Audit
 * for Bruno Vinícius's 3D Editorial Monograph Portfolio.
 *
 * Zero external dependencies — runs on Node 22+ with native WebSocket + headless Chromium CDP.
 *
 * Usage:
 *   node tests/verify.mjs
 *   node tests/verify.mjs --screenshots=/path/to/dir
 */

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORTFOLIO_DIR = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const screenshotsArg = args.find((a) => a.startsWith('--screenshots='));
const SCREENSHOT_DIR = screenshotsArg ? screenshotsArg.slice('--screenshots='.length) : null;

const EXPECTED_URLS = {
  githubProfile: 'https://github.com/BrunoCHRBN',
  linkedin: 'https://www.linkedin.com/in/bruno-vin%C3%ADcius-da-silva-santos/',
  email: 'brusantos777@gmail.com',
  cutsyncLive: 'https://cut-sync.vercel.app',
  cutsyncGithub: 'https://github.com/BrunoCHRBN/CutSync',
  zorinGithub: 'https://github.com/BrunoCHRBN/zorin-copilot',
  cadernoGithub: 'https://github.com/BrunoCHRBN/caderno-digital',
};

const BANNED_TECH_CODE_PATTERNS = [
  { name: 'hex literal (0x...)', re: /\b0x[0-9a-fA-F]+\b/g },
  { name: 'SPEC- code', re: /\bSPEC[-_\s]*\d+/gi },
  { name: 'VOL. code', re: /\bVOL\.?\s*\d+/gi },
  { name: 'semver (v1.x)', re: /\bv\d+\.\d+(?:\.\d+)?\b/gi },
  { name: 'SKU code', re: /\bSKU\b/gi },
  { name: 'ID # code', re: /\bID\s*#/gi },
  { name: 'raw hex color in visible text', re: /#[0-9a-fA-F]{6}\b/g },
];

const results = [];
let failedCount = 0;

async function test(section, name, fn) {
  const start = performance.now();
  try {
    const detail = await fn();
    const ms = Math.round(performance.now() - start);
    results.push({ section, name, status: 'PASS', ms, detail: detail || '' });
    console.log(`  [PASS] [${section}] ${name}${detail ? ` — ${detail}` : ''} (${ms}ms)`);
  } catch (err) {
    const ms = Math.round(performance.now() - start);
    failedCount += 1;
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ section, name, status: 'FAIL', ms, error: msg });
    console.error(`  [FAIL] [${section}] ${name} (${ms}ms)\n         ${msg.replace(/\n/g, '\n         ')}`);
  }
}

function stripCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function stripJsComments(js) {
  // Remove block comments and line comments outside of strings (best-effort safe tokenizer)
  let out = '';
  let i = 0;
  const n = js.length;
  while (i < n) {
    const ch = js[i];
    const next = js[i + 1];
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      out += ch;
      i += 1;
      while (i < n) {
        if (js[i] === '\\' && i + 1 < n) {
          out += js[i] + js[i + 1];
          i += 2;
          continue;
        }
        out += js[i];
        if (js[i] === quote) {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < n && !(js[i] === '*' && js[i + 1] === '/')) i += 1;
      i += 2;
      out += ' ';
      continue;
    }
    if (ch === '/' && next === '/') {
      i += 2;
      while (i < n && js[i] !== '\n') i += 1;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

function findBannedTechCodes(text, contextLabel) {
  const hits = [];
  for (const { name, re } of BANNED_TECH_CODE_PATTERNS) {
    re.lastIndex = 0;
    const matches = text.match(re);
    if (matches) {
      hits.push(`${contextLabel}: ${name} -> ${JSON.stringify(matches)}`);
    }
  }
  return hits;
}

function extractSvgTextNodes(svgMarkup) {
  const texts = [];
  const re = /<text\b[^>]*>([\s\S]*?)<\/text>/gi;
  let m;
  while ((m = re.exec(svgMarkup)) !== null) {
    const inner = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (inner) texts.push(inner);
  }
  return texts;
}

function extractVisibleHtmlText(html) {
  let body = html;
  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) body = bodyMatch[1];
  body = body
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return body;
}

function extractSvgIds(svg) {
  const ids = [];
  const re = /\bid\s*=\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(svg)) !== null) {
    ids.push(m[1]);
  }
  return ids;
}

function extractSvgInternalRefs(svg) {
  const refs = [];
  const urlRe = /url\(\s*#([^)\s"']+)\s*\)/g;
  let m;
  while ((m = urlRe.exec(svg)) !== null) refs.push(m[1]);
  const hrefRe = /\b(?:xlink:)?href\s*=\s*["']#([^"']+)["']/g;
  while ((m = hrefRe.exec(svg)) !== null) refs.push(m[1]);
  return refs;
}

// ============================================================================
// PART 1: STATIC & CONTRACT AUDIT
// ============================================================================

async function runStaticAudit() {
  console.log('\n=== PART 1: STATIC, CONTRACT, SEO & CODE HYGIENE AUDIT ===');

  const artworkPath = path.join(PORTFOLIO_DIR, 'src/artwork.js');
  const dossierPath = path.join(PORTFOLIO_DIR, 'src/dossier.js');
  const enginePath = path.join(PORTFOLIO_DIR, 'src/engine.js');
  const stylesPath = path.join(PORTFOLIO_DIR, 'src/styles.css');
  const indexPath = path.join(PORTFOLIO_DIR, 'index.html');
  const readmePath = path.join(PORTFOLIO_DIR, 'README.md');

  let artworkSrc = '';
  let dossierSrc = '';
  let engineSrc = '';
  let stylesSrc = '';
  let indexSrc = '';
  let catalog = null;
  let dossiers = null;

  await test('Static', 'Required portfolio files exist and are non-empty', async () => {
    for (const file of [artworkPath, dossierPath, enginePath, stylesPath, indexPath, readmePath]) {
      const stat = await fs.stat(file);
      assert.ok(stat.size > 0, `Expected non-empty file: ${file}`);
    }
    [artworkSrc, dossierSrc, engineSrc, stylesSrc, indexSrc] = await Promise.all([
      fs.readFile(artworkPath, 'utf8'),
      fs.readFile(dossierPath, 'utf8'),
      fs.readFile(enginePath, 'utf8'),
      fs.readFile(stylesPath, 'utf8'),
      fs.readFile(indexPath, 'utf8'),
    ]);
    return 'index.html, src/artwork.js, src/dossier.js, src/styles.css, src/engine.js, README.md';
  });

  await test('Static', 'JS syntax check (node --check) passes for artwork.js, dossier.js and engine.js', async () => {
    await execFileAsync(process.execPath, ['--check', artworkPath]);
    await execFileAsync(process.execPath, ['--check', dossierPath]);
    await execFileAsync(process.execPath, ['--check', enginePath]);
    return '0 syntax errors';
  });

  await test('Contract', 'artwork.js and dossier.js export cleanly in both Node and browser window', async () => {
    const require = createRequire(import.meta.url);
    delete require.cache[artworkPath];
    delete require.cache[dossierPath];
    catalog = require(artworkPath);
    dossiers = require(dossierPath);
    assert.ok(catalog && typeof catalog === 'object', 'artwork.js module.exports must return catalog object');
    assert.ok(dossiers && typeof dossiers === 'object', 'dossier.js module.exports must return dossiers object');

    // Also validate browser IIFE attachment on window without ES module syntax
    assert.ok(!/\bexport\s+(default|const|let|var|function)\b/.test(stripJsComments(artworkSrc)),
      'artwork.js must not use ES module export statements so it works on file://');
    assert.ok(!/\bexport\s+(default|const|let|var|function)\b/.test(stripJsComments(dossierSrc)),
      'dossier.js must not use ES module export statements so it works on file://');
    const sandbox = { window: {} };
    vm.runInNewContext(artworkSrc, sandbox, { filename: 'artwork.js' });
    vm.runInNewContext(dossierSrc, sandbox, { filename: 'dossier.js' });
    assert.ok(sandbox.window.PORTFOLIO_CATALOG, 'window.PORTFOLIO_CATALOG must be attached in browser context');
    assert.ok(sandbox.window.PORTFOLIO_DOSSIERS, 'window.PORTFOLIO_DOSSIERS must be attached in browser context');
    assert.equal(sandbox.window.PORTFOLIO_CATALOG.projects.length, 4);
    assert.equal(Object.keys(sandbox.window.PORTFOLIO_DOSSIERS.byId || {}).length, 4);
    return 'Node CJS + window.PORTFOLIO_CATALOG + window.PORTFOLIO_DOSSIERS OK';
  });

  await test('Contract', 'Author metadata & contact URLs match confirmed values exactly', async () => {
    assert.ok(catalog, 'catalog not loaded');
    const { author } = catalog;
    assert.equal(author.name, 'Bruno Vinícius');
    assert.equal(author.fullName, 'Bruno Vinícius da Silva Santos');
    assert.equal(author.location, 'Araraquara, São Paulo — Brasil');
    assert.equal(author.github, EXPECTED_URLS.githubProfile);
    assert.equal(author.linkedin, EXPECTED_URLS.linkedin);
    assert.equal(author.email, EXPECTED_URLS.email);
    assert.ok(typeof author.bioPt === 'string' && author.bioPt.trim().length > 40, 'bioPt missing/too short');
    assert.ok(typeof author.bioEn === 'string' && author.bioEn.trim().length > 40, 'bioEn missing/too short');
    return `${author.fullName} · ${author.email}`;
  });

  await test('Contract', 'Categories (5) and defaultIndex (1 = Caderno Digital) match spec', async () => {
    assert.equal(catalog.defaultIndex, 1);
    assert.equal(catalog.categories.length, 5);
    const expectedCats = [
      { id: 'all', label: 'TODOS / ALL', targetIndex: 0 },
      { id: 'system', label: 'SISTEMA / SYSTEM', targetIndex: 0 },
      { id: 'ink', label: 'TINTA / INK', targetIndex: 1 },
      { id: 'retail', label: 'VITRINE / RETAIL', targetIndex: 2 },
      { id: 'mobile', label: 'AGENDA / MOBILE', targetIndex: 3 },
    ];
    assert.deepEqual(catalog.categories, expectedCats);
    return '5 categories verified';
  });

  await test('Contract', 'All 4 real projects match exact order, IDs, categories, seals and URLs', async () => {
    assert.equal(catalog.projects.length, 4);
    const expected = [
      {
        id: 'zorin-copilot',
        categoryId: 'system',
        title: 'Zorin Copilot',
        spineSeal: 'SISTEMA',
        coverUrl: './assets/covers/zorin-copilot.webp',
        githubUrl: EXPECTED_URLS.zorinGithub,
        liveUrl: null,
        comingSoon: false,
      },
      {
        id: 'caderno-digital',
        categoryId: 'ink',
        title: 'Caderno Digital',
        spineSeal: 'TINTA',
        coverUrl: './assets/covers/caderno-digital.webp',
        githubUrl: EXPECTED_URLS.cadernoGithub,
        liveUrl: null,
        comingSoon: false,
      },
      {
        id: 'projcatalogos',
        categoryId: 'retail',
        title: 'ProjCatálogos',
        spineSeal: 'PRÉVIA',
        coverUrl: './assets/covers/projcatalogos.webp',
        githubUrl: null,
        liveUrl: null,
        comingSoon: true,
      },
      {
        id: 'cutsync',
        categoryId: 'mobile',
        title: 'CutSync',
        spineSeal: 'MÓVEL',
        coverUrl: './assets/covers/cutsync.webp',
        githubUrl: EXPECTED_URLS.cutsyncGithub,
        liveUrl: EXPECTED_URLS.cutsyncLive,
        comingSoon: false,
      },
    ];

    assert.deepEqual(catalog.coverViewBox, { width: 504, height: 900 },
      `Expected catalog.coverViewBox = { width: 504, height: 900 }, got ${JSON.stringify(catalog.coverViewBox)}`);

    for (let i = 0; i < expected.length; i += 1) {
      const p = catalog.projects[i];
      const e = expected[i];
      for (const [k, v] of Object.entries(e)) {
        assert.equal(p[k], v, `Project[${i}] (${p.id}) field "${k}" mismatch: got ${JSON.stringify(p[k])}, expected ${JSON.stringify(v)}`);
      }
      for (const reqField of ['subtitle', 'yearStatus', 'meta', 'synopsisPt', 'synopsisEn']) {
        assert.ok(typeof p[reqField] === 'string' && p[reqField].trim().length > 5,
          `Project "${p.id}" missing "${reqField}"`);
      }
      // Verify WebP cover file exists on disk and is non-empty
      const coverFile = path.resolve(PORTFOLIO_DIR, p.coverUrl);
      const st = await fs.stat(coverFile);
      assert.ok(st.size > 10000, `Cover asset ${coverFile} too small or empty (${st.size} bytes)`);
    }
    return `${catalog.projects.map((p) => p.id).join(', ')} (4 WebP covers on disk + 504x900 viewBox)`;
  });

  await test('Artwork SVG', 'ZERO duplicate SVG <defs> IDs across all covers, spines and poster art + valid internal refs & Mode B WebP links', async () => {
    assert.equal(typeof catalog.buildCoverInnerSVG, 'function');
    assert.equal(typeof catalog.buildCoverSVG, 'function');
    assert.equal(typeof catalog.buildSpineSVG, 'function');

    const allIds = new Map();
    const duplicates = [];
    const danglingRefs = [];
    const prefixViolations = [];
    const xssViolations = [];

    for (const p of catalog.projects) {
      const coverInner = catalog.buildCoverInnerSVG(p, 'poster');
      const coverFull = catalog.buildCoverSVG(p, 'cv');
      const spineFull = catalog.buildSpineSVG(p, 'sp');

      assert.ok(coverInner.length > 200, `Empty coverInner for ${p.id}`);
      assert.ok(!/<svg\b/i.test(coverInner), `buildCoverInnerSVG(${p.id}) MUST NOT contain outer <svg> tag`);
      assert.ok(/<svg\b[^>]*viewBox="0 0 504 900"/i.test(coverFull), `buildCoverSVG(${p.id}) missing viewBox="0 0 504 900"`);
      assert.ok(/<svg\b[^>]*viewBox="0 0 210 900"/i.test(spineFull), `buildSpineSVG(${p.id}) missing viewBox="0 0 210 900"`);

      // Verify Mode B pure SVG2 <image href="./assets/covers/<id>.webp"> (no xlink:href namespace issues)
      const expectedHref = `href="${p.coverUrl}"`;
      assert.ok(coverInner.includes(expectedHref), `buildCoverInnerSVG(${p.id}) missing SVG2 ${expectedHref}`);
      assert.ok(!/xlink:href/i.test(coverInner), `buildCoverInnerSVG(${p.id}) should use pure SVG2 href (no xlink:href)`);
      assert.ok(spineFull.includes(expectedHref), `buildSpineSVG(${p.id}) missing spine thumbnail ${expectedHref}`);
      assert.ok(!/xlink:href/i.test(spineFull), `buildSpineSVG(${p.id}) should use pure SVG2 href (no xlink:href)`);
      assert.ok(/<clipPath\b/i.test(spineFull), `buildSpineSVG(${p.id}) missing <clipPath> for thumbnail window`);
      assert.ok(/#1F3FB0/i.test(spineFull), `buildSpineSVG(${p.id}) missing cobalt horizontal stripe #1F3FB0`);

      const variants = [
        { label: `poster:${p.id}`, prefix: `poster-${p.id}-`, svg: coverInner },
        { label: `cv:${p.id}`, prefix: `cv-${p.id}-`, svg: coverFull },
        { label: `sp:${p.id}`, prefix: `sp-${p.id}-`, svg: spineFull },
      ];

      for (const v of variants) {
        if (/<script\b|\bon[a-z]+\s*=/i.test(v.svg)) {
          xssViolations.push(v.label);
        }
        const ids = extractSvgIds(v.svg);
        const idSet = new Set(ids);
        for (const id of ids) {
          if (!id.startsWith(v.prefix)) {
            prefixViolations.push(`${v.label}: id="${id}" does not start with "${v.prefix}"`);
          }
          if (allIds.has(id)) {
            duplicates.push(`"${id}" in both ${allIds.get(id)} and ${v.label}`);
          } else {
            allIds.set(id, v.label);
          }
        }
        const refs = extractSvgInternalRefs(v.svg);
        for (const ref of refs) {
          if (!idSet.has(ref)) {
            danglingRefs.push(`${v.label}: references "#${ref}" which is not defined in that SVG`);
          }
        }
      }
    }

    assert.equal(xssViolations.length, 0, `Unsafe script/handler inside SVG: ${xssViolations.join(', ')}`);
    assert.equal(duplicates.length, 0, `Duplicate SVG IDs detected:\n${duplicates.join('\n')}`);
    assert.equal(prefixViolations.length, 0, `Unprefixed SVG IDs:\n${prefixViolations.join('\n')}`);
    assert.equal(danglingRefs.length, 0, `Dangling SVG #id refs:\n${danglingRefs.join('\n')}`);
    return `${allIds.size} unique SVG IDs across 12 renders, 0 collisions, 0 dangling refs`;
  });

  await test('Motion Policy', 'ZERO @keyframes and ZERO opacity-fade transitions/animations in styles.css & engine.js', async () => {
    const cleanCss = stripCssComments(stylesSrc);
    const cleanJs = stripJsComments(engineSrc);

    // 1. Zero @keyframes in CSS
    assert.ok(!/@(?:-webkit-|-moz-)?keyframes\b/i.test(cleanCss), 'Found forbidden @keyframes in src/styles.css');

    // 2. Zero opacity in CSS transitions or animations
    const transRe = /\b(?:transition(?:-property)?|animation(?:-name)?)\s*:\s*([^;\}]+)/gi;
    const forbiddenTransitions = [];
    let m;
    while ((m = transRe.exec(cleanCss)) !== null) {
      const val = m[1].trim();
      if (/\bopacity\b/i.test(val)) {
        forbiddenTransitions.push(`transition/animation includes opacity: "${val}"`);
      }
      if (/\ball\b/i.test(val)) {
        forbiddenTransitions.push(`transition uses "all" (could fade opacity): "${val}"`);
      }
    }

    // 3. Inspect every opacity: declaration in CSS (only static grain opacity & --shade allowed)
    const ruleRe = /([^{}]+)\{([^{}]+)\}/g;
    const suspiciousOpacityRules = [];
    while ((m = ruleRe.exec(cleanCss)) !== null) {
      const selector = m[1].trim();
      const body = m[2];
      const opMatches = [...body.matchAll(/\bopacity\s*:\s*([^;\}]+)/gi)];
      for (const om of opMatches) {
        const val = om[1].trim();
        const isShade = /var\(\s*--shade\b/.test(val);
        const isGrain = /(?:grain|paper-grain|noise)/i.test(selector) && /^(?:0?\.55|0?\.5|0?\.6)$/.test(val);
        if (!isShade && !isGrain) {
          suspiciousOpacityRules.push(`${selector} { opacity: ${val} }`);
        }
      }
    }

    // 4. Inspect engine.js for any opacity fade animation or style.opacity write
    const jsOpacityIssues = [];
    if (/\.style\.opacity\b/.test(cleanJs)) {
      jsOpacityIssues.push('engine.js writes .style.opacity directly');
    }
    const animateCalls = [...cleanJs.matchAll(/\.animate\s*\(([\s\S]*?)\)\s*;/g)];
    for (const ac of animateCalls) {
      if (/\bopacity\s*:/.test(ac[1])) {
        jsOpacityIssues.push('engine.js WAAPI .animate() keyframe includes opacity');
      }
    }
    // Also catch multiline .animate( ... ) without trailing semicolon
    if (/\.animate\s*\([\s\S]{0,400}\bopacity\s*:/.test(cleanJs)) {
      if (!jsOpacityIssues.some((x) => x.includes('WAAPI'))) {
        jsOpacityIssues.push('engine.js WAAPI .animate() includes opacity');
      }
    }

    const allIssues = [...forbiddenTransitions, ...suspiciousOpacityRules, ...jsOpacityIssues];
    assert.equal(allIssues.length, 0, `Opacity fade / @keyframes violation(s):\n- ${allIssues.join('\n- ')}`);
    return '0 @keyframes, 0 opacity fades (only grain + 3D --shade allowed)';
  });

  await test('Editorial Copy', 'ZERO technical codes (0x, SPEC-, VOL., v1., SKU, ID #) in visible UI & SVG labels', async () => {
    const violations = [];
    const htmlVisible = extractVisibleHtmlText(indexSrc);
    violations.push(...findBannedTechCodes(htmlVisible, 'index.html visible text'));

    for (const [k, v] of Object.entries(catalog.author)) {
      if (typeof v === 'string' && !/^https?:\/\//.test(v)) {
        violations.push(...findBannedTechCodes(v, `author.${k}`));
      }
    }
    for (const c of catalog.categories) {
      violations.push(...findBannedTechCodes(c.label, `category.${c.id}`));
    }
    for (const p of catalog.projects) {
      for (const f of ['title', 'subtitle', 'yearStatus', 'meta', 'spineSeal', 'synopsisPt', 'synopsisEn']) {
        violations.push(...findBannedTechCodes(p[f] || '', `project.${p.id}.${f}`));
      }
      const coverTexts = extractSvgTextNodes(catalog.buildCoverSVG(p, 'cv'));
      const spineTexts = extractSvgTextNodes(catalog.buildSpineSVG(p, 'sp'));
      for (const t of coverTexts) {
        violations.push(...findBannedTechCodes(t, `coverSVG(${p.id}) <text>`));
      }
      for (const t of spineTexts) {
        violations.push(...findBannedTechCodes(t, `spineSVG(${p.id}) <text>`));
      }
    }

    // Also audit all dossier PT/EN texts, 4 architecture SVGs, and 12 wireframe SVGs
    if (dossiers && dossiers.ui && dossiers.byId) {
      const scanObj = (obj, label) => {
        for (const [k, v] of Object.entries(obj || {})) {
          if (typeof v === 'string' && !/^(\.\/|https?:\/\/)/.test(v)) {
            violations.push(...findBannedTechCodes(v, `${label}.${k}`));
          } else if (v && typeof v === 'object' && !Array.isArray(v)) {
            scanObj(v, `${label}.${k}`);
          }
        }
      };
      scanObj(dossiers.ui, 'dossier.ui');
      for (const p of catalog.projects) {
        const d = dossiers.byId[p.id];
        if (!d) continue;
        scanObj(d.challenge, `dossier.${p.id}.challenge`);
        scanObj(d.approach, `dossier.${p.id}.approach`);
        for (let hi = 0; hi < (d.highlights || []).length; hi += 1) {
          scanObj(d.highlights[hi], `dossier.${p.id}.highlights[${hi}]`);
        }
        if (d.architecture) {
          violations.push(...findBannedTechCodes(d.architecture.summaryPt || '', `dossier.${p.id}.arch.summaryPt`));
          violations.push(...findBannedTechCodes(d.architecture.summaryEn || '', `dossier.${p.id}.arch.summaryEn`));
          for (const t of extractSvgTextNodes(d.architecture.buildDiagramSVG('arch'))) {
            violations.push(...findBannedTechCodes(t, `archSVG(${p.id}) <text>`));
          }
        }
        for (let gi = 0; gi < (d.gallery || []).length; gi += 1) {
          const item = d.gallery[gi];
          scanObj({
            eyebrowPt: item.eyebrowPt,
            eyebrowEn: item.eyebrowEn,
            titlePt: item.titlePt,
            titleEn: item.titleEn,
            captionPt: item.captionPt,
            captionEn: item.captionEn,
          }, `dossier.${p.id}.gallery[${gi}]`);
          for (const t of extractSvgTextNodes(item.buildWireframeSVG(`gal-${gi}`))) {
            violations.push(...findBannedTechCodes(t, `wireframeSVG(${p.id}[${gi}]) <text>`));
          }
        }
      }
    }

    assert.equal(violations.length, 0, `Technical code(s) found in visible UI/SVG:\n- ${violations.join('\n- ')}`);
    return '0 banned technical codes across HTML, catalog, dossier & 24 SVGs';
  });

  await test('Dossier Contract & SVG', 'PORTFOLIO_DOSSIERS schema, 4 arch diagrams (960x360) + 12 wireframes (960x600), unique prefixed <defs> IDs & pure SVG2', async () => {
    assert.ok(dossiers && dossiers.ui && dossiers.byId, 'Missing dossiers.ui or dossiers.byId');
    for (const key of ['challenge', 'highlights', 'architecture', 'gallery']) {
      assert.ok(dossiers.ui.sections?.[key]?.pt && dossiers.ui.sections?.[key]?.en, `Missing dossiers.ui.sections.${key}`);
    }
    for (const key of ['challengeCol', 'approachCol', 'wireframeTag', 'photoTag', 'expandHint', 'closeLightbox']) {
      assert.ok(dossiers.ui.labels?.[key]?.pt && dossiers.ui.labels?.[key]?.en, `Missing dossiers.ui.labels.${key}`);
    }
    assert.ok(dossiers.ui.scrollCue?.pt && dossiers.ui.scrollCue?.en, 'Missing dossiers.ui.scrollCue');

    const allIds = new Map();
    const duplicates = [];
    const danglingRefs = [];
    const prefixViolations = [];
    const xssViolations = [];
    const xlinkViolations = [];
    let totalLivePhotos = 0;
    let totalWireframes = 0;

    for (const p of catalog.projects) {
      const d = dossiers.byId[p.id];
      assert.ok(d, `Missing dossier entry for "${p.id}"`);
      assert.ok(d.challenge?.pt?.length > 30 && d.challenge?.en?.length > 30, `${p.id} challenge pt/en missing`);
      assert.ok(d.approach?.pt?.length > 30 && d.approach?.en?.length > 30, `${p.id} approach pt/en missing`);
      assert.ok(Array.isArray(d.highlights) && d.highlights.length >= 3 && d.highlights.length <= 4,
        `${p.id} expected 3-4 highlights, got ${d.highlights?.length}`);
      for (const h of d.highlights) {
        for (const f of ['kickerPt', 'kickerEn', 'titlePt', 'titleEn', 'bodyPt', 'bodyEn']) {
          assert.ok(typeof h[f] === 'string' && h[f].trim().length > 2, `${p.id} highlight missing ${f}`);
        }
      }
      assert.ok(d.architecture?.summaryPt?.length > 20 && d.architecture?.summaryEn?.length > 20, `${p.id} arch summary missing`);
      assert.equal(typeof d.architecture?.buildDiagramSVG, 'function', `${p.id} missing buildDiagramSVG`);

      assert.ok(Array.isArray(d.gallery) && d.gallery.length === 3, `${p.id} expected 3 gallery plates, got ${d.gallery?.length}`);
      assert.equal(d.gallery[0].featured, true, `${p.id} gallery[0] must have featured: true`);
      assert.equal(d.gallery[1].featured, false, `${p.id} gallery[1] must have featured: false`);
      assert.equal(d.gallery[2].featured, false, `${p.id} gallery[2] must have featured: false`);

      const archSvg = d.architecture.buildDiagramSVG('arch');
      assert.ok(/<svg\b[^>]*viewBox="0 0 960 360"/i.test(archSvg), `${p.id} arch SVG missing viewBox="0 0 960 360"`);
      assert.ok(/role="img"/i.test(archSvg) && /aria-label="[^"]{5,}"/i.test(archSvg), `${p.id} arch SVG missing role="img" + aria-label`);

      const variants = [
        { label: `arch:${p.id}`, prefix: `arch-${p.id}-`, svg: archSvg },
      ];

      let livePhotoCount = 0;
      let wireframeCount = 0;

      for (let gi = 0; gi < d.gallery.length; gi += 1) {
        const g = d.gallery[gi];
        assert.ok(g.id && typeof g.id === 'string', `${p.id}.gallery[${gi}] missing id`);
        if (g.image === null) {
          wireframeCount += 1;
        } else {
          assert.ok(typeof g.image === 'string' && g.image.startsWith(`./assets/gallery/${p.id}/`),
            `${p.id}.gallery[${gi}] image must be null or ./assets/gallery/${p.id}/..., got ${JSON.stringify(g.image)}`);
          const imgDiskPath = path.resolve(PORTFOLIO_DIR, g.image);
          const imgStat = await fs.stat(imgDiskPath);
          assert.ok(imgStat.size > 5000, `Captured gallery image ${imgDiskPath} too small/empty (${imgStat.size} bytes)`);
          livePhotoCount += 1;
        }
        assert.ok(typeof g.suggestedPath === 'string' && g.suggestedPath.startsWith(`./assets/gallery/${p.id}/`),
          `${p.id}.gallery[${gi}] suggestedPath mismatch: ${g.suggestedPath}`);
        for (const f of ['eyebrowPt', 'eyebrowEn', 'titlePt', 'titleEn', 'captionPt', 'captionEn']) {
          assert.ok(typeof g[f] === 'string' && g[f].trim().length > 2, `${p.id}.gallery[${gi}] missing ${f}`);
        }
        assert.equal(typeof g.buildWireframeSVG, 'function', `${p.id}.gallery[${gi}] missing buildWireframeSVG`);

        const galSvg = g.buildWireframeSVG(`gal-${gi}`);
        const lbSvg = g.buildWireframeSVG(`lb-${gi}`);
        assert.ok(/<svg\b[^>]*viewBox="0 0 960 600"/i.test(galSvg), `${p.id}.gallery[${gi}] wireframe missing viewBox="0 0 960 600"`);
        variants.push({ label: `gal-${gi}:${p.id}`, prefix: `gal-${gi}-${p.id}-`, svg: galSvg });
        variants.push({ label: `lb-${gi}:${p.id}`, prefix: `lb-${gi}-${p.id}-`, svg: lbSvg });
      }
      totalLivePhotos += livePhotoCount;
      totalWireframes += wireframeCount;

      for (const v of variants) {
        if (/<script\b|\bon[a-z]+\s*=/i.test(v.svg)) xssViolations.push(v.label);
        if (/xlink:/i.test(v.svg)) xlinkViolations.push(v.label);
        const ids = extractSvgIds(v.svg);
        const idSet = new Set(ids);
        for (const id of ids) {
          if (!id.startsWith(v.prefix)) {
            prefixViolations.push(`${v.label}: id="${id}" does not start with "${v.prefix}"`);
          }
          if (allIds.has(id)) {
            duplicates.push(`"${id}" in both ${allIds.get(id)} and ${v.label}`);
          } else {
            allIds.set(id, v.label);
          }
        }
        for (const ref of extractSvgInternalRefs(v.svg)) {
          if (!idSet.has(ref)) {
            danglingRefs.push(`${v.label}: references "#${ref}" not defined in that SVG`);
          }
        }
      }
    }

    assert.equal(xssViolations.length, 0, `Unsafe script/handler inside dossier SVG: ${xssViolations.join(', ')}`);
    assert.equal(xlinkViolations.length, 0, `Forbidden xlink: prefix in dossier SVG: ${xlinkViolations.join(', ')}`);
    assert.equal(duplicates.length, 0, `Duplicate dossier SVG IDs:\n${duplicates.join('\n')}`);
    assert.equal(prefixViolations.length, 0, `Unprefixed dossier SVG IDs:\n${prefixViolations.join('\n')}`);
    assert.equal(danglingRefs.length, 0, `Dangling dossier SVG #id refs:\n${danglingRefs.join('\n')}`);
    return `4 projects, 4 arch SVGs + 12 plates (${totalLivePhotos} real captures on disk, ${totalWireframes} wireframes), ${allIds.size} unique prefixed SVG IDs, 0 collisions`;
  });

  await test('SEO & A11y', 'index.html SEO metadata, JSON-LD, landmarks, single <h1>, aria-live, dialogs, script order & reduced-motion', async () => {
    assert.ok(/<html\b[^>]*\blang\s*=\s*["']pt-BR["']/i.test(indexSrc), 'Missing <html lang="pt-BR">');
    assert.ok(/<title>[^<]{10,}<\/title>/i.test(indexSrc), 'Missing or too-short <title>');
    assert.ok(/<meta\b[^>]*name=["']description["'][^>]*content=["'][^"']{40,}["']/i.test(indexSrc)
      || /<meta\b[^>]*content=["'][^"']{40,}["'][^>]*name=["']description["']/i.test(indexSrc),
      'Missing <meta name="description">');

    // Open Graph
    for (const og of ['og:title', 'og:description', 'og:type']) {
      assert.ok(new RegExp(`<meta\\b[^>]*property=["']${og}["']`, 'i').test(indexSrc), `Missing Open Graph tag: ${og}`);
    }

    // JSON-LD valid JSON
    const jsonLdMatches = [...indexSrc.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    assert.ok(jsonLdMatches.length >= 1, 'Missing <script type="application/ld+json">');
    for (const jm of jsonLdMatches) {
      const parsed = JSON.parse(jm[1]);
      assert.ok(parsed['@context'], 'JSON-LD missing @context');
    }

    // Classic scripts order: artwork.js BEFORE dossier.js BEFORE engine.js, NO type="module"
    const artworkTag = indexSrc.match(/<script\b[^>]*src=["']\.?\/?src\/artwork\.js["'][^>]*>/i);
    const dossierTag = indexSrc.match(/<script\b[^>]*src=["']\.?\/?src\/dossier\.js["'][^>]*>/i);
    const engineTag = indexSrc.match(/<script\b[^>]*src=["']\.?\/?src\/engine\.js["'][^>]*>/i);
    assert.ok(artworkTag && dossierTag && engineTag, 'index.html must include src/artwork.js, src/dossier.js and src/engine.js');
    assert.ok(
      !/type=["']module["']/i.test(artworkTag[0])
      && !/type=["']module["']/i.test(dossierTag[0])
      && !/type=["']module["']/i.test(engineTag[0]),
      'Scripts must be classic (no type="module") for file:// compatibility',
    );
    assert.ok(artworkTag.index < dossierTag.index && dossierTag.index < engineTag.index,
      'Script order must be artwork.js -> dossier.js -> engine.js');

    // Dossier & Lightbox markup presence
    assert.ok(/id\s*=\s*["']detail-dossier["']/i.test(indexSrc), 'Missing #detail-dossier container in index.html');
    assert.ok(/id\s*=\s*["']gallery-lightbox["']/i.test(indexSrc), 'Missing #gallery-lightbox dialog in index.html');
    assert.ok(/role\s*=\s*["']group["']/i.test(indexSrc), 'Missing PT/EN role="group" switcher in index.html');

    // Landmarks & accessibility
    for (const tag of ['<header', '<nav', '<main', '<section', '<footer']) {
      assert.ok(indexSrc.toLowerCase().includes(tag), `Missing semantic landmark ${tag}>`);
    }

    const h1Count = (indexSrc.match(/<h1\b/gi) || []).length;
    assert.equal(h1Count, 1, `Expected exactly 1 <h1> in index.html, found ${h1Count}`);
    assert.ok(/aria-live\s*=\s*["']polite["']/i.test(indexSrc), 'Missing aria-live="polite"');
    assert.ok(/role\s*=\s*["']dialog["']/i.test(indexSrc), 'Missing role="dialog"');
    assert.ok(/aria-modal\s*=\s*["']true["']/i.test(indexSrc), 'Missing aria-modal="true"');

    // Ink mask filter check
    assert.ok(/id\s*=\s*["']ink-mask["']/i.test(indexSrc), 'Missing #ink-mask SVG mask in index.html');
    assert.ok(/feTurbulence/i.test(indexSrc) && /feDisplacementMap/i.test(indexSrc),
      'Missing feTurbulence + feDisplacementMap ink filter');

    // prefers-reduced-motion handled in CSS and/or JS
    const hasReducedCss = /prefers-reduced-motion\s*:\s*reduce/i.test(stylesSrc);
    const hasReducedJs = /prefers-reduced-motion\s*:\s*reduce/i.test(engineSrc);
    assert.ok(hasReducedCss || hasReducedJs, 'Missing prefers-reduced-motion: reduce handling');
    assert.ok(hasReducedJs, 'engine.js should check matchMedia("(prefers-reduced-motion: reduce)") for instant spring/ink');

    // target="_blank" security check
    const blankLinks = [...indexSrc.matchAll(/<a\b[^>]*target\s*=\s*["']_blank["'][^>]*>/gi)];
    for (const bl of blankLinks) {
      assert.ok(/\brel\s*=\s*["'][^"']*noopener[^"']*["']/i.test(bl[0]),
        `External link missing rel="noopener noreferrer": ${bl[0]}`);
    }

    // Security hygiene (no eval/Function/document.write and zero innerHTML sinks in engine.js)
    const cleanEngine = stripJsComments(engineSrc);
    assert.ok(!/\beval\s*\(|\bnew\s+Function\s*\(|document\.write\s*\(/.test(stripJsComments(engineSrc + artworkSrc + dossierSrc)),
      'Found unsafe eval/Function/document.write');
    assert.ok(!/\.innerHTML\b/.test(cleanEngine), 'engine.js must not use innerHTML sinks (use DOMParser + textContent)');

    // Mode B integration checks (504x900 poster viewBox, 904x1300 ink-mask, 504/900 aspect ratio, coverUrl preload)
    assert.ok(/viewBox\s*=\s*["']0 0 504 900["']/i.test(indexSrc), 'index.html detail poster SVG missing viewBox="0 0 504 900"');
    assert.ok(/id\s*=\s*["']ink-mask["'][\s\S]{0,160}width\s*=\s*["']904["']/i.test(indexSrc), 'index.html #ink-mask missing width="904"');
    assert.ok(/aspect-ratio\s*:\s*504\s*\/\s*900/i.test(stylesSrc), 'styles.css .detail-poster-frame missing aspect-ratio: 504 / 900');
    assert.ok(/new\s+(?:window\.)?Image\s*\(/.test(stripJsComments(engineSrc)) && /coverUrl/.test(stripJsComments(engineSrc)),
      'engine.js should preload project.coverUrl via new Image()');

    return `lang="pt-BR", 1 <h1>, ${jsonLdMatches.length} JSON-LD block(s), OG + landmarks + #ink-mask (504x900) + preload + reduced-motion OK`;
  });
}

// ============================================================================
// PART 2: LIVE HTTP SERVER + CHROMIUM CDP DRIVER
// ============================================================================

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function startStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const urlObj = new URL(req.url || '/', 'http://127.0.0.1');
        let relPath = decodeURIComponent(urlObj.pathname);
        if (relPath === '/' || relPath === '') relPath = '/index.html';
        const resolved = path.resolve(rootDir, `.${relPath}`);
        if (!resolved.startsWith(rootDir)) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }
        const data = await fs.readFile(resolved);
        const ext = path.extname(resolved).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        res.end(data);
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
      }
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${addr.port}`,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

class CDPPage {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();

    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString());
      if (msg.id) {
        const p = this.pending.get(msg.id);
        if (p) {
          this.pending.delete(msg.id);
          if (msg.error) p.reject(new Error(`CDP ${p.method} error: ${msg.error.message}`));
          else p.resolve(msg.result);
        }
      } else if (msg.method) {
        const handlers = this.listeners.get(msg.method);
        if (handlers) {
          for (const h of handlers) h(msg.params);
        }
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, handler) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(handler);
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (res.exceptionDetails) {
      const desc = res.exceptionDetails.exception?.description || res.exceptionDetails.text || 'JS exception';
      throw new Error(`Page eval error: ${desc}`);
    }
    return res.result?.value;
  }

  async navigate(url) {
    const loaded = new Promise((resolve) => {
      const handler = () => {
        const arr = this.listeners.get('Page.loadEventFired') || [];
        const idx = arr.indexOf(handler);
        if (idx >= 0) arr.splice(idx, 1);
        resolve();
      };
      this.on('Page.loadEventFired', handler);
    });
    await this.send('Page.navigate', { url });
    await Promise.race([
      loaded,
      new Promise((_, rej) => setTimeout(() => rej(new Error(`Timeout loading ${url}`)), 15000)),
    ]);
    await this.waitUntil('document.readyState === "complete" && !!window.PORTFOLIO_CATALOG', {
      label: 'page ready',
      timeoutMs: 5000,
    });
  }

  async setViewport({ width, height, mobile = false, deviceScaleFactor = 1 }) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor,
      mobile,
    });
    if (mobile) {
      await this.send('Emulation.setTouchEmulationEnabled', {
        enabled: true,
        maxTouchPoints: 5,
      });
    } else {
      await this.send('Emulation.setTouchEmulationEnabled', {
        enabled: false,
      });
    }
  }

  async clickPoint(x, y) {
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  }

  async pressKey(key) {
    const map = {
      Escape: { code: 'Escape', keyCode: 27 },
      Enter: { code: 'Enter', keyCode: 13, text: '\r' },
      ArrowLeft: { code: 'ArrowLeft', keyCode: 37 },
      ArrowRight: { code: 'ArrowRight', keyCode: 39 },
    };
    const info = map[key] || { code: key, keyCode: 0 };
    await this.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key,
      code: info.code,
      ...(info.text ? { text: info.text, unmodifiedText: info.text } : {}),
      windowsVirtualKeyCode: info.keyCode,
      nativeVirtualKeyCode: info.keyCode,
    });
    await this.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key,
      code: info.code,
      windowsVirtualKeyCode: info.keyCode,
      nativeVirtualKeyCode: info.keyCode,
    });
  }

  async waitUntil(expr, { timeoutMs = 6000, intervalMs = 60, label = 'condition' } = {}) {
    const deadline = Date.now() + timeoutMs;
    let lastVal;
    while (Date.now() < deadline) {
      lastVal = await this.eval(expr);
      if (lastVal) return lastVal;
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error(`Timed out waiting for ${label} after ${timeoutMs}ms (last value: ${JSON.stringify(lastVal)})`);
  }

  async screenshot(filePath) {
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' });
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, Buffer.from(data, 'base64'));
  }

  close() {
    try {
      this.ws.close();
    } catch {
      // ignore
    }
  }
}

async function launchChromium() {
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-qa-chrome-'));
  const chrome = spawn(
    'chromium',
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--mute-audio',
      '--blink-settings=primaryPointerType=4,availablePointerTypes=4',
      '--remote-debugging-port=0',
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );

  const wsBrowserUrl = await new Promise((resolve, reject) => {
    let stderrBuf = '';
    const timer = setTimeout(() => reject(new Error(`Chromium failed to start. stderr:\n${stderrBuf}`)), 15000);
    chrome.stderr.on('data', (chunk) => {
      stderrBuf += chunk.toString();
      const match = stderrBuf.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    chrome.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Chromium exited early with code ${code}. stderr:\n${stderrBuf}`));
    });
  });

  const debugOrigin = wsBrowserUrl.replace(/^ws:/, 'http:').replace(/\/devtools\/.*$/, '');
  const listRes = await fetch(`${debugOrigin}/json/list`);
  const targets = await listRes.json();
  const pageTarget = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
  if (!pageTarget) throw new Error('No page target found in Chromium');

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  const page = new CDPPage(ws);
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('Network.enable');
  await page.send('DOM.enable');

  const cleanup = async () => {
    page.close();
    chrome.kill('SIGKILL');
    await new Promise((r) => chrome.once('exit', r)).catch(() => {});
    await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  };

  return { page, cleanup };
}

// ============================================================================
// PART 3: LIVE BROWSER E2E & VISUAL AUDIT
// ============================================================================

async function runBrowserAudit() {
  console.log('\n=== PART 2: LIVE BROWSER E2E, VISUAL, RESPONSIVE & A11Y AUDIT ===');

  const srv = await startStaticServer(PORTFOLIO_DIR);
  const { page, cleanup } = await launchChromium();

  const consoleErrors = [];
  const pageExceptions = [];
  const http404s = [];
  const localFailures = [];
  const externalNetworkNotes = [];
  const webpResponses = new Map();
  const requestUrls = new Map();

  page.on('Network.requestWillBeSent', (p) => {
    requestUrls.set(p.requestId, p.request.url);
  });
  page.on('Network.responseReceived', (p) => {
    const url = p.response.url;
    const status = p.response.status;
    if (url.includes('/assets/covers/') && url.endsWith('.webp')) {
      const file = path.basename(new URL(url).pathname);
      webpResponses.set(file, { status, mimeType: p.response.mimeType });
    }
    if (status === 404) {
      http404s.push(`${status} ${url}`);
    } else if (status >= 400 && url.startsWith(srv.baseUrl)) {
      localFailures.push(`${status} ${url}`);
    }
  });
  page.on('Network.loadingFailed', (p) => {
    const url = requestUrls.get(p.requestId) || p.requestId;
    if (url.startsWith(srv.baseUrl)) {
      localFailures.push(`FAILED ${url}: ${p.errorText}`);
    } else if (!p.canceled) {
      externalNetworkNotes.push(`${url}: ${p.errorText}`);
    }
  });
  page.on('Runtime.exceptionThrown', (p) => {
    const desc = p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || 'Uncaught exception';
    pageExceptions.push(desc);
  });
  page.on('Runtime.consoleAPICalled', (p) => {
    if (p.type === 'error') {
      const msg = (p.args || []).map((a) => a.value ?? a.description ?? '').join(' ');
      consoleErrors.push(msg);
    }
  });

  try {
    // ------------------------------------------------------------------
    // 1. Desktop 1440x900 Initial Load
    // ------------------------------------------------------------------
    await page.setViewport({ width: 1440, height: 900, mobile: false, deviceScaleFactor: 1 });
    await page.navigate(srv.baseUrl);

    // Wait for shelf initial layout to settle (4 volumes rendered & caption populated)
    await page.waitUntil(`(() => {
      const vols = document.querySelectorAll('.volume, .tape, [data-project-id], [data-index]');
      const bodyText = document.body.innerText || '';
      return vols.length >= 4 && bodyText.includes('Caderno Digital');
    })()`, { label: 'initial shelf render' });

    await test('E2E Desktop', '1440x900 initial load: Caderno Digital centered & open, 4 unique volumes, TINTA / INK active', async () => {
      const state = await page.eval(`(() => {
        const volumes = [...document.querySelectorAll('.stage > *')];
        const covers = [...document.querySelectorAll('.cv')];
        const spines = [...document.querySelectorAll('.sp')];

        // Check unique DOM IDs across whole document
        const allIds = [...document.querySelectorAll('[id]')].map(el => el.id);
        const dupIds = allIds.filter((id, i) => allIds.indexOf(id) !== i);

        // Find h1 count
        const h1s = [...document.querySelectorAll('h1')];

        // Find active tab (button inside nav whose active class or aria-current/aria-pressed or white color matches)
        const navBtns = [...document.querySelectorAll('nav button')];
        const tabStates = navBtns.map(b => ({
          text: b.textContent.trim(),
          active: b.classList.contains('active') || b.classList.contains('on') || b.getAttribute('aria-current') === 'true' || b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-selected') === 'true',
          color: getComputedStyle(b).color,
          rect: b.getBoundingClientRect().toJSON(),
        }));

        // Check Caderno Digital cover is open & near horizontal center
        const vw = window.innerWidth;
        const coverRects = covers.map((cv, idx) => {
          const r = cv.getBoundingClientRect();
          const vol = cv.closest('.stage > *');
          return {
            idx,
            id: vol?.dataset?.id || vol?.dataset?.projectId || '',
            title: cv.textContent.trim().slice(0, 40),
            centerX: r.left + r.width / 2,
            width: r.width,
            height: r.height,
            transform: vol ? getComputedStyle(vol).transform : '',
          };
        });

        // Caption live region text
        const live = document.querySelector('[aria-live="polite"]');
        const captionText = live ? live.innerText.trim() : '';

        // Footer links
        const footerLinks = [...document.querySelectorAll('footer a')].map(a => ({
          text: a.textContent.trim(),
          href: a.href,
          rel: a.rel,
        }));

        return {
          volumeCount: volumes.length,
          coverCount: covers.length,
          spineCount: spines.length,
          dupIds,
          h1Count: h1s.length,
          tabStates,
          coverRects,
          vw,
          captionText,
          footerLinks,
        };
      })()`);

      assert.equal(state.volumeCount, 4, `Expected exactly 4 unique volumes on shelf, found ${state.volumeCount}`);
      assert.equal(state.coverCount, 4, `Expected 4 covers, found ${state.coverCount}`);
      assert.equal(state.spineCount, 4, `Expected 4 spines, found ${state.spineCount}`);
      assert.equal(state.dupIds.length, 0, `Duplicate DOM IDs on initial load: ${JSON.stringify(state.dupIds)}`);
      assert.equal(state.h1Count, 1, `Expected 1 <h1> in DOM, found ${state.h1Count}`);
      assert.ok(state.captionText.includes('Caderno Digital'), `Caption should show Caderno Digital, got: ${state.captionText}`);
      assert.ok(state.captionText.includes('ESCRITA MANUSCRITA'), `Caption missing PT/EN subtitle: ${state.captionText}`);

      // Verify Caderno Digital (index 1) is centered and has wide visible cover projection
      const cadernoCover = state.coverRects[1];
      assert.ok(Math.abs(cadernoCover.centerX - state.vw / 2) < 90,
        `Caderno Digital cover should be centered (~${state.vw / 2}px), got ${Math.round(cadernoCover.centerX)}px`);
      assert.ok(cadernoCover.width > 120,
        `Caderno Digital cover should be rotated open (width > 120px), got ${Math.round(cadernoCover.width)}px`);

      // Verify TINTA / INK tab is active and TODOS / ALL is NOT active
      const activeTabs = state.tabStates.filter((t) => t.active);
      assert.equal(activeTabs.length, 1, `Expected 1 active tab, got: ${JSON.stringify(state.tabStates)}`);
      assert.ok(activeTabs[0].text.includes('TINTA / INK'), `Expected TINTA / INK active, got: ${activeTabs[0].text}`);

      // Verify footer has GitHub, LinkedIn, Email
      const footerHrefs = state.footerLinks.map((l) => l.href);
      assert.ok(footerHrefs.some((h) => h.startsWith(EXPECTED_URLS.githubProfile)), `Footer missing GitHub link: ${JSON.stringify(footerHrefs)}`);
      assert.ok(footerHrefs.some((h) => h === EXPECTED_URLS.linkedin), `Footer missing LinkedIn link: ${JSON.stringify(footerHrefs)}`);
      assert.ok(footerHrefs.some((h) => h === `mailto:${EXPECTED_URLS.email}`), `Footer missing mailto link: ${JSON.stringify(footerHrefs)}`);

      // Check SVG <text> bounding boxes in root viewBox coordinates on all 4 covers (504x900) and 4 spines (210x900),
      // plus verify all 4 cover & 4 spine WebP <image> elements rendered with non-zero dimensions
      const svgAudit = await page.eval(`(() => {
        const textIssues = [];
        const imgIssues = [];
        function rootBBox(svg, el) {
          const b = el.getBBox();
          const ctm = svg.getCTM().inverse().multiply(el.getCTM());
          const pts = [
            new DOMPoint(b.x, b.y),
            new DOMPoint(b.x + b.width, b.y),
            new DOMPoint(b.x, b.y + b.height),
            new DOMPoint(b.x + b.width, b.y + b.height),
          ].map(p => p.matrixTransform(ctm));
          const xs = pts.map(p => p.x);
          const ys = pts.map(p => p.y);
          return {
            minX: Math.min(...xs),
            maxX: Math.max(...xs),
            minY: Math.min(...ys),
            maxY: Math.max(...ys),
          };
        }
        document.querySelectorAll('.cv svg').forEach((svg, idx) => {
          const imgs = [...svg.querySelectorAll('image')];
          if (imgs.length === 0) imgIssues.push({ face: 'cover#' + idx, error: 'missing <image>' });
          imgs.forEach((im) => {
            const href = im.getAttribute('href') || '';
            const bb = im.getBBox();
            if (!href.endsWith('.webp') || bb.width <= 0 || bb.height <= 0) {
              imgIssues.push({ face: 'cover#' + idx, href, bb });
            }
          });
          svg.querySelectorAll('text').forEach((t) => {
            const rb = rootBBox(svg, t);
            if (rb.minX < 16 || rb.maxX > 488 || rb.minY < 16 || rb.maxY > 884) {
              textIssues.push({ face: 'cover#' + idx, text: t.textContent.trim(), rb });
            }
          });
        });
        document.querySelectorAll('.sp svg').forEach((svg, idx) => {
          const imgs = [...svg.querySelectorAll('image')];
          if (imgs.length === 0) imgIssues.push({ face: 'spine#' + idx, error: 'missing <image> thumbnail' });
          imgs.forEach((im) => {
            const href = im.getAttribute('href') || '';
            const bb = im.getBBox();
            const r = im.getBoundingClientRect();
            if (!href.endsWith('.webp') || bb.width <= 0 || bb.height <= 0 || r.width <= 0 || r.height <= 0) {
              imgIssues.push({ face: 'spine#' + idx, href, bb, rect: { w: r.width, h: r.height } });
            }
          });
          svg.querySelectorAll('text').forEach((t) => {
            const rb = rootBBox(svg, t);
            if (rb.minX < 20 || rb.maxX > 190 || rb.minY < 24 || rb.maxY > 876) {
              textIssues.push({ face: 'spine#' + idx, text: t.textContent.trim(), rb });
            }
          });
        });
        return { textIssues, imgIssues };
      })()`);
      assert.equal(svgAudit.textIssues.length, 0, `SVG text overflows frame border:\n${JSON.stringify(svgAudit.textIssues, null, 2)}`);
      assert.equal(svgAudit.imgIssues.length, 0, `SVG <image> WebP rendering issues:\n${JSON.stringify(svgAudit.imgIssues, null, 2)}`);

      // Wait briefly until all 4 preloaded WebP cover responses arrive with HTTP 200
      const expectedWebps = ['zorin-copilot.webp', 'caderno-digital.webp', 'projcatalogos.webp', 'cutsync.webp'];
      const deadline = Date.now() + 3000;
      while (Date.now() < deadline && !expectedWebps.every((f) => webpResponses.has(f))) {
        await new Promise((r) => setTimeout(r, 50));
      }
      for (const f of expectedWebps) {
        const resp = webpResponses.get(f);
        assert.ok(resp && resp.status === 200, `Expected HTTP 200 for /assets/covers/${f}, got ${JSON.stringify(resp)}`);
      }

      // Verify custom editorial cursor states on desktop (pointer: fine):
      // 1) Over active cover -> .open (ABRIR / OPEN)
      // 2) Over inactive spine -> .spine
      // 3) Over header button -> .btn
      const cursorStates = await (async () => {
        const pts = await page.eval(`(() => {
          const cv = document.querySelectorAll('.cv')[1].getBoundingClientRect();
          const sp = document.querySelectorAll('.sp')[0].getBoundingClientRect();
          const btn = document.getElementById('btn-about').getBoundingClientRect();
          return {
            cover: { x: cv.left + cv.width / 2, y: cv.top + cv.height / 2 },
            spine: { x: sp.left + sp.width / 2, y: sp.top + sp.height / 2 },
            btn: { x: btn.left + btn.width / 2, y: btn.top + btn.height / 2 },
          };
        })()`);

        await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pts.cover.x, y: pts.cover.y });
        const onCover = await page.waitUntil(`document.getElementById('cursor')?.classList.contains('open')`, { timeoutMs: 1500, label: 'cursor .open on cover' });

        await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pts.spine.x, y: pts.spine.y });
        const onSpine = await page.waitUntil(`document.getElementById('cursor')?.classList.contains('spine')`, { timeoutMs: 1500, label: 'cursor .spine on inactive spine' });

        await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pts.btn.x, y: pts.btn.y });
        const onBtn = await page.waitUntil(`document.getElementById('cursor')?.classList.contains('btn')`, { timeoutMs: 1500, label: 'cursor .btn on header button' });

        return { onCover, onSpine, onBtn };
      })();
      assert.ok(cursorStates.onCover && cursorStates.onSpine && cursorStates.onBtn, 'Custom cursor states failed');

      if (SCREENSHOT_DIR) {
        // Move cursor away to neutral spot before clean initial screenshot
        await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 10, y: 10 });
        await page.screenshot(path.join(SCREENSHOT_DIR, '01-desktop-initial.png'));
      }
      return `4 volumes, Caderno Digital open at x=${Math.round(cadernoCover.centerX)}px (w=${Math.round(cadernoCover.width)}px), tab=TINTA / INK, cursor(.open/.spine/.btn) OK, 0 SVG text overflows`;
    });

    // ------------------------------------------------------------------
    // 2. Click CutSync spine -> glides, swaps caption, tab -> AGENDA / MOBILE, ?obra=cutsync
    // ------------------------------------------------------------------
    await test('E2E Desktop', 'Clicking CutSync spine glides shelf, updates caption, tab AGENDA / MOBILE, and ?obra=cutsync', async () => {
      const targetPt = await page.eval(`(() => {
        const spines = [...document.querySelectorAll('.sp')];
        // CutSync is index 3
        const sp = spines[3];
        const r = sp.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
      })()`);
      assert.ok(targetPt.w > 10 && targetPt.h > 50, `CutSync spine not clickable: ${JSON.stringify(targetPt)}`);
      await page.clickPoint(targetPt.x, targetPt.y);

      const settled = await page.waitUntil(`(() => {
        const url = new URL(location.href);
        const live = document.querySelector('[aria-live="polite"]');
        const cap = live ? live.innerText : '';
        const covers = [...document.querySelectorAll('.cv')];
        const r3 = covers[3]?.getBoundingClientRect();
        const centered = r3 && Math.abs((r3.left + r3.width / 2) - window.innerWidth / 2) < 40 && r3.width > 120;
        if (url.searchParams.get('obra') === 'cutsync' && cap.includes('CutSync') && centered) {
          const activeTabs = [...document.querySelectorAll('nav button')]
            .filter(b => b.classList.contains('active') || b.classList.contains('on') || b.getAttribute('aria-current') === 'true' || b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-selected') === 'true')
            .map(b => b.textContent.trim());
          return { obra: url.searchParams.get('obra'), cap: cap.trim(), activeTabs, coverWidth: Math.round(r3.width) };
        }
        return false;
      })()`, { timeoutMs: 5000, label: 'CutSync shelf glide & URL update' });

      assert.equal(settled.activeTabs.length, 1);
      assert.ok(settled.activeTabs[0].includes('AGENDA / MOBILE'), `Expected AGENDA / MOBILE active, got ${settled.activeTabs[0]}`);
      return `?obra=${settled.obra}, tab=${settled.activeTabs[0]}, coverWidth=${settled.coverWidth}px`;
    });

    // ------------------------------------------------------------------
    // 3. Click active CutSync cover -> Detail Sheet + Ink Mask r=720 + Links + Escape close
    // ------------------------------------------------------------------
    await test('E2E Desktop', 'Clicking active CutSync cover opens detail dialog, grows #ink-mask circles to r=720, verifies links & Escape close', async () => {
      const coverPt = await page.eval(`(() => {
        const cv = document.querySelectorAll('.cv')[3];
        const r = cv.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      })()`);
      await page.clickPoint(coverPt.x, coverPt.y);

      // Wait for dialog visible AND all 7 #ink-mask circles to reach r >= 715 (target 720)
      const detailState = await page.waitUntil(`(() => {
        const dialogs = [...document.querySelectorAll('[role="dialog"]')];
        const openDlg = dialogs.find(d => getComputedStyle(d).visibility === 'visible' && !d.hidden && getComputedStyle(d).display !== 'none');
        if (!openDlg) return false;
        const maskCircles = [...openDlg.querySelectorAll('#ink-mask circle')];
        const radii = maskCircles.map(c => parseFloat(c.getAttribute('r') || '0'));
        const allGrown = maskCircles.length === 7 && radii.every(r => r >= 715);
        if (!allGrown) return false;
        const maskedArt = openDlg.querySelector('[mask="url(#ink-mask)"]');
        const posterSvg = openDlg.querySelector('#detail-poster-svg, #detail-poster');
        const posterImg = maskedArt ? maskedArt.querySelector('image') : null;
        const posterImgRect = posterImg ? posterImg.getBoundingClientRect().toJSON() : null;
        const frameRect = openDlg.querySelector('.detail-poster-frame')?.getBoundingClientRect().toJSON() || null;
        const links = [...openDlg.querySelectorAll('a')].map(a => ({
          text: a.textContent.trim(),
          href: a.href,
          rel: a.rel,
        }));
        const allIds = [...document.querySelectorAll('[id]')].map(el => el.id);
        const dupIds = allIds.filter((id, i) => allIds.indexOf(id) !== i);
        return {
          title: openDlg.innerText,
          circleCount: maskCircles.length,
          minR: Math.min(...radii),
          maxR: Math.max(...radii),
          hasPosterArt: !!(maskedArt && maskedArt.innerHTML.trim().length > 100),
          posterViewBox: posterSvg ? posterSvg.getAttribute('viewBox') : null,
          posterImgHref: posterImg ? posterImg.getAttribute('href') : null,
          posterImgRect,
          frameRatio: frameRect && frameRect.height > 0 ? +(frameRect.width / frameRect.height).toFixed(3) : 0,
          links,
          dupIds,
        };
      })()`, { timeoutMs: 5000, label: 'CutSync detail sheet + ink-mask reveal' });

      assert.equal(detailState.circleCount, 7, 'Expected 7 ink-mask circles');
      assert.ok(detailState.minR >= 715 && detailState.maxR <= 725, `Expected ink-mask circles at r=720, got [${detailState.minR}, ${detailState.maxR}]`);
      assert.ok(detailState.hasPosterArt, 'Poster SVG art missing inside #ink-mask');
      assert.equal(detailState.posterViewBox, '0 0 504 900', `Expected poster SVG viewBox="0 0 504 900", got ${detailState.posterViewBox}`);
      assert.equal(detailState.posterImgHref, './assets/covers/cutsync.webp', `Expected CutSync WebP in poster, got ${detailState.posterImgHref}`);
      assert.ok(detailState.posterImgRect && detailState.posterImgRect.width > 120 && detailState.posterImgRect.height > 200,
        `Poster WebP <image> rendered size invalid: ${JSON.stringify(detailState.posterImgRect)}`);
      assert.ok(Math.abs(detailState.frameRatio - 504 / 900) < 0.03,
        `Poster frame aspect ratio should be ~0.560 (504/900), got ${detailState.frameRatio}`);
      assert.equal(detailState.dupIds.length, 0, `Duplicate DOM IDs with detail dialog open: ${JSON.stringify(detailState.dupIds)}`);
      assert.ok(detailState.links.some((l) => l.href.replace(/\/$/, '') === EXPECTED_URLS.cutsyncLive),
        `Missing CutSync Live link: ${JSON.stringify(detailState.links)}`);
      assert.ok(detailState.links.some((l) => l.href === EXPECTED_URLS.cutsyncGithub),
        `Missing CutSync GitHub link: ${JSON.stringify(detailState.links)}`);

      if (SCREENSHOT_DIR) {
        await page.screenshot(path.join(SCREENSHOT_DIR, '02-desktop-detail-cutsync.png'));
      }

      // Close with Escape
      await page.pressKey('Escape');
      await page.waitUntil(`(() => {
        const dialogs = [...document.querySelectorAll('[role="dialog"]')];
        return dialogs.every(d => getComputedStyle(d).visibility === 'hidden' || d.hidden || getComputedStyle(d).display === 'none');
      })()`, { timeoutMs: 4000, label: 'Escape closes detail dialog' });

      return `7 blobs r=${Math.round(detailState.minR)}..${Math.round(detailState.maxR)}, Live + GitHub links OK, Escape closed cleanly`;
    });

    // ------------------------------------------------------------------
    // 4. SOBRE / ABOUT sheet + clickable 4-project index navigation
    // ------------------------------------------------------------------
    await test('E2E Desktop', 'SOBRE / ABOUT opens with LinkedIn, Email, GitHub & 4-project index that navigates on click', async () => {
      const aboutBtnPt = await page.eval(`(() => {
        const btn = [...document.querySelectorAll('header button')].find(b => /SOBRE/i.test(b.textContent));
        if (!btn) return null;
        const r = btn.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      })()`);
      assert.ok(aboutBtnPt, 'Could not find SOBRE / ABOUT button in header');
      await page.clickPoint(aboutBtnPt.x, aboutBtnPt.y);

      const aboutState = await page.waitUntil(`(() => {
        const dialogs = [...document.querySelectorAll('[role="dialog"]')];
        const openDlg = dialogs.find(d => getComputedStyle(d).visibility === 'visible' && !d.hidden && getComputedStyle(d).display !== 'none');
        if (!openDlg) return false;
        // Wait for WAAPI clip-path sheet expansion and reveal animations to finish so click targets are unclipped
        const running = openDlg.getAnimations({ subtree: true }).filter(a => a.playState === 'running');
        if (running.length > 0) return false;
        const text = openDlg.innerText;
        if (!text.includes('Bruno Vinícius') || !text.includes('Zorin Copilot')) return false;
        const links = [...openDlg.querySelectorAll('a')].map(a => ({ text: a.textContent.trim(), href: a.href }));
        const indexButtons = [...openDlg.querySelectorAll('button, a')].filter(el =>
          /Zorin Copilot|Caderno Digital|ProjCatálogos|CutSync/.test(el.textContent)
        ).map(el => ({ text: el.textContent.trim(), tag: el.tagName }));
        return { text, links, indexButtons };
      })()`, { timeoutMs: 4000, label: 'About dialog fully expanded' });

      assert.ok(aboutState.text.includes('Araraquara'), 'About missing location');
      assert.ok(aboutState.links.some((l) => l.href === EXPECTED_URLS.linkedin), `About missing LinkedIn: ${JSON.stringify(aboutState.links)}`);
      assert.ok(aboutState.links.some((l) => l.href === `mailto:${EXPECTED_URLS.email}`), `About missing Email mailto: ${JSON.stringify(aboutState.links)}`);
      assert.ok(aboutState.links.some((l) => l.href.startsWith(EXPECTED_URLS.githubProfile)), `About missing GitHub: ${JSON.stringify(aboutState.links)}`);
      assert.ok(aboutState.text.toLowerCase().includes(EXPECTED_URLS.email), 'About should display email address');

      for (const title of ['Zorin Copilot', 'Caderno Digital', 'ProjCatálogos', 'CutSync']) {
        assert.ok(aboutState.indexButtons.some((b) => b.text.includes(title)),
          `About clickable index missing "${title}"`);
      }

      // Regression checks:
      // 1) Sheet .lbl line-height >= 1.25x font-size (prevents clipping Portuguese uppercase diacritics)
      // 2) Desktop .sheet allows vertical scroll (overflowY: auto)
      // 3) Hovering .about-index-item actually applies CSS translateX (not frozen by WAAPI fill:'both')
      const aboutLayout = await page.eval(`(() => {
        const sheet = document.getElementById('about-sheet');
        const lbls = [...sheet.querySelectorAll('.reveal-mask > .lbl, .reveal-mask > .reveal-item.lbl')].map(el => {
          const s = getComputedStyle(el);
          return { text: el.textContent.trim(), fs: parseFloat(s.fontSize), lh: parseFloat(s.lineHeight) };
        });
        const mask = sheet.querySelector('.about-contacts')?.parentElement;
        const pad = mask ? parseFloat(getComputedStyle(mask).paddingRight) : 0;
        const firstIdx = sheet.querySelector('.about-index-item');
        const r = firstIdx.getBoundingClientRect();
        return {
          overflowY: getComputedStyle(sheet).overflowY,
          lbls,
          maskPadRight: pad,
          hoverPt: { x: r.left + 40, y: r.top + r.height / 2 },
        };
      })()`);
      assert.equal(aboutLayout.overflowY, 'auto', `Desktop .sheet should use overflow-y: auto, got ${aboutLayout.overflowY}`);
      for (const l of aboutLayout.lbls) {
        assert.ok(l.lh >= l.fs * 1.25, `Sheet .lbl "${l.text}" line-height (${l.lh}px) too tight for font-size (${l.fs}px) — risks clipping diacritics`);
      }
      assert.ok(aboutLayout.maskPadRight >= 3, `Expected .reveal-mask breathing padding >= 3px to prevent border/focus clipping, got ${aboutLayout.maskPadRight}px`);

      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: aboutLayout.hoverPt.x, y: aboutLayout.hoverPt.y });
      const hoverTx = await page.waitUntil(`(() => {
        const el = document.querySelector('#about-sheet .about-index-item');
        const t = getComputedStyle(el).transform;
        if (!t || t === 'none') return false;
        const m = new DOMMatrixReadOnly(t);
        return m.m41 >= 4 ? m.m41 : false;
      })()`, { timeoutMs: 1500, label: '.about-index-item:hover translateX (not locked by WAAPI fill)' });

      if (SCREENSHOT_DIR) {
        await page.screenshot(path.join(SCREENSHOT_DIR, '03-desktop-about.png'));
      }

      // Click Zorin Copilot in About index
      const zorinBtn = await page.eval(`(() => {
        const dialogs = [...document.querySelectorAll('[role="dialog"]')];
        const openDlg = dialogs.find(d => getComputedStyle(d).visibility === 'visible' && !d.hidden);
        const btn = [...openDlg.querySelectorAll('button, a')].find(el => el.textContent.includes('Zorin Copilot'));
        if (!btn) return null;
        btn.scrollIntoView({ block: 'center' });
        const r = btn.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      })()`);
      assert.ok(zorinBtn, 'Zorin Copilot index item not found in About');
      await page.clickPoint(zorinBtn.x, zorinBtn.y);

      const navState = await page.waitUntil(`(() => {
        const dialogs = [...document.querySelectorAll('[role="dialog"]')];
        const allClosed = dialogs.every(d => getComputedStyle(d).visibility === 'hidden' || d.hidden);
        const obra = new URL(location.href).searchParams.get('obra');
        const cap = document.querySelector('[aria-live="polite"]')?.innerText || '';
        if (allClosed && obra === 'zorin-copilot' && cap.includes('Zorin Copilot')) {
          return { obra, cap: cap.trim() };
        }
        return false;
      })()`, { timeoutMs: 5000, label: 'About index click navigates to Zorin Copilot' });

      return `LinkedIn + Email + GitHub + 4-item index OK -> navigated to ?obra=${navState.obra}`;
    });

    // ------------------------------------------------------------------
    // 5. Deep-link ?obra=projcatalogos + Coming Soon state (no broken repo link)
    // ------------------------------------------------------------------
    await test('E2E Desktop', 'Deep-link ?obra=projcatalogos loads directly & shows EM BREVE NO GITHUB without broken link', async () => {
      await page.navigate(`${srv.baseUrl}/?obra=projcatalogos`);

      const init = await page.waitUntil(`(() => {
        const cap = document.querySelector('[aria-live="polite"]')?.innerText || '';
        const activeTabs = [...document.querySelectorAll('nav button')]
          .filter(b => b.classList.contains('active') || b.classList.contains('on') || b.getAttribute('aria-current') === 'true' || b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-selected') === 'true')
          .map(b => b.textContent.trim());
        if (cap.includes('ProjCatálogos') && activeTabs.some(t => t.includes('VITRINE / RETAIL'))) {
          return { cap: cap.trim(), activeTabs };
        }
        return false;
      })()`, { timeoutMs: 5000, label: 'deep-link projcatalogos load' });

      // Open detail using Enter key
      await page.pressKey('Enter');

      const dlgInfo = await page.waitUntil(`(() => {
        const dialogs = [...document.querySelectorAll('[role="dialog"]')];
        const openDlg = dialogs.find(d => getComputedStyle(d).visibility === 'visible' && !d.hidden);
        if (!openDlg || !openDlg.innerText.includes('ProjCatálogos')) return false;
        const disabledEls = [...openDlg.querySelectorAll('[aria-disabled="true"], button:disabled')].map(el => el.textContent.trim());
        const links = [...openDlg.querySelectorAll('a')].map(a => ({ text: a.textContent.trim(), href: a.href }));
        return { text: openDlg.innerText, disabledEls, links };
      })()`, { timeoutMs: 4000, label: 'ProjCatálogos detail dialog via Enter' });

      assert.ok(/EM BREVE NO GITHUB\s*\/\s*COMING SOON/i.test(dlgInfo.text),
        `Detail missing "EM BREVE NO GITHUB / COMING SOON": ${dlgInfo.text}`);
      assert.ok(dlgInfo.disabledEls.some((t) => /EM BREVE/i.test(t)),
        `Coming soon control should have aria-disabled="true" or disabled, got: ${JSON.stringify(dlgInfo.disabledEls)}`);
      assert.ok(!dlgInfo.links.some((l) => /projcatalogos/i.test(l.href)),
        `ProjCatálogos must NOT link to a nonexistent repo URL: ${JSON.stringify(dlgInfo.links)}`);
      assert.ok(dlgInfo.links.some((l) => l.href.startsWith(EXPECTED_URLS.githubProfile)),
        `ProjCatálogos detail should offer secondary GitHub profile link: ${JSON.stringify(dlgInfo.links)}`);

      // Wait for ProjCatálogos detail animations + ink mask to finish, verify zero button border clipping
      const projClipCheck = await page.waitUntil(`(() => {
        const openDlg = document.getElementById('detail-sheet');
        const running = openDlg.getAnimations({ subtree: true }).filter(a => a.playState === 'running');
        const radii = [...openDlg.querySelectorAll('#ink-mask circle')].map(c => parseFloat(c.getAttribute('r') || '0'));
        if (running.length > 0 || !radii.every(r => r >= 715)) return false;
        const mask = document.getElementById('detail-actions').parentElement.getBoundingClientRect();
        const btns = [...document.querySelectorAll('#detail-actions > *')].map(b => b.getBoundingClientRect());
        const rightClearance = Math.min(...btns.map(r => mask.right - r.right));
        const leftClearance = Math.min(...btns.map(r => r.left - mask.left));
        return { rightClearance: +rightClearance.toFixed(1), leftClearance: +leftClearance.toFixed(1) };
      })()`, { timeoutMs: 4500, label: 'ProjCatálogos detail settled & button clearance' });
      assert.ok(projClipCheck.rightClearance >= 3 && projClipCheck.leftClearance >= 3,
        `CTA buttons sit too close to .reveal-mask clip edge: ${JSON.stringify(projClipCheck)}`);

      if (SCREENSHOT_DIR) {
        await page.screenshot(path.join(SCREENSHOT_DIR, '06-desktop-detail-projcatalogos.png'));
      }

      await page.pressKey('Escape');
      await page.waitUntil(`(() => [...document.querySelectorAll('[role="dialog"]')].every(d => getComputedStyle(d).visibility === 'hidden' || d.hidden))()`, {
        timeoutMs: 4000,
        label: 'Escape closes ProjCatálogos dialog',
      });

      return `Deep-link tab=${init.activeTabs[0]}, Enter opened dialog, COMING SOON disabled OK, 0 broken links`;
    });

    // ------------------------------------------------------------------
    // 6. Invalid Deep-Link Fallback + TODOS / ALL Tab Behavior + Arrow Wrap
    // ------------------------------------------------------------------
    await test('E2E Desktop', 'Invalid ?obra=unknown falls back safely; TODOS / ALL jumps to index 0 without staying active; ArrowLeft wraps 0 -> 3', async () => {
      await page.navigate(`${srv.baseUrl}/?obra=does-not-exist`);
      await page.waitUntil(`(() => (document.querySelector('[aria-live="polite"]')?.innerText || '').includes('Caderno Digital'))()`, {
        timeoutMs: 4000,
        label: 'invalid deep-link fallback to Caderno Digital',
      });

      // Click TODOS / ALL tab
      const allBtnPt = await page.eval(`(() => {
        const b = [...document.querySelectorAll('nav button')].find(x => /TODOS/i.test(x.textContent));
        const r = b.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      })()`);
      await page.clickPoint(allBtnPt.x, allBtnPt.y);

      const afterAll = await page.waitUntil(`(() => {
        const cap = document.querySelector('[aria-live="polite"]')?.innerText || '';
        const activeTabs = [...document.querySelectorAll('nav button')]
          .filter(b => b.classList.contains('active') || b.classList.contains('on') || b.getAttribute('aria-current') === 'true' || b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-selected') === 'true')
          .map(b => b.textContent.trim());
        if (cap.includes('Zorin Copilot') && activeTabs.length === 1 && activeTabs[0].includes('SISTEMA / SYSTEM')) {
          return { activeTabs };
        }
        return false;
      })()`, { timeoutMs: 4000, label: 'TODOS / ALL jumps to Zorin Copilot & activates SISTEMA / SYSTEM' });

      // Press ArrowLeft from index 0 -> should wrap to index 3 (CutSync)
      await page.pressKey('ArrowLeft');
      await page.waitUntil(`(() => new URL(location.href).searchParams.get('obra') === 'cutsync')()`, {
        timeoutMs: 4000,
        label: 'ArrowLeft wrap 0 -> 3 (CutSync)',
      });

      return `fallback OK, TODOS->${afterAll.activeTabs[0]}, ArrowLeft wrap 0->cutsync OK`;
    });

    // ------------------------------------------------------------------
    // 6B. Continuous Dossier: First-Fold Fit (1440x900 & 1280x720)
    // ------------------------------------------------------------------
    await test('E2E Dossier', 'First-fold fit (1440x900 & 1280x720): Zorin Copilot Title, Synopsis, CTA, Scroll Cue & Cover fit above the fold', async () => {
      const checkFold = async (width, height) => {
        await page.setViewport({ width, height, mobile: false, deviceScaleFactor: 1 });
        await page.navigate(`${srv.baseUrl}/?obra=zorin-copilot`);
        await page.waitUntil(`(document.querySelector('[aria-live="polite"]')?.innerText || '').includes('Zorin Copilot')`, {
          timeoutMs: 4000,
          label: `zorin load ${width}x${height}`,
        });
        await page.pressKey('Enter');
        const fold = await page.waitUntil(`(() => {
          const dlg = document.getElementById('detail-sheet');
          if (!dlg || getComputedStyle(dlg).visibility !== 'visible') return false;
          const running = dlg.getAnimations({ subtree: true }).filter(a => a.playState === 'running');
          const radii = [...dlg.querySelectorAll('#ink-mask circle')].map(c => parseFloat(c.getAttribute('r') || '0'));
          if (running.length > 0 || !radii.every(r => r >= 715)) return false;

          const title = document.getElementById('detail-title').getBoundingClientRect();
          const synPt = document.getElementById('detail-synopsis-pt').getBoundingClientRect();
          const cta = document.querySelector('#detail-actions a, #detail-actions button')?.getBoundingClientRect();
          const cue = [...dlg.querySelectorAll('button')].find(b => /EXPLORAR|EXPLORE/i.test(b.textContent))?.getBoundingClientRect();
          const poster = document.getElementById('detail-poster-svg')?.getBoundingClientRect();
          return {
            vh: window.innerHeight,
            titleBottom: Math.round(title.bottom),
            synPtBottom: Math.round(synPt.bottom),
            ctaBottom: cta ? Math.round(cta.bottom) : null,
            cueBottom: cue ? Math.round(cue.bottom) : null,
            posterTop: poster ? Math.round(poster.top) : null,
            posterBottom: poster ? Math.round(poster.bottom) : null,
          };
        })()`, { timeoutMs: 5000, label: `Zorin first fold ${width}x${height}` });

        assert.ok(fold.ctaBottom !== null && fold.ctaBottom <= fold.vh + 2,
          `[${width}x${height}] CTA clipped below fold: bottom=${fold.ctaBottom} > vh=${fold.vh}`);
        assert.ok(fold.cueBottom !== null && fold.cueBottom <= fold.vh + 2,
          `[${width}x${height}] Scroll cue missing or clipped below fold: ${JSON.stringify(fold)}`);
        assert.ok(fold.posterTop >= 50 && fold.posterBottom <= fold.vh + 2,
          `[${width}x${height}] Poster clipped vertically: top=${fold.posterTop}, bottom=${fold.posterBottom}, vh=${fold.vh}`);
        return fold;
      };

      const f1280 = await checkFold(1280, 720);
      const f1440 = await checkFold(1440, 900);
      return `1280x720(cue=${f1280.cueBottom}/${f1280.vh}, poster=${f1280.posterBottom}/${f1280.vh}) & 1440x900(cue=${f1440.cueBottom}/${f1440.vh}, poster=${f1440.posterBottom}/${f1440.vh})`;
    });

    // ------------------------------------------------------------------
    // 6C. Continuous Dossier Sections (4 sections + SVG bbox audit across all 4 projects)
    // ------------------------------------------------------------------
    await test('E2E Dossier', 'All 4 dossier sections, bespoke Arch SVG & 3 Gallery plates render cleanly across all 4 projects with 0 SVG text clipping', async () => {
      // Currently open on Zorin Copilot at 1440x900 — click scroll cue first!
      const cuePt = await page.eval(`(() => {
        const dlg = document.getElementById('detail-sheet');
        const btn = [...dlg.querySelectorAll('button')].find(b => /EXPLORAR|EXPLORE/i.test(b.textContent));
        const r = btn.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      })()`);
      await page.clickPoint(cuePt.x, cuePt.y);
      await page.waitUntil(`document.getElementById('detail-sheet').scrollTop > 100`, {
        timeoutMs: 3000,
        label: 'scroll cue scrolls #detail-sheet',
      });

      // Scroll through the dossier so IntersectionObserver reveals every section
      await page.eval(`(async () => {
        const dlg = document.getElementById('detail-sheet');
        for (const frac of [0.25, 0.55, 0.85, 1.0]) {
          dlg.scrollTop = Math.round(dlg.scrollHeight * frac);
          await new Promise(r => setTimeout(r, 140));
        }
      })()`);
      await page.waitUntil(`(() => {
        const dlg = document.getElementById('detail-sheet');
        return dlg.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length === 0;
      })()`, { timeoutMs: 4000, label: 'dossier reveal animations finished' });

      const zorinAudit = await page.eval(`(() => {
        const dossier = document.getElementById('detail-dossier');
        const text = dossier.innerText.toUpperCase();
        const sections = [...dossier.querySelectorAll('.dossier-section, section')];
        const archSvg = dossier.querySelector('svg[viewBox="0 0 960 360"]');
        const plates = [...dossier.querySelectorAll('.gallery-plate')];
        const plateRects = plates.map(p => p.getBoundingClientRect().toJSON());
        const wfSvgs = plates.map(p => p.querySelector('svg[viewBox="0 0 960 600"]')).filter(Boolean);

        // Check SVG text bboxes for clipping outside viewBox
        const svgIssues = [];
        function checkSvgTexts(svg, maxW, maxH, label) {
          if (!svg) return;
          const svgCtm = svg.getCTM();
          if (!svgCtm) return;
          svg.querySelectorAll('text').forEach((t) => {
            const b = t.getBBox();
            if (b.width === 0 && b.height === 0) return;
            const ctm = svgCtm.inverse().multiply(t.getCTM());
            const pts = [
              new DOMPoint(b.x, b.y),
              new DOMPoint(b.x + b.width, b.y),
              new DOMPoint(b.x, b.y + b.height),
              new DOMPoint(b.x + b.width, b.y + b.height),
            ].map(p => p.matrixTransform(ctm));
            const minX = Math.min(...pts.map(p => p.x));
            const maxX = Math.max(...pts.map(p => p.x));
            const minY = Math.min(...pts.map(p => p.y));
            const maxY = Math.max(...pts.map(p => p.y));
            if (minX < -2 || maxX > maxW + 2 || minY < -2 || maxY > maxH + 2) {
              svgIssues.push({ label, text: t.textContent.trim(), minX: +minX.toFixed(1), maxX: +maxX.toFixed(1), minY: +minY.toFixed(1), maxY: +maxY.toFixed(1) });
            }
          });
        }
        checkSvgTexts(archSvg, 960, 360, 'zorin:arch');
        wfSvgs.forEach((s, i) => checkSvgTexts(s, 960, 600, 'zorin:wf' + i));

        const allIds = [...document.querySelectorAll('[id]')].map(el => el.id);
        const dupIds = allIds.filter((id, i) => allIds.indexOf(id) !== i);

        return {
          sectionCount: sections.length,
          hasChallenge: text.includes('DESAFIO') && text.includes('ABORDAGEM'),
          hasHighlights: text.includes('PARTICULARIDADES'),
          hasArch: text.includes('ARQUITETURA'),
          hasGallery: text.includes('POR DENTRO'),
          hasArchSvg: !!(archSvg && archSvg.getBoundingClientRect().width > 300),
          plateCount: plates.length,
          wfCount: wfSvgs.length,
          plateRects,
          svgIssues,
          dupIds,
        };
      })()`);

      assert.ok(zorinAudit.sectionCount >= 4, `Expected >= 4 dossier sections, got ${zorinAudit.sectionCount}`);
      assert.ok(zorinAudit.hasChallenge && zorinAudit.hasHighlights && zorinAudit.hasArch && zorinAudit.hasGallery,
        `Missing one of the 4 dossier sections: ${JSON.stringify(zorinAudit)}`);
      assert.ok(zorinAudit.hasArchSvg, 'Architecture SVG (960x360) not rendered');
      assert.equal(zorinAudit.plateCount, 3, `Expected 3 gallery plates, got ${zorinAudit.plateCount}`);
      assert.equal(zorinAudit.wfCount, 3, `Expected 3 wireframe SVGs (960x600), got ${zorinAudit.wfCount}`);
      assert.equal(zorinAudit.dupIds.length, 0, `Duplicate DOM IDs with dossier open: ${JSON.stringify(zorinAudit.dupIds)}`);
      assert.equal(zorinAudit.svgIssues.length, 0, `Zorin dossier SVG text clipping:\n${JSON.stringify(zorinAudit.svgIssues, null, 2)}`);

      // Verify featured wide plate (0) + side-by-side plates (1 & 2) on desktop
      const [p0, p1, p2] = zorinAudit.plateRects;
      assert.ok(p0.width > p1.width * 1.4, `Featured plate 0 should be full width (${Math.round(p0.width)}px vs ${Math.round(p1.width)}px)`);
      assert.ok(Math.abs(p1.top - p2.top) < 16 && p2.left > p1.right - 2,
        `Plates 1 & 2 should sit side-by-side: p1=${JSON.stringify(p1)}, p2=${JSON.stringify(p2)}`);

      if (SCREENSHOT_DIR) {
        // Capture scrolled top sections (Challenge + Highlights + Architecture)
        await page.eval(`(() => {
          const dlg = document.getElementById('detail-sheet');
          const s0 = document.querySelector('#detail-dossier .dossier-section, #detail-dossier section');
          if (s0) dlg.scrollTop = Math.max(0, s0.offsetTop - 92);
        })()`);
        await new Promise((r) => setTimeout(r, 120));
        await page.screenshot(path.join(SCREENSHOT_DIR, '09-dossier-top-sections.png'));

        // Capture Architecture + Gallery wireframes
        await page.eval(`(() => {
          const dlg = document.getElementById('detail-sheet');
          const secs = [...document.querySelectorAll('#detail-dossier .dossier-section, #detail-dossier section')];
          const archSec = secs[2] || secs[secs.length - 1];
          if (archSec) dlg.scrollTop = Math.max(0, archSec.offsetTop - 92);
        })()`);
        await new Promise((r) => setTimeout(r, 120));
        await page.screenshot(path.join(SCREENSHOT_DIR, '10-dossier-arch-gallery.png'));

        // Scroll to bottom of Gallery section to show the 2 side-by-side detail plates as well
        await page.eval(`(() => {
          const dlg = document.getElementById('detail-sheet');
          const plates = [...document.querySelectorAll('#detail-dossier .gallery-plate')];
          if (plates[1]) plates[1].scrollIntoView({ block: 'center' });
        })()`);
        await new Promise((r) => setTimeout(r, 120));
        await page.screenshot(path.join(SCREENSHOT_DIR, '10c-dossier-gallery-pair.png'));
      }

      // Audit remaining 3 projects' architecture SVGs, live captured gallery <img>s (HTTP 200 + naturalWidth > 0) & Lightbox, plus fallback wireframe SVG bboxes
      const otherIssues = [];
      let livePlatesVerified = 0;
      let wireframePlatesVerified = 3; // Zorin Copilot's 3 plates verified above
      for (const projId of ['caderno-digital', 'projcatalogos', 'cutsync']) {
        await page.navigate(`${srv.baseUrl}/?obra=${projId}`);
        await page.pressKey('Enter');
        await page.waitUntil(`(() => {
          const dlg = document.getElementById('detail-sheet');
          return dlg && getComputedStyle(dlg).visibility === 'visible' && dlg.querySelectorAll('#detail-dossier .gallery-plate').length === 3;
        })()`, { timeoutMs: 4000, label: `${projId} dossier render` });

        // Scroll through the dossier so every section reveals & every lazy <img> decodes
        await page.eval(`(async () => {
          const dlg = document.getElementById('detail-sheet');
          for (const frac of [0.3, 0.6, 0.85, 1.0]) {
            dlg.scrollTop = Math.round(dlg.scrollHeight * frac);
            await new Promise(r => setTimeout(r, 120));
          }
        })()`);
        await page.waitUntil(`(() => {
          const dlg = document.getElementById('detail-sheet');
          if (dlg.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length > 0) return false;
          const imgs = [...dlg.querySelectorAll('#detail-dossier .gallery-plate img')];
          return imgs.every(im => im.complete && im.naturalWidth > 0);
        })()`, { timeoutMs: 5000, label: `${projId} gallery plates & images decoded` });

        const check = await page.eval(`(() => {
          const dossier = document.getElementById('detail-dossier');
          const specGallery = window.PORTFOLIO_DOSSIERS.byId['${projId}'].gallery;
          const archSvg = dossier.querySelector('svg[viewBox="0 0 960 360"]');
          const plates = [...dossier.querySelectorAll('.gallery-plate')];
          const issues = [];
          function checkSvg(svg, maxW, maxH, label) {
            if (!svg || !svg.getCTM()) return;
            const inv = svg.getCTM().inverse();
            svg.querySelectorAll('text').forEach((t) => {
              const b = t.getBBox();
              if (b.width === 0 && b.height === 0) return;
              const ctm = inv.multiply(t.getCTM());
              const pts = [
                new DOMPoint(b.x, b.y),
                new DOMPoint(b.x + b.width, b.y),
                new DOMPoint(b.x, b.y + b.height),
                new DOMPoint(b.x + b.width, b.y + b.height),
              ].map(p => p.matrixTransform(ctm));
              const minX = Math.min(...pts.map(p => p.x));
              const maxX = Math.max(...pts.map(p => p.x));
              const minY = Math.min(...pts.map(p => p.y));
              const maxY = Math.max(...pts.map(p => p.y));
              if (minX < -2 || maxX > maxW + 2 || minY < -2 || maxY > maxH + 2) {
                issues.push({ label, text: t.textContent.trim(), minX: +minX.toFixed(1), maxX: +maxX.toFixed(1), minY: +minY.toFixed(1), maxY: +maxY.toFixed(1) });
              }
            });
          }
          checkSvg(archSvg, 960, 360, '${projId}:arch');

          let liveCount = 0;
          let wfCount = 0;
          let firstLiveIdx = -1;
          plates.forEach((plate, idx) => {
            const spec = specGallery[idx];
            if (spec && spec.image) {
              const im = plate.querySelector('img');
              if (!im || !im.complete || im.naturalWidth <= 0 || im.naturalHeight <= 0) {
                issues.push({ label: '${projId}:plate' + idx, error: 'expected loaded <img> for ' + spec.image });
              } else {
                const r = im.getBoundingClientRect();
                if (r.width <= 0 || r.height <= 0) {
                  issues.push({ label: '${projId}:plate' + idx, error: 'zero rendered size for ' + spec.image });
                }
                liveCount += 1;
                if (firstLiveIdx === -1) firstLiveIdx = idx;
              }
            } else {
              const svg = plate.querySelector('svg[viewBox="0 0 960 600"]');
              if (!svg) {
                issues.push({ label: '${projId}:plate' + idx, error: 'missing fallback wireframe SVG' });
              } else {
                checkSvg(svg, 960, 600, '${projId}:wf' + idx);
                wfCount += 1;
              }
            }
          });
          const allIds = [...document.querySelectorAll('[id]')].map(el => el.id);
          const dupIds = allIds.filter((id, i) => allIds.indexOf(id) !== i);
          return { hasArch: !!archSvg, plateCount: plates.length, liveCount, wfCount, firstLiveIdx, dupIds, issues };
        })()`);

        livePlatesVerified += check.liveCount;
        wireframePlatesVerified += check.wfCount;

        if (!check.hasArch || check.plateCount !== 3 || check.liveCount + check.wfCount !== 3 || check.dupIds.length || check.issues.length) {
          otherIssues.push({ projId, ...check });
        }

        // If this project has real captures, verify Lightbox renders the real <img> cleanly + capture visual audit screenshots
        if (check.firstLiveIdx >= 0) {
          if (SCREENSHOT_DIR) {
            await page.eval(`(() => {
              const dlg = document.getElementById('detail-sheet');
              const galSec = document.getElementById('dossier-gallery');
              if (galSec) dlg.scrollTop = Math.max(0, galSec.offsetTop - 92);
            })()`);
            await new Promise((r) => setTimeout(r, 120));
            await page.screenshot(path.join(SCREENSHOT_DIR, `13-${projId}-gallery-top.png`));

            await page.eval(`(() => {
              const plates = [...document.querySelectorAll('#detail-dossier .gallery-plate')];
              if (plates[1]) plates[1].scrollIntoView({ block: 'center' });
            })()`);
            await new Promise((r) => setTimeout(r, 120));
            await page.screenshot(path.join(SCREENSHOT_DIR, `13b-${projId}-gallery-pair.png`));
          }

          await page.eval(`document.querySelectorAll('#detail-dossier .gallery-plate')[${check.firstLiveIdx}].click()`);
          const lbCheck = await page.waitUntil(`(() => {
            const lb = document.getElementById('gallery-lightbox');
            if (!lb || getComputedStyle(lb).visibility !== 'visible') return false;
            if (lb.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length > 0) return false;
            const im = lb.querySelector('img');
            if (!im || !im.complete || im.naturalWidth <= 0) return false;
            return { natW: im.naturalWidth, natH: im.naturalHeight, fit: getComputedStyle(im).objectFit };
          })()`, { timeoutMs: 4000, label: `${projId} Lightbox live photo` });
          if (lbCheck.fit !== 'contain' || lbCheck.natW < 400) {
            otherIssues.push({ projId, error: `Lightbox photo sizing invalid: ${JSON.stringify(lbCheck)}` });
          }
          if (SCREENSHOT_DIR) {
            await page.screenshot(path.join(SCREENSHOT_DIR, `14-${projId}-lightbox.png`));
          }
          await page.pressKey('Escape');
          await page.waitUntil(`getComputedStyle(document.getElementById('gallery-lightbox')).visibility === 'hidden'`, {
            timeoutMs: 3000,
            label: `${projId} Lightbox close`,
          });
        }
      }
      assert.equal(otherIssues.length, 0, `Dossier plate/SVG issues on other projects:\n${JSON.stringify(otherIssues, null, 2)}`);

      return `4 projects verified (${livePlatesVerified} live photo plates + ${wireframePlatesVerified} wireframes + 4 arch SVGs), 0 dup IDs, 0 SVG text clipping`;
    });

    // ------------------------------------------------------------------
    // 6D. PT / EN Language Switcher preserves scrollTop & updates all dossier copy
    // ------------------------------------------------------------------
    await test('E2E Dossier', 'PT / EN switcher translates all dossier sections without losing #detail-sheet.scrollTop', async () => {
      // Open Zorin Copilot and scroll down inside #detail-sheet
      await page.navigate(`${srv.baseUrl}/?obra=zorin-copilot`);
      await page.pressKey('Enter');
      await page.waitUntil(`(() => {
        const dlg = document.getElementById('detail-sheet');
        const radii = [...dlg.querySelectorAll('#ink-mask circle')].map(c => parseFloat(c.getAttribute('r') || '0'));
        return getComputedStyle(dlg).visibility === 'visible' && radii.every(r => r >= 715);
      })()`, { timeoutMs: 5000, label: 'zorin detail settled for lang toggle' });

      const before = await page.eval(`(() => {
        const dlg = document.getElementById('detail-sheet');
        dlg.scrollTop = 760;
        const dossier = document.getElementById('detail-dossier');
        const enBtn = [...dlg.querySelectorAll('[role="group"] button')].find(b => b.textContent.trim() === 'EN');
        const r = enBtn.getBoundingClientRect();
        return {
          scrollTop: dlg.scrollTop,
          ptText: dossier.innerText,
          enBtnPt: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
        };
      })()`);
      assert.ok(before.scrollTop >= 600, `Expected #detail-sheet scrolled >= 600, got ${before.scrollTop}`);
      assert.ok(before.ptText.includes('O Desafio') || before.ptText.includes('O DESAFIO'), 'Expected Portuguese challenge label initially');

      await page.clickPoint(before.enBtnPt.x, before.enBtnPt.y);

      const afterEn = await page.waitUntil(`(() => {
        const dlg = document.getElementById('detail-sheet');
        const text = document.getElementById('detail-dossier').innerText;
        if (!/The Challenge|THE CHALLENGE/.test(text)) return false;
        const radii = [...dlg.querySelectorAll('#ink-mask circle')].map(c => parseFloat(c.getAttribute('r') || '0'));
        const ptBtn = [...dlg.querySelectorAll('[role="group"] button')].find(b => b.textContent.trim() === 'PT');
        const r = ptBtn.getBoundingClientRect();
        return {
          scrollTop: dlg.scrollTop,
          enText: text,
          minR: Math.min(...radii),
          ptBtnPt: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
        };
      })()`, { timeoutMs: 3000, label: 'dossier switches to EN' });

      assert.ok(Math.abs(afterEn.scrollTop - before.scrollTop) < 60,
        `Switching to EN lost scrollTop: before=${before.scrollTop}, after=${afterEn.scrollTop}`);
      assert.ok(afterEn.minR >= 715, `Switching language should NOT re-run ink mask reveal (minR=${afterEn.minR})`);
      assert.notEqual(afterEn.enText, before.ptText, 'Dossier text did not change on EN switch');

      // Switch back to PT
      await page.clickPoint(afterEn.ptBtnPt.x, afterEn.ptBtnPt.y);
      const afterPt = await page.waitUntil(`(() => {
        const dlg = document.getElementById('detail-sheet');
        const text = document.getElementById('detail-dossier').innerText;
        if (!/O Desafio|O DESAFIO/.test(text)) return false;
        return { scrollTop: dlg.scrollTop };
      })()`, { timeoutMs: 3000, label: 'dossier switches back to PT' });

      assert.ok(Math.abs(afterPt.scrollTop - afterEn.scrollTop) < 60,
        `Switching back to PT lost scrollTop: before=${afterEn.scrollTop}, after=${afterPt.scrollTop}`);
      return `scrollTop preserved (${before.scrollTop} -> ${afterEn.scrollTop} -> ${afterPt.scrollTop}), PT<->EN live swap OK`;
    });

    // ------------------------------------------------------------------
    // 6E. Full-Screen Editorial Lightbox (#gallery-lightbox)
    // ------------------------------------------------------------------
    await test('E2E Lightbox', 'Clicking plate opens #gallery-lightbox (1/3 -> 2/3 -> 3/3 via arrows), Escape closes ONLY Lightbox & restores focus', async () => {
      // Scroll to gallery plates and click plate 0
      const plate0Pt = await page.eval(`(() => {
        const plate = document.querySelectorAll('#detail-dossier .gallery-plate')[0];
        plate.scrollIntoView({ block: 'center' });
        const r = plate.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      })()`);
      await page.clickPoint(plate0Pt.x, plate0Pt.y);

      const lbOpen = await page.waitUntil(`(() => {
        const lb = document.getElementById('gallery-lightbox');
        if (!lb || getComputedStyle(lb).visibility !== 'visible') return false;
        if (lb.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length > 0) return false;
        const svg = lb.querySelector('svg[viewBox="0 0 960 600"]');
        const svgRect = svg ? svg.getBoundingClientRect().toJSON() : null;
        const allIds = [...document.querySelectorAll('[id]')].map(el => el.id);
        const dupIds = allIds.filter((id, i) => allIds.indexOf(id) !== i);
        return {
          role: lb.getAttribute('role'),
          text: lb.innerText,
          svgRect,
          dupIds,
        };
      })()`, { timeoutMs: 4000, label: 'Lightbox open & settled' });

      assert.equal(lbOpen.role, 'dialog', 'Lightbox must have role="dialog"');
      assert.ok(/1\s*\/\s*3/.test(lbOpen.text), `Expected counter "1 / 3" in Lightbox, got: ${lbOpen.text}`);
      assert.ok(lbOpen.svgRect && lbOpen.svgRect.width > 300 && lbOpen.svgRect.height > 180,
        `Lightbox full-size wireframe invalid: ${JSON.stringify(lbOpen.svgRect)}`);
      assert.equal(lbOpen.dupIds.length, 0, `Duplicate DOM IDs with Lightbox open: ${JSON.stringify(lbOpen.dupIds)}`);

      if (SCREENSHOT_DIR) {
        await page.screenshot(path.join(SCREENSHOT_DIR, '11-desktop-lightbox.png'));
      }

      // Navigate ArrowRight -> 2 / 3 -> 3 / 3 -> ArrowLeft -> 2 / 3
      await page.pressKey('ArrowRight');
      await page.waitUntil(`/2\\s*\\/\\s*3/.test(document.getElementById('gallery-lightbox').innerText)`, {
        timeoutMs: 2500,
        label: 'Lightbox ArrowRight -> 2 / 3',
      });
      await page.pressKey('ArrowRight');
      await page.waitUntil(`/3\\s*\\/\\s*3/.test(document.getElementById('gallery-lightbox').innerText)`, {
        timeoutMs: 2500,
        label: 'Lightbox ArrowRight -> 3 / 3',
      });

      // Press Escape -> MUST close ONLY Lightbox, keep #detail-sheet open, and restore focus to plate 2!
      await page.pressKey('Escape');
      const afterEsc = await page.waitUntil(`(() => {
        const lb = document.getElementById('gallery-lightbox');
        const dlg = document.getElementById('detail-sheet');
        if (getComputedStyle(lb).visibility !== 'hidden') return false;
        const plates = [...document.querySelectorAll('#detail-dossier .gallery-plate')];
        return {
          detailStillOpen: getComputedStyle(dlg).visibility === 'visible',
          focusedIndex: plates.indexOf(document.activeElement),
        };
      })()`, { timeoutMs: 3500, label: 'Escape closes only Lightbox & restores focus' });

      assert.equal(afterEsc.detailStillOpen, true, 'Pressing Escape in Lightbox must NOT close #detail-sheet');
      assert.equal(afterEsc.focusedIndex, 2, `Expected focus restored to active gallery plate 2, got index ${afterEsc.focusedIndex}`);
      return 'Lightbox 1/3 -> 2/3 -> 3/3 OK, Escape closed ONLY Lightbox & restored focus to plate[2]';
    });

    // ------------------------------------------------------------------
    // 6F. Real Screenshot Swap Readiness & XSS Guard (item.image)
    // ------------------------------------------------------------------
    await test('E2E Dossier', 'Real screenshot swap (item.image) renders <img> cleanly on plate & Lightbox and blocks javascript: XSS URLs', async () => {
      // Mutate in-memory dossier[zorin-copilot].gallery[0].image to a real local WebP + gallery[1].image to javascript: XSS
      await page.eval(`(() => {
        const g = window.PORTFOLIO_DOSSIERS.byId['zorin-copilot'].gallery;
        g[0].image = './assets/covers/zorin-copilot.webp';
        g[1].image = 'javascript:alert(1)';
      })()`);

      // Close and reopen detail sheet so plates mount with the swapped images
      await page.pressKey('Escape');
      await page.waitUntil(`getComputedStyle(document.getElementById('detail-sheet')).visibility === 'hidden'`, {
        timeoutMs: 4000,
        label: 'close detail before image swap test',
      });
      await page.pressKey('Enter');
      await page.waitUntil(`getComputedStyle(document.getElementById('detail-sheet')).visibility === 'visible'`, {
        timeoutMs: 4000,
        label: 'reopen detail for image swap test',
      });
      // Scroll gallery into view so loading="lazy" triggers image decode
      await page.eval(`document.querySelectorAll('#detail-dossier .gallery-plate')[0]?.scrollIntoView({ block: 'center' })`);

      const swapState = await page.waitUntil(`(() => {
        const dlg = document.getElementById('detail-sheet');
        if (getComputedStyle(dlg).visibility !== 'visible') return false;
        const plates = [...document.querySelectorAll('#detail-dossier .gallery-plate')];
        if (plates.length !== 3) return false;
        const img0 = plates[0].querySelector('img');
        if (!img0 || !img0.complete || img0.naturalWidth <= 0) return false;
        const badImg1 = plates[1].querySelector('img');
        const wf1 = plates[1].querySelector('svg');
        return {
          img0Src: img0.getAttribute('src'),
          img0NatW: img0.naturalWidth,
          img0Fit: getComputedStyle(img0).objectFit,
          plate0Text: plates[0].innerText,
          plate1BlockedXss: !badImg1 && !!wf1,
        };
      })()`, { timeoutMs: 4500, label: 'real image swap rendered on plate 0 & XSS blocked on plate 1' });

      assert.equal(swapState.img0Src, './assets/covers/zorin-copilot.webp');
      assert.ok(swapState.img0NatW > 0, 'Swapped <img> failed to decode');
      assert.equal(swapState.img0Fit, 'cover', `Expected gallery plate <img> object-fit: cover, got ${swapState.img0Fit}`);
      assert.ok(/Captura real/i.test(swapState.plate0Text), `Expected photoTag on swapped plate, got: ${swapState.plate0Text}`);
      assert.equal(swapState.plate1BlockedXss, true, 'javascript: image URL MUST be blocked and fall back safely to wireframe');

      // Open Lightbox on plate 0 -> should render <img> with object-fit: contain
      await page.eval(`document.querySelectorAll('#detail-dossier .gallery-plate')[0].click()`);
      const lbImg = await page.waitUntil(`(() => {
        const lb = document.getElementById('gallery-lightbox');
        if (getComputedStyle(lb).visibility !== 'visible') return false;
        const img = lb.querySelector('img');
        if (!img || !img.complete || img.naturalWidth <= 0) return false;
        return { src: img.getAttribute('src'), natW: img.naturalWidth, fit: getComputedStyle(img).objectFit };
      })()`, { timeoutMs: 4000, label: 'Lightbox renders real <img>' });

      assert.equal(lbImg.src, './assets/covers/zorin-copilot.webp');
      assert.equal(lbImg.fit, 'contain', `Expected Lightbox <img> object-fit: contain, got ${lbImg.fit}`);

      // Restore original null images cleanly
      await page.eval(`(() => {
        const g = window.PORTFOLIO_DOSSIERS.byId['zorin-copilot'].gallery;
        g[0].image = null;
        g[1].image = null;
      })()`);
      return `plate <img> (${swapState.img0NatW}px, cover) + Lightbox <img> (contain) + javascript: XSS blocked OK`;
    });

    // ------------------------------------------------------------------
    // 7. Mobile Viewport 390x844
    // ------------------------------------------------------------------
    await test('E2E Mobile', '390x844 mobile viewport: zero horizontal body overflow, readable tabs/caption, single-column detail with poster first', async () => {
      await page.setViewport({ width: 390, height: 844, mobile: true, deviceScaleFactor: 2 });
      await page.navigate(srv.baseUrl);

      await page.waitUntil(`(() => {
        const cap = document.querySelector('[aria-live="polite"]')?.innerText || '';
        return cap.includes('Caderno Digital');
      })()`, { timeoutMs: 5000, label: 'mobile load' });

      const mobileCheck = await page.eval(`(() => {
        const docSw = document.documentElement.scrollWidth;
        const bodySw = document.body.scrollWidth;
        const iw = window.innerWidth;
        const nav = document.querySelector('nav');
        const navRect = nav ? nav.getBoundingClientRect().toJSON() : null;
        const cap = document.querySelector('[aria-live="polite"]');
        const capRect = cap ? cap.getBoundingClientRect().toJSON() : null;
        const cv = document.querySelectorAll('.cv')[1];
        const cvRect = cv ? cv.getBoundingClientRect().toJSON() : null;
        return { docSw, bodySw, iw, navRect, capRect, cvRect };
      })()`);

      assert.ok(mobileCheck.docSw <= mobileCheck.iw, `Horizontal overflow on <html>: scrollWidth=${mobileCheck.docSw} > ${mobileCheck.iw}`);
      assert.ok(mobileCheck.bodySw <= mobileCheck.iw, `Horizontal overflow on <body>: scrollWidth=${mobileCheck.bodySw} > ${mobileCheck.iw}`);
      assert.ok(mobileCheck.navRect && mobileCheck.navRect.height >= 18 && mobileCheck.navRect.top >= 40,
        `Mobile tabs rect invalid: ${JSON.stringify(mobileCheck.navRect)}`);
      assert.ok(mobileCheck.capRect && mobileCheck.capRect.height > 30 && mobileCheck.capRect.bottom <= 844,
        `Mobile caption outside viewport: ${JSON.stringify(mobileCheck.capRect)}`);

      if (SCREENSHOT_DIR) {
        await page.screenshot(path.join(SCREENSHOT_DIR, '04-mobile-initial.png'));
      }

      // Open detail sheet on mobile (via active cover tap/click or open button)
      await page.clickPoint(
        mobileCheck.cvRect.left + mobileCheck.cvRect.width / 2,
        mobileCheck.cvRect.top + mobileCheck.cvRect.height / 2,
      );

      const mobileDetail = await page.waitUntil(`(() => {
        const dialogs = [...document.querySelectorAll('[role="dialog"]')];
        const openDlg = dialogs.find(d => getComputedStyle(d).visibility === 'visible' && !d.hidden);
        if (!openDlg) return false;
        const maskCircles = [...openDlg.querySelectorAll('#ink-mask circle')];
        if (maskCircles.length !== 7 || !maskCircles.every(c => parseFloat(c.getAttribute('r') || '0') >= 715)) return false;

        const posterEl = openDlg.querySelector('#ink-mask')?.closest('svg');
        const headingEl = openDlg.querySelector('h2, h1, .detail-title, .d-title') ||
          [...openDlg.querySelectorAll('*')].find(el => el.children.length === 0 && el.textContent.trim() === 'Caderno Digital');
        const dlgStyle = getComputedStyle(openDlg);
        const scrollContainer = [openDlg, ...openDlg.querySelectorAll('*')].find(el => {
          const s = getComputedStyle(el);
          return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.clientHeight > 200;
        });

        return {
          posterRect: posterEl ? posterEl.getBoundingClientRect().toJSON() : null,
          headingRect: headingEl ? headingEl.getBoundingClientRect().toJSON() : null,
          dlgOverflowY: dlgStyle.overflowY,
          hasScrollContainer: !!scrollContainer,
          scrollWidth: openDlg.scrollWidth,
          clientWidth: openDlg.clientWidth,
        };
      })()`, { timeoutMs: 5000, label: 'mobile detail sheet settled' });

      assert.ok(mobileDetail.posterRect && mobileDetail.headingRect,
        `Could not measure mobile poster/heading rects: ${JSON.stringify(mobileDetail)}`);
      assert.ok(mobileDetail.posterRect.top < mobileDetail.headingRect.top,
        `Mobile detail must show poster FIRST above text: poster.top=${Math.round(mobileDetail.posterRect.top)}, heading.top=${Math.round(mobileDetail.headingRect.top)}`);
      assert.ok(mobileDetail.hasScrollContainer,
        `Mobile detail must be vertically scrollable (overflow-y: auto/scroll), got dialog overflowY=${mobileDetail.dlgOverflowY}`);
      assert.ok(mobileDetail.scrollWidth <= 391,
        `Mobile detail horizontal overflow: scrollWidth=${mobileDetail.scrollWidth}`);

      if (SCREENSHOT_DIR) {
        await page.screenshot(path.join(SCREENSHOT_DIR, '05-mobile-detail.png'));
      }

      // Scroll through the entire mobile dossier & verify zero horizontal overflow, stacked gallery plates & usable Lightbox
      const mobileDossier = await page.eval(`(async () => {
        const dlg = document.getElementById('detail-sheet');
        for (const frac of [0.35, 0.7, 1.0]) {
          dlg.scrollTop = Math.round(dlg.scrollHeight * frac);
          await new Promise(r => setTimeout(r, 150));
        }
        const plates = [...document.querySelectorAll('#detail-dossier .gallery-plate')];
        const rects = plates.map(p => p.getBoundingClientRect().toJSON());
        return {
          scrollWidth: dlg.scrollWidth,
          clientWidth: dlg.clientWidth,
          plateCount: plates.length,
          rects,
        };
      })()`);
      // Wait for all mobile dossier reveal WAAPI animations to settle completely
      await page.waitUntil(`document.getElementById('detail-sheet').getAnimations({ subtree: true }).filter(a => a.playState === 'running').length === 0`, {
        timeoutMs: 3500,
        label: 'mobile dossier reveal animations settled',
      });
      assert.ok(mobileDossier.scrollWidth <= 391,
        `Mobile scrolled dossier horizontal overflow: scrollWidth=${mobileDossier.scrollWidth}`);
      assert.equal(mobileDossier.plateCount, 3, 'Expected 3 gallery plates on mobile');
      assert.ok(
        mobileDossier.rects[1].top >= mobileDossier.rects[0].bottom - 4
        && mobileDossier.rects[2].top >= mobileDossier.rects[1].bottom - 4,
        `Mobile gallery plates must stack in single column: ${JSON.stringify(mobileDossier.rects)}`,
      );

      if (SCREENSHOT_DIR) {
        await page.eval(`(() => {
          const dlg = document.getElementById('detail-sheet');
          const secs = [...document.querySelectorAll('#detail-dossier .dossier-section, #detail-dossier section')];
          if (secs[2]) dlg.scrollTop = Math.max(0, secs[2].offsetTop - 72);
        })()`);
        await new Promise((r) => setTimeout(r, 80));
        await page.waitUntil(`(() => {
          const dlg = document.getElementById('detail-sheet');
          const secs = [...dlg.querySelectorAll('#detail-dossier .dossier-section, #detail-dossier section')];
          const revealed = secs[2] ? secs[2].classList.contains('is-revealed') : true;
          const running = dlg.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length;
          return revealed && running === 0;
        })()`, { timeoutMs: 3000, label: 'mobile architecture section fully revealed before screenshot' });
        await page.screenshot(path.join(SCREENSHOT_DIR, '12-mobile-dossier.png'));
      }

      // Tap gallery plate 0 on mobile -> verify Lightbox opens without horizontal overflow & closes cleanly
      await page.eval(`document.querySelectorAll('#detail-dossier .gallery-plate')[0].click()`);
      const mobileLb = await page.waitUntil(`(() => {
        const lb = document.getElementById('gallery-lightbox');
        if (!lb || getComputedStyle(lb).visibility !== 'visible') return false;
        if (lb.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length > 0) return false;
        return { scrollWidth: lb.scrollWidth, text: lb.innerText };
      })()`, { timeoutMs: 4000, label: 'mobile Lightbox open' });
      assert.ok(mobileLb.scrollWidth <= 391, `Mobile Lightbox horizontal overflow: ${mobileLb.scrollWidth}`);
      assert.ok(/1\s*\/\s*3/.test(mobileLb.text), 'Mobile Lightbox missing 1 / 3 counter');

      await page.pressKey('Escape');
      await page.waitUntil(`getComputedStyle(document.getElementById('gallery-lightbox')).visibility === 'hidden'`, {
        timeoutMs: 3000,
        label: 'mobile Lightbox close',
      });

      return `docSw=${mobileCheck.docSw}px, poster.top=${Math.round(mobileDetail.posterRect.top)} < heading.top=${Math.round(mobileDetail.headingRect.top)}, scrolled dossier sw=${mobileDossier.scrollWidth}px + stacked plates + mobile Lightbox OK`;
    });

    // ------------------------------------------------------------------
    // 8. prefers-reduced-motion: reduce
    // ------------------------------------------------------------------
    await test('E2E Reduced Motion', 'prefers-reduced-motion: reduce settles shelf and reveals ink mask immediately without broken state', async () => {
      await page.setViewport({ width: 1440, height: 900, mobile: false, deviceScaleFactor: 1 });
      await page.send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
      });
      await page.navigate(srv.baseUrl);

      const reduced = await page.eval(`window.matchMedia('(prefers-reduced-motion: reduce)').matches`);
      assert.equal(reduced, true, 'Emulated prefers-reduced-motion: reduce did not take effect');

      // Navigate with ArrowRight -> should jump cleanly to ProjCatálogos
      await page.pressKey('ArrowRight');
      await page.waitUntil(`(() => {
        const obra = new URL(location.href).searchParams.get('obra');
        const cap = document.querySelector('[aria-live="polite"]')?.innerText || '';
        return obra === 'projcatalogos' && cap.includes('ProjCatálogos');
      })()`, { timeoutMs: 1500, label: 'reduced-motion instant ArrowRight' });

      // Open detail with Enter -> ink mask should reach r=720 almost immediately (< 450ms)
      const openStart = performance.now();
      await page.pressKey('Enter');
      const rmDetail = await page.waitUntil(`(() => {
        const dialogs = [...document.querySelectorAll('[role="dialog"]')];
        const openDlg = dialogs.find(d => getComputedStyle(d).visibility === 'visible' && !d.hidden);
        if (!openDlg) return false;
        const radii = [...openDlg.querySelectorAll('#ink-mask circle')].map(c => parseFloat(c.getAttribute('r') || '0'));
        if (radii.length === 7 && radii.every(r => r >= 715)) {
          return { minR: Math.min(...radii) };
        }
        return false;
      })()`, { timeoutMs: 800, intervalMs: 25, label: 'reduced-motion immediate ink reveal' });
      const elapsed = Math.round(performance.now() - openStart);

      // Verify reduced-motion Lightbox opens & closes immediately
      const lbStart = performance.now();
      await page.eval(`document.querySelectorAll('#detail-dossier .gallery-plate')[0].click()`);
      await page.waitUntil(`(() => {
        const lb = document.getElementById('gallery-lightbox');
        return lb && getComputedStyle(lb).visibility === 'visible' && lb.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length === 0;
      })()`, { timeoutMs: 600, intervalMs: 20, label: 'reduced-motion instant Lightbox open' });
      const lbMs = Math.round(performance.now() - lbStart);
      await page.pressKey('Escape');
      await page.waitUntil(`getComputedStyle(document.getElementById('gallery-lightbox')).visibility === 'hidden'`, {
        timeoutMs: 600,
        intervalMs: 20,
        label: 'reduced-motion instant Lightbox close',
      });

      await page.pressKey('Escape');
      await page.waitUntil(`(() => [...document.querySelectorAll('[role="dialog"]')].every(d => getComputedStyle(d).visibility === 'hidden' || d.hidden))()`, {
        timeoutMs: 1000,
        intervalMs: 25,
        label: 'reduced-motion immediate close',
      });

      return `instant ArrowRight + instant ink reveal (r=${Math.round(rmDetail.minR)} in ${elapsed}ms) + instant Lightbox (${lbMs}ms) + instant Escape close`;
    });

    // ------------------------------------------------------------------
    // 9. Zero Console Errors, Zero Uncaught Exceptions, Zero 404s
    // ------------------------------------------------------------------
    await test('E2E Runtime', 'Zero console errors, zero uncaught page exceptions, zero 404/local network failures', async () => {
      assert.equal(consoleErrors.length, 0, `Console errors:\n- ${consoleErrors.join('\n- ')}`);
      assert.equal(pageExceptions.length, 0, `Uncaught page exceptions:\n- ${pageExceptions.join('\n- ')}`);
      assert.equal(http404s.length, 0, `HTTP 404 responses:\n- ${http404s.join('\n- ')}`);
      assert.equal(localFailures.length, 0, `Local asset failures:\n- ${localFailures.join('\n- ')}`);
      return externalNetworkNotes.length
        ? `0 errors, 0 404s (external font offline note: ${externalNetworkNotes.length})`
        : '0 console errors, 0 page errors, 0 404s';
    });
  } finally {
    await cleanup();
    await srv.close();
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log(`Portfolio QA Verification Suite — Target: ${PORTFOLIO_DIR}`);
  await runStaticAudit();

  // Only run live browser suite if required files exist
  const filesReady = results.find((r) => r.name.includes('Required portfolio files'))?.status === 'PASS';
  if (filesReady) {
    await runBrowserAudit();
  } else {
    console.error('\nSkipping browser audit because required portfolio files are missing.');
  }

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`\n=== SUMMARY: ${passed} passed, ${failed} failed (total ${results.length}) ===`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
