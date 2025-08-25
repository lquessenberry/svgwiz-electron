---
title: "SVGwiz (svgsus-electron) — Project Notes"
tags:
  - project
  - electron
  - svg
  - vite
  - react
  - tailwind
  - svgsus
  - desktop
aliases:
  - SVGwiz Project Notes
  - svgsus-electron Notes
---

# SVGwiz (svgsus-electron)

An Electron desktop app powered by `svgsus` to clean, optimize, and transform SVGs with a modern Vite + React UI.

## Overview
- __Core__: Electron main in `src/main.js`, renderer in `renderer/` (Vite + React + Tailwind).
- __SVG processing__: via `svgsus` (single/batch conversions).
- __Vault indexing__: scans SVG folders, extracts metadata, and enables search.
- __Exports__: optional raster exports (PNG/JPEG/WebP/AVIF) via `sharp`.
- __Git integration__: init/status/commit/log via `simple-git`.
- __Licensing__: offline Ed25519 signature verification (TweetNaCl).
- __Deep links__: `svgwiz://purchase/success` marks plan as paid.

## Repo Layout
- `src/main.js`: app lifecycle, window creation, preload bridge, IPC handlers, deep links, plan/license helpers, file dialogs.
- `src/preload.js`: safe IPC API for the renderer (`window.api.*`).
- `src/services/vault.js`: index/search SVGs, writes `.svgwiz.index.json` in root.
- `src/services/exports.js`: raster exports via `sharp` (optional).
- `src/services/git.js`: thin wrapper over `simple-git`.
- `renderer/`: React UI, Tailwind styles, components.
- `flatpak/`: Flatpak manifest and desktop entries.
- `scripts/`: `fix-html-paths.js`, `prepare-icons.sh`.

## Development
- __Prereqs__: Node 14+; npm or yarn.
- __Install__:
  - `npm install`
- __Run__:
  - Dev: `npm run dev` (runs Vite + Electron together)
  - Basic: `npm start` (Electron; will try to load Vite on :5173–:5178)
- __Lint__: `npm run lint`

## Build & Packaging
- __Build renderer + app__: `npm run build` or `npm run dist`
- __Package targets__ (`electron-builder`):
  - Linux: AppImage, deb, rpm, snap
  - macOS: default dmg
  - Windows: nsis, portable
- __Flatpak__: see `flatpak/com.example.svgwiz.yml` (builds into `/app/share/svgwiz`, then `npm install --production`).
- __Icons__: `scripts/prepare-icons.sh` (ImageMagick required).
- __Note__: production load path expects `renderer/dist/index.html`. Ensure Vite outDir and copy paths align.

## Environment & Config
- __Main process__:
  - `LICENSE_PUBLIC_KEY_BASE64`: Ed25519 public key for license validation.
  - `STRIPE_PAYMENT_LINK`: optional purchase link fallback.
  - `SVGWIZ_ENABLE_WEBGL=1`: enable GPU/WebGL; otherwise GPU disabled by default.
- __Renderer (Vite)__: copy `renderer/.env.example` to `.env`
  - `VITE_STRIPE_PUBLISHABLE_KEY`
  - `VITE_STRIPE_BUY_BUTTON_ID`
  - `VITE_STRIPE_PAYMENT_LINK_URL`
- __Store keys__ (`electron-store`):
  - `license`, `licensePublicKey`, `plan` (`free`|`paid`), `stripePaymentLink`, `installId`.

## IPC API (via `src/preload.js`)
- __SVG__: `processSvg(file, format, options)`, `processSvgBatch(files, format, options)`
- __Vault__: `vaultIndex(rootDir)`, `vaultSearch(rootDir, query, filters)`
- __Files__: `openFileDialog()`, `openFolderDialog()`, `chooseFolder()`, `saveFileDialog(format)`, `saveToFile(path, content)`, `quickSave(base, ext, content)`
- __Git__: `gitInit(dir)`, `gitStatus(dir)`, `gitCommit(dir, message)`, `gitBranch(dir, name)`, `gitMerge(dir, sourceBranch)`, `gitLog(dir, limit)`
- __Exports__: `exportRaster(input, format, options)`
- __Plan/License/Links__: `getPlan()/setPlan()`, `onPlanUpdated()/waitForPaid()`, `openExternal(url)`, `getStripeLink()/setStripeLink()`, `getLicense()/setLicense()/clearLicense()`, `validateLicense()`, `getLicensePublicKey()/setLicensePublicKey()`

## Vault Service (`src/services/vault.js`)
- __Indexing__: recursively scans `rootDir` for `.svg`, extracts:
  - width, height, viewBox, `pathCount`, `fills[]`, `strokes[]`
  - `tags[]` from last 3 folder names
- __Index file__: `.svgwiz.index.json` written to `rootDir`
  - Top-level: `version`, `rootDir`, `createdAt`, `count`, `colors[{color,count}]`, `items[]`
  - Item: `{ id, file, name, tags[], width, height, viewBox, pathCount, fills[], strokes[] }`
- __Search__: text over name/tags/fills/strokes + filters:
  - `minPaths`, `maxPaths`, `fill`, `stroke`

## Exports Service (`src/services/exports.js`)
- __Raster formats__: `png`, `jpeg/jpg`, `webp`, `avif`
- __Options__: `density` (dpi), `width`, `height`, `outputPath`
- __Return__: `{ base64, contentType }` or writes to `outputPath`
- __Note__: requires `sharp` (optional dep).

## Git Service (`src/services/git.js`)
- __Ops__: `initRepo`, `status`, `addAllCommit` (adds `.`), `createBranch`, `merge`, `log(limit)`
- Returns plain JSON for IPC.

## UI Tooling
- __Tools Drawer__ (`renderer/components/ToolsDrawer.jsx`):
  - Vault: choose root, index, search with filters
  - Git: choose repo, init, status, commit, log
  - Export: choose SVG, rasterize preview

## Deep Linking
- `svgwiz://purchase/success` sets plan to `paid` and notifies UI.
- `svgwiz://purchase/reset|/free` resets plan to `free`.

## Notes & Caveats
- Ensure Vite `outDir` matches where `fix-html-paths.js` and production `main.js` expect `index.html`.
- Some features require optional deps:
  - `sharp` for raster exports
  - `xml2js` for richer SVG parse (regex fallback exists)
  - ImageMagick for icon generation script
