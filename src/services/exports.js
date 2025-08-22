/*
  Exports service: rasterization and format stubs with graceful fallbacks.
  Optional deps: sharp (for PNG/JPEG/WebP/AVIF). PDF and vector formats are stubbed
  for now to avoid heavy deps; we can add svg-to-pdfkit/pdfkit later.
*/

const fs = require('fs')
const path = require('path')
let sharp
try { sharp = require('sharp') } catch (_) { sharp = null }

function notInstalled (pkg) {
  return { success: false, error: `${pkg} not installed. Run: npm i ${pkg}` }
}

function ensureDir (filePath) {
  try { fs.mkdirSync(path.dirname(filePath), { recursive: true }) } catch (_) {}
}

function isFilePath (input) {
  try { return typeof input === 'string' && fs.existsSync(input) && fs.statSync(input).isFile() } catch (_) { return false }
}

async function rasterize (input, format = 'png', options = {}) {
  if (!sharp) return notInstalled('sharp')
  const fmt = String(format || 'png').toLowerCase()
  const supported = ['png', 'jpeg', 'jpg', 'webp', 'avif']
  if (!supported.includes(fmt)) {
    return { success: false, error: `Unsupported raster format: ${fmt}` }
  }
  try {
    const svg = isFilePath(input) ? fs.readFileSync(input, 'utf8') : String(input || '')
    const density = Number(options.density || 300)
    const width = options.width ? Number(options.width) : undefined
    const height = options.height ? Number(options.height) : undefined

    let pipeline = sharp(Buffer.from(svg, 'utf8'), { density })
    if (width || height) pipeline = pipeline.resize(width || null, height || null)

    switch (fmt) {
      case 'png': pipeline = pipeline.png({ quality: 90, compressionLevel: 9 }); break
      case 'jpg':
      case 'jpeg': pipeline = pipeline.jpeg({ quality: 90 }); break
      case 'webp': pipeline = pipeline.webp({ quality: 90 }); break
      case 'avif': pipeline = pipeline.avif({ quality: 50 }); break
    }

    const buffer = await pipeline.toBuffer()

    if (options.outputPath) {
      ensureDir(options.outputPath)
      fs.writeFileSync(options.outputPath, buffer)
      return { success: true, filePath: options.outputPath, bytes: buffer.length }
    }

    const mime = fmt === 'png' ? 'image/png'
      : (fmt === 'webp' ? 'image/webp'
      : (fmt === 'avif' ? 'image/avif'
      : 'image/jpeg'))

    return { success: true, base64: buffer.toString('base64'), contentType: mime, bytes: buffer.length }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

async function exportPDF () {
  return { success: false, error: 'PDF export not wired yet. Consider: npm i pdfkit svg-to-pdfkit' }
}

async function exportVector () {
  return { success: false, error: 'Vector exports (AI/EPS/CDR/DXF/EMF/WMF/CGM/VML) require external tools or converters. We can integrate Inkscape/ghostscript or cloud converters.' }
}

module.exports = {
  rasterize,
  exportPDF,
  exportVector
}
