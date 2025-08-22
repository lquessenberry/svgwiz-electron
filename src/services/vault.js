/*
  Vault service: index SVG directories and provide simple metadata + search.
  Optional deps: xml2js (recommended). Falls back to regex extraction if missing.
*/

const fs = require('fs')
const path = require('path')

let xml2js
try { xml2js = require('xml2js') } catch (_) { xml2js = null }

function walkSvgFiles (dir, acc) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const e of entries) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) walkSvgFiles(full, acc)
      else if (e.isFile() && e.name.toLowerCase().endsWith('.svg')) acc.push(full)
    }
  } catch (_) {}
}

function uniq (arr) {
  return Array.from(new Set(arr.filter(Boolean)))
}

function extractWithRegex (svg) {
  const widthMatch = svg.match(/\bwidth\s*=\s*"([^"]+)"/i)
  const heightMatch = svg.match(/\bheight\s*=\s*"([^"]+)"/i)
  const viewBoxMatch = svg.match(/\bviewBox\s*=\s*"([^"]+)"/i)
  const pathCount = (svg.match(/<path\b/gi) || []).length
  const fillColors = Array.from(svg.matchAll(/\bfill\s*=\s*"(#?[a-zA-Z0-9(),.%\s-]+)"/g)).map(m => m[1].trim())
  const strokeColors = Array.from(svg.matchAll(/\bstroke\s*=\s*"(#?[a-zA-Z0-9(),.%\s-]+)"/g)).map(m => m[1].trim())
  return {
    width: widthMatch ? widthMatch[1] : undefined,
    height: heightMatch ? heightMatch[1] : undefined,
    viewBox: viewBoxMatch ? viewBoxMatch[1] : undefined,
    pathCount,
    fills: uniq(fillColors),
    strokes: uniq(strokeColors)
  }
}

async function parseSvgMeta (svg) {
  if (!xml2js) return extractWithRegex(svg)
  try {
    const res = await xml2js.parseStringPromise(svg, { explicitArray: false })
    const root = res && (res.svg || res.SVG || res['svg:svg'])
    let width, height, viewBox
    if (root && root.$) {
      width = root.$.width
      height = root.$.height
      viewBox = root.$.viewBox
    }
    const svgString = typeof svg === 'string' ? svg : ''
    const basics = extractWithRegex(svgString)
    return {
      width: width || basics.width,
      height: height || basics.height,
      viewBox: viewBox || basics.viewBox,
      pathCount: basics.pathCount,
      fills: basics.fills,
      strokes: basics.strokes
    }
  } catch (_) {
    return extractWithRegex(svg)
  }
}

function deriveTags (filePath) {
  const parts = filePath.split(path.sep)
  // Use folder names (excluding filename) as tags
  const folders = parts.slice(0, -1).slice(-3)
  return folders.map(s => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase()).filter(Boolean)
}

function colorKey (c) {
  return (c || '').trim().toLowerCase()
}

async function indexVault (rootDir) {
  const files = []
  walkSvgFiles(rootDir, files)
  const items = []
  const colorCounts = new Map()

  for (const file of files) {
    try {
      const svg = fs.readFileSync(file, 'utf8')
      const meta = await parseSvgMeta(svg)
      const id = path.relative(rootDir, file)
      const tags = deriveTags(path.relative(rootDir, path.dirname(file)))
      meta.fills.forEach(c => colorCounts.set(colorKey(c), (colorCounts.get(colorKey(c)) || 0) + 1))
      items.push({
        id,
        file,
        name: path.basename(file),
        tags,
        width: meta.width,
        height: meta.height,
        viewBox: meta.viewBox,
        pathCount: meta.pathCount,
        fills: meta.fills,
        strokes: meta.strokes
      })
    } catch (_) {}
  }

  const colors = Array.from(colorCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 24).map(([c, n]) => ({ color: c, count: n }))
  const index = {
    version: 1,
    rootDir,
    createdAt: Date.now(),
    count: items.length,
    colors,
    items
  }

  try {
    fs.writeFileSync(path.join(rootDir, '.svgwiz.index.json'), JSON.stringify(index, null, 2))
  } catch (_) {}

  return index
}

function loadIndex (rootDir) {
  try {
    const p = path.join(rootDir, '.svgwiz.index.json')
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch (_) {}
  return { version: 1, rootDir, createdAt: 0, count: 0, colors: [], items: [] }
}

function searchVault (rootDir, query = '', filters = {}) {
  const idx = loadIndex(rootDir)
  const q = String(query || '').trim().toLowerCase()

  const byText = (item) => {
    if (!q) return true
    return (
      item.name.toLowerCase().includes(q) ||
      item.tags.some(t => t.includes(q)) ||
      item.fills.some(c => c.includes(q)) ||
      item.strokes.some(c => c.includes(q))
    )
  }

  const byFilters = (item) => {
    if (!filters) return true
    if (filters.minPaths && item.pathCount < Number(filters.minPaths)) return false
    if (filters.maxPaths && item.pathCount > Number(filters.maxPaths)) return false
    if (filters.fill && !item.fills.map(colorKey).includes(colorKey(filters.fill))) return false
    if (filters.stroke && !item.strokes.map(colorKey).includes(colorKey(filters.stroke))) return false
    return true
  }

  const results = idx.items.filter(it => byText(it) && byFilters(it))
  return { ...idx, items: results, count: results.length }
}

module.exports = {
  indexVault,
  searchVault
}
