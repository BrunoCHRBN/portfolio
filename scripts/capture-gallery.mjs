#!/usr/bin/env node
/**
 * capture-gallery.mjs
 *
 * Reusable Playwright screenshot capture pipeline for Bruno Vinícius's portfolio
 * (`assets/gallery/<project>/<plate>.webp`).
 *
 * Produces studio-grade 1600x1000 (16:10) WebP images (quality 90) using
 * playwright-core + system Chromium (/usr/bin/chromium) + Python Pillow.
 *
 * Usage:
 *   node scripts/capture-gallery.mjs
 *   node scripts/capture-gallery.mjs --only=projcatalogos
 *   node scripts/capture-gallery.mjs --only=projcatalogos,cutsync,caderno
 *   node scripts/capture-gallery.mjs --projcatalogos-dir=/path/to/projcatalogos
 *
 * Safety guarantees:
 *   - Read-only against ../projcatalogos (never writes/modifies files there).
 *   - Cleanly terminates temporary Next.js / Vite dev servers and browser instances on exit.
 *   - Cleans up temporary clone directories (/tmp/caderno-digital-cap) after execution.
 *   - Zorin Copilot (native GTK4/Wayland) and auth-gated CutSync Cloud are intentionally skipped
 *     so their bespoke editorial wireframes remain active.
 */

import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORTFOLIO_ROOT = path.resolve(__dirname, "..");
const GALLERY_ROOT = path.join(PORTFOLIO_ROOT, "assets", "gallery");

const OUTPUT_WIDTH = 1600;
const OUTPUT_HEIGHT = 1000;
const WEBP_QUALITY = 90;

const DEFAULT_CHROMIUM_PATH = process.env.CHROMIUM_PATH || "/usr/bin/chromium";
const DEFAULT_PROJCATALOGOS_DIR = path.resolve(PORTFOLIO_ROOT, "../projcatalogos");
const DEFAULT_CADERNO_REPO = "https://github.com/BrunoCHRBN/caderno-digital";
const PROJCATALOGOS_TEMP_DIR = "/tmp/projcatalogos-cap";
const CADERNO_TEMP_DIR = "/tmp/caderno-digital-cap";

const ALL_TARGETS = ["projcatalogos", "cutsync", "caderno"];

// Track active child process groups and temp paths for clean shutdown
const activeChildGroups = new Set();
let activeBrowser = null;
let keepTemp = false;

function parseArgs(argv) {
  const opts = {
    only: ALL_TARGETS,
    projcatalogosDir: DEFAULT_PROJCATALOGOS_DIR,
    cadernoRepo: DEFAULT_CADERNO_REPO,
    chromiumPath: DEFAULT_CHROMIUM_PATH,
    keepTemp: false,
    help: false,
  };

  for (const arg of argv.slice(2)) {
    if (arg === "--help" || arg === "-h") {
      opts.help = true;
    } else if (arg.startsWith("--only=")) {
      const list = arg
        .slice("--only=".length)
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      const invalid = list.filter((t) => !ALL_TARGETS.includes(t));
      if (invalid.length > 0) {
        throw new Error(
          `Unknown target(s): ${invalid.join(", ")}. Valid targets: ${ALL_TARGETS.join(", ")}`
        );
      }
      opts.only = list.length > 0 ? list : ALL_TARGETS;
    } else if (arg.startsWith("--projcatalogos-dir=")) {
      opts.projcatalogosDir = path.resolve(arg.slice("--projcatalogos-dir=".length));
    } else if (arg.startsWith("--caderno-repo=")) {
      opts.cadernoRepo = arg.slice("--caderno-repo=".length);
    } else if (arg.startsWith("--chromium=")) {
      opts.chromiumPath = arg.slice("--chromium=".length);
    } else if (arg === "--keep-temp") {
      opts.keepTemp = true;
    } else {
      throw new Error(`Unrecognized argument: ${arg}`);
    }
  }
  return opts;
}

function printHelp() {
  console.log(`
Portfolio Gallery Capture Pipeline (1600x1000 WebP @ q${WEBP_QUALITY})

Usage:
  node scripts/capture-gallery.mjs [options]

Options:
  --only=<list>               Comma-separated targets: projcatalogos,cutsync,caderno (default: all)
  --projcatalogos-dir=<path>  Read-only path to ProjCatálogos repo (default: ${DEFAULT_PROJCATALOGOS_DIR})
  --caderno-repo=<url>        Git URL for Caderno Digital (default: ${DEFAULT_CADERNO_REPO})
  --chromium=<path>           Path to Chromium binary (default: ${DEFAULT_CHROMIUM_PATH})
  --keep-temp                 Keep temporary staging/clone dirs for debugging
  -h, --help                  Show this help message
`);
}

function log(scope, message) {
  console.log(`[${scope}] ${message}`);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function parseDotEnv(filePath) {
  const result = {};
  if (!fs.existsSync(filePath)) return result;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    result[key] = val;
  }
  return result;
}

function killProcessGroup(pid) {
  if (!pid) return;
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    // Already exited
  }
  setTimeout(() => {
    try {
      process.kill(-pid, 0);
      process.kill(-pid, "SIGKILL");
    } catch {
      // Already exited
    }
  }, 1500).unref();
  activeChildGroups.delete(pid);
}

function waitForHttpReady(url, timeoutMs = 45000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
          resolve(res.statusCode);
        } else if (Date.now() - start > timeoutMs) {
          reject(new Error(`Server at ${url} returned HTTP ${res.statusCode}`));
        } else {
          setTimeout(attempt, 400);
        }
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url} after ${timeoutMs}ms`));
        } else {
          setTimeout(attempt, 400);
        }
      });
      req.setTimeout(3000, () => {
        req.destroy();
      });
    };
    attempt();
  });
}

function spawnDetachedServer(cmd, args, cwd, envOverrides = {}) {
  const child = spawn(cmd, args, {
    cwd,
    env: { ...process.env, ...envOverrides },
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const logs = [];
  const pushLog = (chunk) => {
    logs.push(chunk.toString("utf8"));
    if (logs.length > 40) logs.shift();
  };
  child.stdout?.on("data", pushLog);
  child.stderr?.on("data", pushLog);

  if (child.pid) {
    activeChildGroups.add(child.pid);
  }

  return {
    child,
    getLogs: () => logs.join(""),
    stop: async () => {
      if (!child.pid) return;
      const pid = child.pid;
      killProcessGroup(pid);
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 2000);
        child.once("exit", () => {
          clearTimeout(timer);
          resolve();
        });
      });
    },
  };
}

/**
 * Convert a raw PNG screenshot into an exact 1600x1000 WebP (q90) using Python Pillow
 * with high-quality Lanczos resampling.
 */
function convertPngToWebp(inputPngPath, outputWebpPath) {
  ensureDir(path.dirname(outputWebpPath));
  const pyScript = `
import sys
from PIL import Image

src, dst, w, h, q = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
with Image.open(src) as im:
    im = im.convert("RGB")
    if im.size != (w, h):
        im = im.resize((w, h), Image.Resampling.LANCZOS)
    im.save(dst, format="WEBP", quality=q, method=6)
    print(f"{dst} ({w}x{h})")
`;
  execFileSync(
    "python3",
    [
      "-c",
      pyScript,
      inputPngPath,
      outputWebpPath,
      String(OUTPUT_WIDTH),
      String(OUTPUT_HEIGHT),
      String(WEBP_QUALITY),
    ],
    { stdio: "pipe" }
  );
  const stat = fs.statSync(outputWebpPath);
  return {
    path: outputWebpPath,
    width: OUTPUT_WIDTH,
    height: OUTPUT_HEIGHT,
    bytes: stat.size,
  };
}

/**
 * Compose two mobile viewport PNGs side-by-side onto an editorial archival paper
 * backdrop (#EAE6DE, 1600x1000) with crisp 1px ink borders and soft paper drop shadows.
 */
function composeMobileDuoWebp(leftPngPath, rightPngPath, outputWebpPath) {
  ensureDir(path.dirname(outputWebpPath));
  const pyScript = `
import sys
from PIL import Image, ImageDraw, ImageFilter

left_path, right_path, dst, W, H, q = (
    sys.argv[1],
    sys.argv[2],
    sys.argv[3],
    int(sys.argv[4]),
    int(sys.argv[5]),
    int(sys.argv[6]),
)

# Editorial archival paper backdrop (#EAE6DE)
canvas = Image.new("RGBA", (W, H), (234, 230, 222, 255))

# Subtle architectural hairline frame inset on archival paper
draw = ImageDraw.Draw(canvas)
draw.rectangle([28, 28, W - 29, H - 29], outline=(20, 20, 20, 34), width=1)

# Subtle fine dot grid (matching portfolio editorial print register)
for gy in range(56, H - 40, 32):
    for gx in range(56, W - 40, 32):
        canvas.putpixel((gx, gy), (20, 20, 20, 22))

target_h = 844
gap = 96

def load_scaled(path):
    with Image.open(path) as im:
        im = im.convert("RGBA")
        aspect = im.width / im.height
        tw = int(round(target_h * aspect))
        return im.resize((tw, target_h), Image.Resampling.LANCZOS)

left_im = load_scaled(left_path)
right_im = load_scaled(right_path)

total_w = left_im.width + gap + right_im.width
start_x = (W - total_w) // 2
top_y = (H - target_h) // 2

def place_plate(base, plate, x, y):
    pw, ph = plate.size
    # Soft diffused paper drop shadow (zero neon, zero cheesy phone bezels)
    pad = 44
    shadow = Image.new("RGBA", (pw + pad * 2, ph + pad * 2), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.rectangle([pad, pad, pad + pw - 1, pad + ph - 1], fill=(20, 20, 20, 42))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=18))
    base.alpha_composite(shadow, (x - pad, y - pad + 14))

    # Subtle secondary crisp contact shadow
    contact = Image.new("RGBA", (pw + 12, ph + 12), (0, 0, 0, 0))
    cdraw = ImageDraw.Draw(contact)
    cdraw.rectangle([6, 6, 6 + pw - 1, 6 + ph - 1], fill=(20, 20, 20, 26))
    contact = contact.filter(ImageFilter.GaussianBlur(radius=4))
    base.alpha_composite(contact, (x - 6, y - 6 + 4))

    # Paste screen capture cleanly
    base.alpha_composite(plate, (x, y))

    # Crisp 1px editorial ink border around the screenshot edge
    bdraw = ImageDraw.Draw(base)
    bdraw.rectangle([x, y, x + pw - 1, y + ph - 1], outline=(20, 20, 20, 72), width=1)

place_plate(canvas, left_im, start_x, top_y)
place_plate(canvas, right_im, start_x + left_im.width + gap, top_y)

canvas.convert("RGB").save(dst, format="WEBP", quality=q, method=6)
print(f"{dst} ({W}x{H})")
`;
  execFileSync(
    "python3",
    [
      "-c",
      pyScript,
      leftPngPath,
      rightPngPath,
      outputWebpPath,
      String(OUTPUT_WIDTH),
      String(OUTPUT_HEIGHT),
      String(WEBP_QUALITY),
    ],
    { stdio: "pipe" }
  );
  const stat = fs.statSync(outputWebpPath);
  return {
    path: outputWebpPath,
    width: OUTPUT_WIDTH,
    height: OUTPUT_HEIGHT,
    bytes: stat.size,
  };
}

async function waitForStableRender(page, extraMs = 600) {
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    const imgs = [...document.querySelectorAll("img")];
    await Promise.all(
      imgs.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((res) => {
          img.addEventListener("load", res, { once: true });
          img.addEventListener("error", res, { once: true });
          setTimeout(res, 3000);
        });
      })
    );
  });
  await page.waitForTimeout(extraMs);
}

function prepareProjCatalogosRunDir(projcatalogosDir) {
  const prodBuildId = path.join(projcatalogosDir, ".next", "BUILD_ID");
  if (fs.existsSync(prodBuildId)) {
    return { runDir: projcatalogosDir, isTempMirror: false };
  }

  const cachedTempBuild = path.join(PROJCATALOGOS_TEMP_DIR, ".next", "BUILD_ID");
  if (keepTemp && fs.existsSync(cachedTempBuild)) {
    log("projcatalogos", `Reusing cached temp production build at ${PROJCATALOGOS_TEMP_DIR}`);
    return { runDir: PROJCATALOGOS_TEMP_DIR, isTempMirror: true };
  }

  log(
    "projcatalogos",
    `No production BUILD_ID in ${projcatalogosDir}/.next; creating isolated temp build mirror at ${PROJCATALOGOS_TEMP_DIR} (source repo stays 100% read-only)...`
  );
  fs.rmSync(PROJCATALOGOS_TEMP_DIR, { recursive: true, force: true });
  ensureDir(PROJCATALOGOS_TEMP_DIR);

  const itemsToCopy = [
    "src",
    "public",
    "storage",
    ".env",
    "package.json",
    "next.config.ts",
    "postcss.config.mjs",
    "tsconfig.json",
    "next-env.d.ts",
  ];

  for (const rel of itemsToCopy) {
    const srcPath = path.join(projcatalogosDir, rel);
    if (!fs.existsSync(srcPath)) continue;
    fs.cpSync(srcPath, path.join(PROJCATALOGOS_TEMP_DIR, rel), { recursive: true });
  }

  // Symlink node_modules read-only to avoid reinstalling dependencies
  fs.symlinkSync(
    path.join(projcatalogosDir, "node_modules"),
    path.join(PROJCATALOGOS_TEMP_DIR, "node_modules"),
    "dir"
  );

  const nextBin = path.join(PROJCATALOGOS_TEMP_DIR, "node_modules", ".bin", "next");
  log("projcatalogos", "Building clean production bundle inside temp mirror (no dev overlays)...");
  execFileSync(nextBin, ["build"], {
    cwd: PROJCATALOGOS_TEMP_DIR,
    env: { ...process.env, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1" },
    stdio: "pipe",
  });

  return { runDir: PROJCATALOGOS_TEMP_DIR, isTempMirror: true };
}

/* ==========================================================================
   1. PROJCATÁLOGOS CAPTURE (Read-only Next.js production server on :3099)
   ========================================================================== */
async function captureProjCatalogos(browser, stagingDir, projcatalogosDir) {
  log("projcatalogos", `Reading .env from ${projcatalogosDir} (read-only)`);
  const envVars = parseDotEnv(path.join(projcatalogosDir, ".env"));
  const adminEmail = envVars.ADMIN_SEED_EMAIL;
  const adminPassword = envVars.ADMIN_SEED_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error(`Missing ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD in ${projcatalogosDir}/.env`);
  }

  const { runDir, isTempMirror } = prepareProjCatalogosRunDir(projcatalogosDir);
  const nextBin = path.join(runDir, "node_modules", ".bin", "next");

  const port = 3099;
  const baseUrl = `http://127.0.0.1:${port}`;
  log("projcatalogos", `Starting temporary Next.js production server on ${baseUrl}...`);
  const server = spawnDetachedServer(
    nextBin,
    ["start", "-p", String(port), "-H", "127.0.0.1"],
    runDir,
    {
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
    }
  );

  const saved = [];

  try {
    try {
      await waitForHttpReady(baseUrl, 45000);
    } catch (err) {
      console.error("[projcatalogos] Server output:\n" + server.getLogs());
      throw err;
    }
    log("projcatalogos", "Server ready (HTTP 200).");

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
    });

    const page = await context.newPage();

    // 1A. Storefront Catalog — Drogaria Vila Saúde (header, smart search, categories & featured products)
    log("projcatalogos", "Capturing storefront-catalog.webp...");
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle", timeout: 30000 });
    await waitForStableRender(page, 800);

    // Scroll cleanly so sticky header + smart search + category cards + featured product grid all frame together
    const scrollTargetY = await page.evaluate(() => {
      const catHeading = [...document.querySelectorAll("h2")].find((el) =>
        /navegue por categoria/i.test(el.textContent || "")
      );
      if (catHeading) {
        const header = document.querySelector("header");
        const headerH = header ? header.getBoundingClientRect().height : 96;
        return Math.max(0, Math.round(catHeading.getBoundingClientRect().top + window.scrollY - headerH - 22));
      }
      return 0;
    });
    if (scrollTargetY > 0) {
      await page.evaluate((y) => window.scrollTo(0, y), scrollTargetY);
      await page.waitForTimeout(450);
    }

    const storefrontRaw = path.join(stagingDir, "projcatalogos-storefront.png");
    await page.screenshot({ path: storefrontRaw, fullPage: false });
    saved.push(
      convertPngToWebp(
        storefrontRaw,
        path.join(GALLERY_ROOT, "projcatalogos", "storefront-catalog.webp")
      )
    );

    // 1B. WhatsApp Checkout — Add 3 real seeded products (< R$ 80 free-shipping threshold so delivery fee shows!)
    log("projcatalogos", "Adding 3 realistic products to cart...");
    await page.goto(`${baseUrl}/categorias`, { waitUntil: "networkidle", timeout: 30000 });
    await waitForStableRender(page, 600);

    // Add Dipirona (R$ 7,90), Antigripal Dia & Noite (R$ 24,90), and Vitamina C 1g (R$ 18,90) -> Subtotal R$ 51,70
    const addedCount = await page.evaluate(async () => {
      const preferredNames = [
        "dipirona monoidratada",
        "antigripal dia",
        "vitamina c",
        "paracetamol",
      ];
      const articles = [...document.querySelectorAll("article")];
      const targets = [];
      for (const kw of preferredNames) {
        const art = articles.find((a) => (a.textContent || "").toLowerCase().includes(kw));
        if (!art) continue;
        const btn = [...art.querySelectorAll("button")].find((b) => {
          const label = (b.getAttribute("aria-label") || b.textContent || "").toLowerCase();
          return !b.disabled && (label.includes("adicionar") || label.includes("sacola") || label.includes("carrinho"));
        });
        if (btn && targets.length < 3) targets.push(btn);
      }
      let count = 0;
      for (const btn of targets) {
        btn.click();
        count += 1;
        await new Promise((r) => setTimeout(r, 180));
      }
      return count;
    });
    log("projcatalogos", `Added ${addedCount} products via quick-add.`);
    await page.waitForTimeout(500);

    // Navigate to /checkout and fill realistic customer + neighborhood + PIX (DO NOT SUBMIT — keeps DB clean!)
    log("projcatalogos", "Capturing whatsapp-checkout.webp on /checkout...");
    await page.goto(`${baseUrl}/checkout`, { waitUntil: "networkidle", timeout: 30000 });
    await waitForStableRender(page, 700);

    // Fill realistic checkout details so the delivery fee & WhatsApp checkout summary shine
    const nameInput = page.locator('input[name="customerName"], input#checkout-name, input[placeholder*="nome" i]').first();
    if (await nameInput.count()) {
      await nameInput.fill("Ana Paula Oliveira");
    }
    const phoneInput = page.locator('input[name="customerPhone"], input#checkout-phone, input[type="tel"], input[placeholder*="11" i]').first();
    if (await phoneInput.count()) {
      await phoneInput.fill("11984321190");
    }
    const zoneSelect = page.locator("select").first();
    if (await zoneSelect.count()) {
      const options = await zoneSelect.locator("option").allTextContents();
      const preferredIdx = options.findIndex((t) => /jardim europa/i.test(t));
      if (preferredIdx >= 0) {
        await zoneSelect.selectOption({ index: preferredIdx });
      }
    }
    const addressInput = page.locator('input[name="deliveryAddress"], input#checkout-address, input[placeholder*="rua" i]').first();
    if (await addressInput.count()) {
      await addressInput.fill("Rua das Palmeiras, 280");
    }
    const compInput = page.locator('input[name="deliveryComplement"], input#checkout-complement, input[placeholder*="apto" i], input[placeholder*="bloco" i]').first();
    if (await compInput.count()) {
      await compInput.fill("Apto 42 — Bloco B");
    }
    await page.waitForTimeout(450);

    const checkoutRaw = path.join(stagingDir, "projcatalogos-checkout.png");
    await page.screenshot({ path: checkoutRaw, fullPage: false });
    saved.push(
      convertPngToWebp(
        checkoutRaw,
        path.join(GALLERY_ROOT, "projcatalogos", "whatsapp-checkout.webp")
      )
    );

    // 1C. Back-office Admin — Log in as seeded Owner and capture operational dashboard
    log("projcatalogos", "Logging into /admin/login with seeded owner account...");
    await page.goto(`${baseUrl}/admin/login`, { waitUntil: "networkidle", timeout: 30000 });
    await waitForStableRender(page, 400);

    await page.fill("#admin-login-email", adminEmail);
    await page.fill("#admin-login-password", adminPassword);
    await Promise.all([
      page.waitForURL(/\/admin\/?$/, { timeout: 20000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForLoadState("networkidle");
    await waitForStableRender(page, 700);

    // Capture /admin/produtos (rich 18-product manager with prices, SKUs, stock badges, categories)
    // AND inspect /admin dashboard in staging for comparison if needed
    const adminOverviewRaw = path.join(stagingDir, "projcatalogos-admin-overview.png");
    await page.screenshot({ path: adminOverviewRaw, fullPage: false });

    await page.goto(`${baseUrl}/admin/produtos`, { waitUntil: "networkidle", timeout: 30000 });
    await waitForStableRender(page, 700);
    const adminProductsRaw = path.join(stagingDir, "projcatalogos-admin-products.png");
    await page.screenshot({ path: adminProductsRaw, fullPage: false });

    // Use /admin overview if recent orders exist, otherwise /admin/produtos; actually let's check both
    // Note: /admin already has 1 order, KPIs, Low-stock alerts, and Store status — super informative!
    const hasOrders = await page.evaluate(async () => {
      try {
        const r = await fetch("/api/admin/dashboard");
        const j = await r.json();
        return (j?.data?.recentOrders?.length ?? 0) > 0;
      } catch {
        return false;
      }
    });
    const chosenAdminRaw = hasOrders ? adminOverviewRaw : adminProductsRaw;
    log(
      "projcatalogos",
      `Capturing backoffice-admin.webp from ${hasOrders ? "/admin (dashboard with live order & low-stock alerts)" : "/admin/produtos"}`
    );

    saved.push(
      convertPngToWebp(
        chosenAdminRaw,
        path.join(GALLERY_ROOT, "projcatalogos", "backoffice-admin.webp")
      )
    );

    await context.close();
  } finally {
    log("projcatalogos", "Stopping temporary Next.js server...");
    await server.stop();
    if (isTempMirror && !keepTemp) {
      log("projcatalogos", `Cleaning up ${PROJCATALOGOS_TEMP_DIR}...`);
      fs.rmSync(PROJCATALOGOS_TEMP_DIR, { recursive: true, force: true });
    }
  }

  return saved;
}

/* ==========================================================================
   2. CUTSYNC CAPTURE (Live https://cut-sync.vercel.app)
   ========================================================================== */
async function captureCutSync(browser, stagingDir) {
  const baseUrl = "https://cut-sync.vercel.app";
  const saved = [];

  // 2A. Desktop Public Booking Portal (1440x900 @2x -> 1600x1000 WebP)
  // Captures the live 4-step public booking flow (/barbearia-do-bruno/booking)
  log("cutsync", "Capturing public-booking.webp (desktop live booking flow)...");
  const desktopCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  });
  const page = await desktopCtx.newPage();

  try {
    await page.goto(`${baseUrl}/barbearia-do-bruno/booking`, {
      waitUntil: "networkidle",
      timeout: 35000,
    });
    await waitForStableRender(page, 1000);

    const desktopRaw = path.join(stagingDir, "cutsync-public-booking.png");
    await page.screenshot({ path: desktopRaw, fullPage: false });
    saved.push(
      convertPngToWebp(
        desktopRaw,
        path.join(GALLERY_ROOT, "cutsync", "public-booking.webp")
      )
    );
  } finally {
    await desktopCtx.close();
  }

  // 2B. Mobile Duo Composite (2 distinct crisp 390x844 @2x live views on #EAE6DE archival paper)
  // Left: Public Discovery Marketplace Landing (/)
  // Right: Live Booking Flow Step 2 — Specialist Selection (/barbearia-do-bruno/booking)
  log("cutsync", "Capturing mobile-duo.webp (2x 390x844 @2x distinct live views on #EAE6DE paper)...");
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  });
  const mPage = await mobileCtx.newPage();

  try {
    // Mobile Screen 1: CutSync Public Discovery Landing (search, service chips & live storefront card)
    await mPage.goto(`${baseUrl}/`, {
      waitUntil: "networkidle",
      timeout: 35000,
    });
    await waitForStableRender(mPage, 1000);
    const mobileLeftRaw = path.join(stagingDir, "cutsync-mobile-left.png");
    await mPage.screenshot({ path: mobileLeftRaw, fullPage: false });

    // Mobile Screen 2: Live 4-step booking flow advanced to Step 2 (Specialist Selection)
    await mPage.goto(`${baseUrl}/barbearia-do-bruno/booking`, {
      waitUntil: "networkidle",
      timeout: 35000,
    });
    await waitForStableRender(mPage, 900);

    const mService = mPage.getByText("Cabelo Navalhado + Barba").first();
    if (await mService.count()) {
      await mService.click();
      await mPage.waitForTimeout(1100);
    }
    await waitForStableRender(mPage, 600);
    const mobileRightRaw = path.join(stagingDir, "cutsync-mobile-right.png");
    await mPage.screenshot({ path: mobileRightRaw, fullPage: false });

    saved.push(
      composeMobileDuoWebp(
        mobileLeftRaw,
        mobileRightRaw,
        path.join(GALLERY_ROOT, "cutsync", "mobile-duo.webp")
      )
    );
  } finally {
    await mobileCtx.close();
  }

  log(
    "cutsync",
    "Skipping governance-cloud.webp (CutSync Cloud is private/auth-gated; keeping bespoke editorial wireframe)."
  );

  return saved;
}

/* ==========================================================================
   3. CADERNO DIGITAL CAPTURE (Temp Vite server on :5199 + real stylus input)
   ========================================================================== */

/**
 * Dispatch realistic stylus PointerEvents directly on the Caderno Digital overlay canvas.
 * Supports optional draw-and-hold (holdMs >= 380) to trigger the app's genuine
 * shapeRecognition.ts engine (snapping lines, circles, triangles, rectangles).
 */
async function drawStylusStroke(page, worldPoints, options = {}) {
  const { holdMs = 0, pointerId = 1 } = options;

  // Map A4 world coordinates (1240 x 1754) to live overlay canvas client coordinates
  const clientPoints = await page.evaluate((pts) => {
    const canvases = [...document.querySelectorAll("canvas")];
    const overlay = canvases[canvases.length - 1];
    if (!overlay) throw new Error("Overlay canvas not found");
    const rect = overlay.getBoundingClientRect();
    const scaleX = rect.width / 1240;
    const scaleY = rect.height / 1754;
    return pts.map((p) => ({
      x: rect.left + p.x * scaleX,
      y: rect.top + p.y * scaleY,
      pressure: p.pressure ?? 0.55,
    }));
  }, worldPoints);

  if (clientPoints.length < 2) return;

  // Dispatch pointerdown + interpolated pointermoves on the overlay canvas
  await page.evaluate(
    async ({ pts, pid }) => {
      const canvases = [...document.querySelectorAll("canvas")];
      const overlay = canvases[canvases.length - 1];
      if (!overlay) throw new Error("Overlay canvas not found");

      const fire = (type, pt, buttons) => {
        const evt = new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: pid,
          pointerType: "pen",
          isPrimary: true,
          clientX: pt.x,
          clientY: pt.y,
          pressure: pt.pressure,
          buttons,
          button: type === "pointerdown" ? 0 : -1,
        });
        overlay.dispatchEvent(evt);
      };

      fire("pointerdown", pts[0], 1);
      for (let i = 1; i < pts.length; i++) {
        fire("pointermove", pts[i], 1);
      }
    },
    { pts: clientPoints, pid: pointerId }
  );

  // Hold stylus still at the endpoint to trigger genuine autoShapeDetection (350ms threshold)
  if (holdMs > 0) {
    await page.waitForTimeout(holdMs);
  }

  // Dispatch pointerup to commit stroke to base canvas & Dexie IndexedDB
  await page.evaluate(
    ({ lastPt, pid }) => {
      const canvases = [...document.querySelectorAll("canvas")];
      const overlay = canvases[canvases.length - 1];
      if (!overlay) return;
      const evt = new PointerEvent("pointerup", {
        bubbles: true,
        cancelable: true,
        pointerId: pid,
        pointerType: "pen",
        isPrimary: true,
        clientX: lastPt.x,
        clientY: lastPt.y,
        pressure: 0,
        buttons: 0,
        button: 0,
      });
      overlay.dispatchEvent(evt);
    },
    { lastPt: clientPoints[clientPoints.length - 1], pid: pointerId }
  );

  await page.waitForTimeout(60);
}

/**
 * Generate smooth pressure-tapered points for a straight line (with slight human tremor
 * so the app's shapeRecognition snaps it cleanly on draw-and-hold!).
 */
function makeLinePts(x0, y0, x1, y1, steps = 22, jitter = 1.6) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const wave = Math.sin(t * Math.PI * 2) * jitter;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    pts.push({
      x: x0 + dx * t + nx * wave,
      y: y0 + dy * t + ny * wave,
      pressure: 0.42 + 0.25 * Math.sin(t * Math.PI),
    });
  }
  return pts;
}

/**
 * Generate a smooth circle path for stylus rendering.
 */
function makeCirclePts(cx, cy, r, steps = 60) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    const wobble = Math.sin(theta * 2) * 0.6;
    pts.push({
      x: cx + Math.cos(theta) * (r + wobble),
      y: cy + Math.sin(theta) * (r - wobble * 0.4),
      pressure: 0.52 + 0.14 * Math.sin((i / steps) * Math.PI),
    });
  }
  return pts;
}

/**
 * Simple clean geometric handwriting strokes for short math labels (f(x), x, y, R, etc.)
 * mapped in A4 world coordinates (each glyph normalized in [0..1] x [0..1]).
 */
const GLYPHS = {
  C: [[[0.85, 0.15], [0.5, 0.03], [0.18, 0.2], [0.12, 0.52], [0.22, 0.85], [0.55, 0.96], [0.88, 0.84]]],
  A: [[[0.1, 0.96], [0.5, 0.06], [0.9, 0.96]], [[0.25, 0.62], [0.75, 0.62]]],
  L: [[[0.2, 0.06], [0.2, 0.94], [0.85, 0.94]]],
  U: [[[0.18, 0.08], [0.18, 0.72], [0.35, 0.94], [0.65, 0.94], [0.82, 0.72], [0.82, 0.08]]],
  O: [[[0.5, 0.05], [0.16, 0.22], [0.12, 0.55], [0.22, 0.86], [0.5, 0.96], [0.8, 0.84], [0.88, 0.5], [0.78, 0.18], [0.5, 0.05]]],
  I: [[[0.5, 0.08], [0.5, 0.94]]],
  D: [[[0.2, 0.06], [0.2, 0.94]], [[0.2, 0.06], [0.65, 0.12], [0.86, 0.48], [0.65, 0.88], [0.2, 0.94]]],
  E: [[[0.82, 0.08], [0.2, 0.08], [0.2, 0.94], [0.84, 0.94]], [[0.2, 0.5], [0.72, 0.5]]],
  R: [[[0.2, 0.94], [0.2, 0.08], [0.68, 0.08], [0.82, 0.28], [0.68, 0.5], [0.2, 0.5]], [[0.52, 0.5], [0.84, 0.94]]],
  V: [[[0.15, 0.08], [0.5, 0.94], [0.85, 0.08]]],
  S: [[[0.82, 0.18], [0.5, 0.05], [0.18, 0.2], [0.22, 0.44], [0.76, 0.58], [0.82, 0.82], [0.5, 0.96], [0.16, 0.84]]],
  T: [[[0.1, 0.08], [0.9, 0.08]], [[0.5, 0.08], [0.5, 0.94]]],
  G: [[[0.84, 0.18], [0.5, 0.05], [0.18, 0.24], [0.14, 0.58], [0.26, 0.88], [0.58, 0.95], [0.84, 0.82], [0.84, 0.54], [0.54, 0.54]]],
  N: [[[0.18, 0.94], [0.18, 0.08], [0.82, 0.94], [0.82, 0.08]]],
  F: [[[0.82, 0.08], [0.22, 0.08], [0.22, 0.94]], [[0.22, 0.48], [0.7, 0.48]]],
  X: [[[0.18, 0.14], [0.82, 0.92]], [[0.82, 0.14], [0.18, 0.92]]],
  Y: [[[0.16, 0.1], [0.5, 0.52], [0.84, 0.1]], [[0.5, 0.52], [0.5, 0.94]]],
  M: [[[0.14, 0.94], [0.14, 0.08], [0.5, 0.58], [0.86, 0.08], [0.86, 0.94]]],
  P: [[[0.2, 0.94], [0.2, 0.08], [0.68, 0.08], [0.82, 0.28], [0.68, 0.52], [0.2, 0.52]]],
  H: [[[0.2, 0.08], [0.2, 0.94]], [[0.8, 0.08], [0.8, 0.94]], [[0.2, 0.5], [0.8, 0.5]]],
  B: [[[0.2, 0.08], [0.2, 0.94]], [[0.2, 0.08], [0.68, 0.12], [0.76, 0.3], [0.62, 0.48], [0.2, 0.48]], [[0.2, 0.48], [0.72, 0.52], [0.82, 0.72], [0.68, 0.94], [0.2, 0.94]]],
  "(": [[[0.66, 0.04], [0.38, 0.28], [0.34, 0.52], [0.42, 0.78], [0.66, 0.98]]],
  ")": [[[0.34, 0.04], [0.62, 0.28], [0.66, 0.52], [0.58, 0.78], [0.34, 0.98]]],
  "=": [[[0.16, 0.38], [0.84, 0.38]], [[0.16, 0.64], [0.84, 0.64]]],
  "+": [[[0.5, 0.2], [0.5, 0.8]], [[0.18, 0.5], [0.82, 0.5]]],
  "-": [[[0.18, 0.52], [0.82, 0.52]]],
  "2": [[[0.2, 0.26], [0.46, 0.08], [0.76, 0.18], [0.8, 0.4], [0.2, 0.92], [0.84, 0.92]]],
  "1": [[[0.32, 0.24], [0.52, 0.08], [0.52, 0.94]], [[0.3, 0.94], [0.74, 0.94]]],
  "0": [[[0.5, 0.08], [0.2, 0.28], [0.2, 0.72], [0.5, 0.94], [0.8, 0.72], [0.8, 0.28], [0.5, 0.08]]],
  "'": [[[0.5, 0.04], [0.42, 0.3]]],
  "²": [[[0.28, 0.14], [0.52, 0.02], [0.72, 0.1], [0.7, 0.24], [0.28, 0.44], [0.76, 0.44]]],
  "Á": [[[0.1, 0.96], [0.5, 0.12], [0.9, 0.96]], [[0.25, 0.64], [0.75, 0.64]], [[0.45, 0.04], [0.66, -0.1]]],
  "É": [[[0.82, 0.14], [0.2, 0.14], [0.2, 0.94], [0.84, 0.94]], [[0.2, 0.52], [0.72, 0.52]], [[0.45, 0.04], [0.66, -0.1]]],
  ":": [[[0.48, 0.34], [0.52, 0.38]], [[0.48, 0.74], [0.52, 0.78]]],
  ".": [[[0.46, 0.86], [0.52, 0.92]]],
};

function interpolatePolyline(rawPts, subdiv = 5) {
  const out = [];
  for (let i = 0; i < rawPts.length - 1; i++) {
    const a = rawPts[i];
    const b = rawPts[i + 1];
    for (let s = 0; s < subdiv; s++) {
      const t = s / subdiv;
      out.push({
        x: a[0] + (b[0] - a[0]) * t,
        y: a[1] + (b[1] - a[1]) * t,
        pressure: 0.45 + 0.25 * Math.sin(t * Math.PI),
      });
    }
  }
  const last = rawPts[rawPts.length - 1];
  out.push({ x: last[0], y: last[1], pressure: 0.35 });
  return out;
}

async function writeHandwrittenText(page, text, startX, startY, charW, charH, spacing = 1.18) {
  let cursorX = startX;
  for (const ch of text.toUpperCase()) {
    if (ch === " ") {
      cursorX += charW * 0.72;
      continue;
    }
    const strokes = GLYPHS[ch];
    if (strokes) {
      for (const stroke of strokes) {
        const mapped = stroke.map(([nx, ny]) => [
          cursorX + nx * charW + (ny - 0.5) * -charW * 0.08, // subtle natural italic slant
          startY + ny * charH,
        ]);
        const pts = interpolatePolyline(mapped, 4);
        await drawStylusStroke(page, pts, { holdMs: 0 });
      }
    }
    cursorX += charW * spacing;
  }
}

async function selectToolbarColor(page, hex) {
  // Toolbar renders circular buttons with inline style backgroundColor
  await page.evaluate((targetHex) => {
    const norm = targetHex.toLowerCase();
    const btns = [...document.querySelectorAll("button")];
    const match = btns.find((b) => {
      const bg = (b.style.backgroundColor || "").toLowerCase();
      if (!bg) return false;
      const tmp = document.createElement("div");
      tmp.style.color = norm;
      document.body.appendChild(tmp);
      const expected = getComputedStyle(tmp).color;
      tmp.remove();
      return getComputedStyle(b).backgroundColor === expected;
    });
    if (match) match.click();
  }, hex);
  await page.waitForTimeout(80);
}

async function captureCadernoDigital(browser, stagingDir, cadernoRepo) {
  // 1. Prepare temporary clone & dependencies
  if (!fs.existsSync(path.join(CADERNO_TEMP_DIR, "package.json"))) {
    log("caderno", `Cloning ${cadernoRepo} into ${CADERNO_TEMP_DIR}...`);
    fs.rmSync(CADERNO_TEMP_DIR, { recursive: true, force: true });
    execFileSync("git", ["clone", "--depth", "1", cadernoRepo, CADERNO_TEMP_DIR], {
      stdio: "pipe",
    });
  } else {
    log("caderno", `Using temporary checkout at ${CADERNO_TEMP_DIR}`);
  }

  if (!fs.existsSync(path.join(CADERNO_TEMP_DIR, "node_modules", "vite"))) {
    log("caderno", "Installing npm dependencies in temporary checkout...");
    execFileSync("npm", ["install", "--no-audit", "--no-fund"], {
      cwd: CADERNO_TEMP_DIR,
      stdio: "pipe",
    });
  }
  const esbuildInstall = path.join(CADERNO_TEMP_DIR, "node_modules", "esbuild", "install.js");
  if (fs.existsSync(esbuildInstall)) {
    try {
      execFileSync("node", [esbuildInstall], { cwd: CADERNO_TEMP_DIR, stdio: "pipe" });
    } catch {
      // Non-fatal if already installed
    }
  }

  const port = 5199;
  const baseUrl = `http://127.0.0.1:${port}`;
  log("caderno", `Starting temporary Vite server on ${baseUrl}...`);
  const server = spawnDetachedServer(
    "npx",
    ["vite", "--port", String(port), "--host", "127.0.0.1", "--strictPort"],
    CADERNO_TEMP_DIR
  );

  const saved = [];

  try {
    await waitForHttpReady(baseUrl, 45000);
    log("caderno", "Vite server ready (HTTP 200).");

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
    });
    const page = await context.newPage();

    await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30000 });
    await waitForStableRender(page, 700);

    // 3A. Populate realistic university subjects & notebooks through the real UI modals!
    log("caderno", "Creating realistic subjects and notebooks via real UI...");

    const addSubject = async (name, code, colorIndex) => {
      await page.getByRole("button", { name: /Nova Matéria/i }).click();
      await page.waitForTimeout(180);
      await page.locator('input[placeholder*="Cálculo"]').fill(name);
      await page.locator('input[placeholder*="MAT-101"]').fill(code);
      const colorBtns = page.locator('[role="dialog"] form button[type="button"][style*="background-color"]');
      if (await colorBtns.count() > colorIndex) {
        await colorBtns.nth(colorIndex).click();
      }
      await page.getByRole("button", { name: /^Criar Matéria$/i }).click();
      await page.waitForTimeout(220);
    };

    const addNotebookToSubject = async (subjectName, title) => {
      const card = page.locator("div.rounded-lg").filter({ hasText: subjectName }).first();
      await card.getByRole("button", { name: /Adicionar/i }).click();
      await page.waitForTimeout(180);
      await page.locator('input[placeholder*="Teoria de Limites"]').fill(title);
      await page.getByRole("button", { name: /^Criar Caderno$/i }).click();
      await page.waitForTimeout(220);
    };

    // Add 2 more notebooks to default "Cálculo Diferencial"
    await addNotebookToSubject("Cálculo Diferencial", "Séries de Taylor e Maclaurin");
    await addNotebookToSubject("Cálculo Diferencial", "Equações Diferenciais EDO");

    // Add 5 additional authentic STEM subjects (fills 3x2 grid symmetrically!)
    await addSubject("Física — Mecânica", "FIS-102", 1);
    await addNotebookToSubject("Física — Mecânica", "Cinemática Vetorial");
    await addNotebookToSubject("Física — Mecânica", "Leis de Newton e Atrito");
    await addNotebookToSubject("Física — Mecânica", "Conservação de Energia");

    await addSubject("Algoritmos e Grafos", "CC-204", 4);
    await addNotebookToSubject("Algoritmos e Grafos", "Árvores Balanceadas AVL");
    await addNotebookToSubject("Algoritmos e Grafos", "Caminhos Mínimos — Dijkstra");
    await addNotebookToSubject("Algoritmos e Grafos", "Fluxo Máximo em Redes");

    await addSubject("Álgebra Linear", "MAT-205", 2);
    await addNotebookToSubject("Álgebra Linear", "Autovalores e Autovetores");
    await addNotebookToSubject("Álgebra Linear", "Transformações Lineares");

    await addSubject("Sistemas Operacionais", "CC-301", 3);
    await addNotebookToSubject("Sistemas Operacionais", "Escalonamento e Threads");
    await addNotebookToSubject("Sistemas Operacionais", "Memória Virtual e Paginação");

    await addSubject("Arquitetura de Software", "CC-308", 5);
    await addNotebookToSubject("Arquitetura de Software", "Domínios e Contratos");
    await addNotebookToSubject("Arquitetura de Software", "Resiliência e Observabilidade");

    // Open "Derivadas e Integrais" first to configure workspace and ink Page 1 cleanly!
    await page.getByText("Derivadas e Integrais", { exact: true }).first().click();
    await page.waitForTimeout(500);

    // Dock the stylus toolbar cleanly on the Right via CalibrationModal so bottom pagination never overlaps!
    await page.locator('button[title*="Calibração da Caneta"]').click();
    await page.waitForTimeout(220);
    await page.getByRole("button", { name: "Direita", exact: true }).click();
    await page.waitForTimeout(120);
    await page.getByRole("button", { name: "Concluir", exact: true }).click();
    await page.waitForTimeout(260);

    // Add 2 extra pages so the notebook shows "1 / 3" and ExportModal shows "Todas as páginas (3)"
    const addPageBtn = page.locator('button[title="Adicionar Nova Página ao Caderno"]');
    if (await addPageBtn.count()) {
      await addPageBtn.click();
      await page.waitForTimeout(200);
      await addPageBtn.click();
      await page.waitForTimeout(200);
      // Go back to Page 1
      const prevBtn = page.locator('button[title="Página Anterior"]');
      await prevBtn.click();
      await page.waitForTimeout(160);
      await prevBtn.click();
      await page.waitForTimeout(250);
    }

    // Switch pattern to "Grade" (quadriculado) or keep "Pautado" — Pautado is super authentic for study notes!
    // Actually let's check Pautado vs Grade: Grade looks awesome for calculus curve + geometry!
    const gradeBtn = page.getByRole("button", { name: "Grade", exact: true });
    if (await gradeBtn.count()) {
      await gradeBtn.click();
      await page.waitForTimeout(250);
    }

    // Wait for any setup toasts to clear before drawing
    await page.waitForTimeout(3400);

    // 3B. Draw rich handwritten study notes + REAL draw-and-hold snapped geometry on the A4 canvas!
    log("caderno", "Inking A4 study sheet via simulated stylus PointerEvents + shape snapping...");

    // Set Medium pen size & Graphite Black (#111827)
    await page.getByRole("button", { name: "Médio", exact: true }).click();
    await selectToolbarColor(page, "#111827");

    // Disable auto-shape while writing crisp handwritten letters so short strokes stay organic
    const shapeToggle = page.locator('button[title*="Auto-correção de Formas"]');
    await shapeToggle.click(); // off for handwriting
    await page.waitForTimeout(120);

    // Handwritten Header: "CÁLCULO I: DERIVADAS" (positioned with generous A4 top margin)
    await writeHandwrittenText(page, "CÁLCULO I: DERIVADAS", 110, 175, 28, 42, 1.22);

    // Re-enable auto-shape detection for crisp snapped header underline + axes + shapes!
    await shapeToggle.click(); // back ON
    await page.waitForTimeout(120);

    // Snapped Cobalt underline under title
    await selectToolbarColor(page, "#1D4ED8");
    await drawStylusStroke(page, makeLinePts(110, 236, 870, 238, 24, 1.6), { holdMs: 430 });

    // Cartesian Axes for y = x^2 (snapped vertical Y-axis + horizontal X-axis)
    await selectToolbarColor(page, "#111827");
    await drawStylusStroke(page, makeLinePts(160, 665, 740, 667, 24, 1.6), { holdMs: 430 }); // X axis
    await drawStylusStroke(page, makeLinePts(280, 755, 282, 305, 24, 1.6), { holdMs: 430 }); // Y axis

    // Turn auto-shape OFF briefly for smooth organic parabola + labels
    await shapeToggle.click();
    await page.waitForTimeout(100);

    // Smooth parabola y = 0.0028 * (x - 280)^2 in Cobalt Blue (#1D4ED8)
    await selectToolbarColor(page, "#1D4ED8");
    const parabolaPts = [];
    for (let i = 0; i <= 48; i++) {
      const dx = -90 + (i / 48) * 440;
      const x = 280 + dx;
      const y = 665 - 0.0028 * dx * dx;
      if (y >= 310 && y <= 680) {
        parabolaPts.push({
          x,
          y,
          pressure: 0.48 + 0.28 * Math.sin((i / 48) * Math.PI),
        });
      }
    }
    await drawStylusStroke(page, parabolaPts, { holdMs: 0 });

    // Labels for axes and function
    await selectToolbarColor(page, "#111827");
    await writeHandwrittenText(page, "Y", 232, 300, 22, 32, 1.15);
    await writeHandwrittenText(page, "X", 756, 649, 22, 32, 1.15);

    // Formula notes on the right side
    await selectToolbarColor(page, "#1D4ED8");
    await writeHandwrittenText(page, "F(X) = X²", 790, 355, 25, 38, 1.18);

    await selectToolbarColor(page, "#DC2626");
    await writeHandwrittenText(page, "F'(X) = 2X", 790, 431, 25, 38, 1.18);

    await selectToolbarColor(page, "#15803D");
    await writeHandwrittenText(page, "GEOMETRIA", 110, 855, 24, 34, 1.2);

    // Turn auto-shape BACK ON for Crimson tangent line + snapped Circle + snapped Triangle!
    await shapeToggle.click();
    await page.waitForTimeout(100);

    // Crimson tangent line touching the parabola cleanly
    await selectToolbarColor(page, "#DC2626");
    await drawStylusStroke(page, makeLinePts(360, 667, 680, 319, 24, 1.5), { holdMs: 430 });

    // Smooth hand-drawn Cobalt Blue Circle on lower-left geometry study area
    await shapeToggle.click(); // OFF so circle stays a crisp circle
    await page.waitForTimeout(80);
    await selectToolbarColor(page, "#1D4ED8");
    await drawStylusStroke(page, makeCirclePts(295, 1085, 138, 60), { holdMs: 0 });

    // Re-enable auto-shape detection for snapped Radius line + 3 magnetically-snapped Triangle edges!
    await shapeToggle.click(); // ON
    await page.waitForTimeout(100);

    // Snapped Radius line inside circle (Crimson)
    await selectToolbarColor(page, "#DC2626");
    await drawStylusStroke(page, makeLinePts(295, 1085, 433, 1085, 18, 1.2), { holdMs: 430 });

    // Right Triangle built via 3 magnetically-snapped lines (triggers snapLineToExistingEndpoints!)
    await selectToolbarColor(page, "#15803D");
    await drawStylusStroke(page, makeLinePts(650, 945, 650, 1225, 20, 1.4), { holdMs: 430 }); // vertical leg a
    await drawStylusStroke(page, makeLinePts(652, 1225, 1015, 1225, 22, 1.4), { holdMs: 430 }); // horizontal leg b (snaps to bottom-left vertex!)
    await drawStylusStroke(page, makeLinePts(652, 947, 1013, 1223, 24, 1.4), { holdMs: 430 }); // hypotenuse c (snaps to BOTH vertices!)

    // Switch auto-shape off for 90-degree corner mark, crisp labels, and golden yellow highlight
    await shapeToggle.click();
    await page.waitForTimeout(100);
    await drawStylusStroke(page, makeLinePts(650, 1188, 686, 1188, 8, 0.2), { holdMs: 0 });
    await drawStylusStroke(page, makeLinePts(686, 1188, 686, 1225, 8, 0.2), { holdMs: 0 });

    await selectToolbarColor(page, "#DC2626");
    await writeHandwrittenText(page, "R", 354, 1030, 22, 32, 1.1);

    await selectToolbarColor(page, "#15803D");
    await writeHandwrittenText(page, "A", 602, 1068, 22, 32, 1.1);
    await writeHandwrittenText(page, "B", 820, 1244, 22, 32, 1.1);
    await writeHandwrittenText(page, "C", 846, 1028, 22, 32, 1.1);
    await writeHandwrittenText(page, "A² + B² = C²", 640, 1300, 24, 36, 1.18);

    // Golden-yellow highlighter pass on F'(X) = 2X
    await page.locator('button[title*="Marca-texto"]').click();
    await page.waitForTimeout(100);
    await selectToolbarColor(page, "#EAB308");
    await drawStylusStroke(page, makeLinePts(782, 452, 1110, 452, 16, 1.0), { holdMs: 0 });

    // Switch back to Pen + Cobalt Blue + Auto-Shape ON so the toolbar reflects the active inking state
    await page.locator('button[title="Caneta (B)"]').click();
    await selectToolbarColor(page, "#1D4ED8");
    await shapeToggle.click(); // back ON

    // Hide dynamic brush-tip ring cleanly by dispatching pointerleave on overlay canvas
    await page.evaluate(() => {
      const canvases = [...document.querySelectorAll("canvas")];
      const overlay = canvases[canvases.length - 1];
      if (overlay) {
        overlay.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
      }
    });

    // Wait for toasts to fade out cleanly before capturing canvas-workspace.webp
    await page.waitForTimeout(3500);
    await page.mouse.move(10, 10);
    await page.waitForTimeout(200);

    log("caderno", "Capturing canvas-workspace.webp...");
    const workspaceRaw = path.join(stagingDir, "caderno-canvas-workspace.png");
    await page.screenshot({ path: workspaceRaw, fullPage: false });
    saved.push(
      convertPngToWebp(
        workspaceRaw,
        path.join(GALLERY_ROOT, "caderno-digital", "canvas-workspace.webp")
      )
    );

    // 3C. Vector PDF Export Modal over the inked A4 workspace!
    log("caderno", "Capturing vector-pdf-export.webp (ExportModal over live inked sheet)...");
    await page.locator('button[title*="Exportar Caderno em PDF"]').click();
    await page.waitForTimeout(450);
    const exportRaw = path.join(stagingDir, "caderno-vector-pdf-export.png");
    await page.screenshot({ path: exportRaw, fullPage: false });
    saved.push(
      convertPngToWebp(
        exportRaw,
        path.join(GALLERY_ROOT, "caderno-digital", "vector-pdf-export.webp")
      )
    );

    // Close ExportModal and go back to Dashboard (Notebooks Library)
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await page.waitForTimeout(250);

    // 3D. Notebooks Library (DashboardView with all 6 subjects & populated notebooks)
    log("caderno", "Capturing notebooks-library.webp...");
    await page.locator('button[title="Ir para o Dashboard"]').click();
    await page.waitForTimeout(600);
    await waitForStableRender(page, 400);

    const libraryRaw = path.join(stagingDir, "caderno-notebooks-library.png");
    await page.screenshot({ path: libraryRaw, fullPage: false });
    saved.push(
      convertPngToWebp(
        libraryRaw,
        path.join(GALLERY_ROOT, "caderno-digital", "notebooks-library.webp")
      )
    );

    await context.close();
  } finally {
    log("caderno", "Stopping temporary Vite server...");
    await server.stop();
    if (!keepTemp) {
      log("caderno", `Cleaning up ${CADERNO_TEMP_DIR}...`);
      fs.rmSync(CADERNO_TEMP_DIR, { recursive: true, force: true });
    }
  }

  return saved;
}

/* ==========================================================================
   MAIN ORCHESTRATOR
   ========================================================================== */
async function cleanupAll() {
  if (activeBrowser) {
    try {
      await activeBrowser.close();
    } catch {
      // ignore
    }
    activeBrowser = null;
  }
  for (const pid of [...activeChildGroups]) {
    killProcessGroup(pid);
  }
}

process.on("SIGINT", async () => {
  await cleanupAll();
  process.exit(130);
});
process.on("SIGTERM", async () => {
  await cleanupAll();
  process.exit(143);
});

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) {
    printHelp();
    return;
  }
  keepTemp = opts.keepTemp;

  if (!fs.existsSync(opts.chromiumPath)) {
    throw new Error(
      `Chromium binary not found at ${opts.chromiumPath}. Pass --chromium=/path/to/chromium or set CHROMIUM_PATH.`
    );
  }

  const stagingDir = fs.mkdtempSync(path.join(os.tmpdir(), "portfolio-capture-"));
  const allSaved = [];

  try {
    log("capture", `Launching headless Chromium (${opts.chromiumPath})...`);
    activeBrowser = await chromium.launch({
      executablePath: opts.chromiumPath,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--font-render-hinting=none",
      ],
    });

    if (opts.only.includes("projcatalogos")) {
      const items = await captureProjCatalogos(activeBrowser, stagingDir, opts.projcatalogosDir);
      allSaved.push(...items);
    }

    if (opts.only.includes("cutsync")) {
      const items = await captureCutSync(activeBrowser, stagingDir);
      allSaved.push(...items);
    }

    if (opts.only.includes("caderno")) {
      const items = await captureCadernoDigital(activeBrowser, stagingDir, opts.cadernoRepo);
      allSaved.push(...items);
    }

    console.log("\n=== CAPTURE COMPLETE ===");
    for (const item of allSaved) {
      const rel = path.relative(PORTFOLIO_ROOT, item.path);
      const kb = (item.bytes / 1024).toFixed(1);
      console.log(`  ✓ ${rel} — ${item.width}x${item.height} (${kb} KB)`);
    }
  } finally {
    await cleanupAll();
    if (!keepTemp) {
      fs.rmSync(stagingDir, { recursive: true, force: true });
    } else {
      log("capture", `Kept staging dir: ${stagingDir}`);
    }
  }
}

main().catch(async (err) => {
  console.error("\n[capture] FATAL:", err);
  await cleanupAll();
  process.exit(1);
});
