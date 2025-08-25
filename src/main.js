const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const url = require('url')
const fs = require('fs')
const os = require('os')
const svgsus = require('svgsus')
const Store = require('electron-store')
const nacl = require('tweetnacl')
const { TextEncoder } = require('util')
const crypto = require('crypto')
const vault = require('./services/vault')
const gitSvc = require('./services/git')
const exportsSvc = require('./services/exports')

// GPU/WebGL control: enable via env when shaders are needed, otherwise
// keep safer defaults especially on Linux.
// To enable GPU+WebGL, run with: SVGWIZ_ENABLE_WEBGL=1 npm run start
const ENABLE_WEBGL = process.env.SVGWIZ_ENABLE_WEBGL === '1'
if (ENABLE_WEBGL) {
  try {
    app.commandLine.appendSwitch('enable-webgl')
    app.commandLine.appendSwitch('ignore-gpu-blocklist')
  } catch (_) {}
} else {
  // Disable GPU acceleration to avoid potential VA-API issues on some Linux setups
  app.disableHardwareAcceleration()
}

// Create settings store
const store = new Store()

// Keep a global reference of the window object
let mainWindow

// Ensure single instance and support deep link forwarding
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  try { app.quit() } catch (_) {}
} else {
  app.on('second-instance', (event, argv) => {
    try {
      const link = (argv || []).find(a => typeof a === 'string' && a.startsWith('svgwiz://'))
      if (link) handleDeepLink(link)
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
      }
    } catch (_) {}
  })
}

// Navigation, security, and logging setup
const ALLOWED_EXTERNAL = new Set([
  'js.stripe.com',
  'buy.stripe.com',
  'stripe.com',
  '*.stripe.com'
])
const ALLOWED_OPEN = new Set([
  'js.stripe.com',
  'buy.stripe.com',
  'stripe.com',
  '*.stripe.com'
])
app.on('web-contents-created', (_e, contents) => {
  contents.on('will-navigate', (event) => {
    try { event.preventDefault() } catch (_) {}
  })
  contents.setWindowOpenHandler(({ url }) => {
    try {
      const { hostname, protocol } = new URL(url)
      const https = protocol === 'https:'
      const allowed = https && ([...ALLOWED_EXTERNAL].some(pattern => {
        if (pattern.startsWith('*.')) return hostname.endsWith(pattern.slice(1))
        return hostname === pattern
      }))
      if (allowed) return { action: 'allow' }
    } catch (_) {}
    return { action: 'deny' }
  })
})

function setupLogging () {
  try {
    const logDir = path.join(app.getPath('userData'), 'logs')
    fs.mkdirSync(logDir, { recursive: true })
    const logFile = path.join(logDir, 'svgwiz.log')
    const log = (msg) => fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`)
    process.on('uncaughtException', (err) => log(`uncaughtException: ${err.stack || err}`))
    process.on('unhandledRejection', (r) => log(`unhandledRejection: ${r?.stack || r}`))
    app.on('renderer-process-crashed', (_e, wc) => log(`renderer crashed: ${wc?.id}`))
  } catch (_) {}
}
app.whenReady().then(setupLogging)

// Deny permission prompts by default
app.whenReady().then(() => {
  const { session } = require('electron')
  const ses = session.defaultSession
  try {
    ses.setPermissionRequestHandler((_wc, _permission, callback) => { callback(false) })
  } catch (_) {}
})

// Dev-time CSP header for Vite http://localhost:517x
app.whenReady().then(() => {
  const { session } = require('electron')
  const ses = session.defaultSession
  try {
    ses.webRequest.onHeadersReceived((details, callback) => {
      const isDevLocal = /^http:\/\/localhost:517\d/.test(details.url)
      const headers = details.responseHeaders || {}
      if (isDevLocal) {
        headers['Content-Security-Policy'] = [
          "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https://api.stripe.com ws://localhost:*; frame-src https://js.stripe.com https://*.stripe.com;"
        ]
      }
      callback({ responseHeaders: headers })
    })
  } catch (_) {}
})

// Constrain file writes to home/Downloads
function isAllowedPath (p) {
  const real = fs.realpathSync.native ? fs.realpathSync.native(p) : fs.realpathSync(p)
  const home = os.homedir()
  const downloads = app.getPath('downloads')
  return real.startsWith(home + path.sep) || real.startsWith(downloads + path.sep)
}

// Normalize formatter outputs so the renderer always gets strings
function extractStringOutput(res) {
  if (res == null) return ''
  if (typeof res === 'string') return res
  try {
    // Common fields used by formatters
    const candidates = ['svg', 'output', 'code', 'content', 'data', 'result', 'value']
    if (typeof res === 'object') {
      for (const key of candidates) {
        if (typeof res[key] === 'string') return res[key]
      }
    }
    // Buffers
    if (Buffer.isBuffer && Buffer.isBuffer(res)) return res.toString('utf8')
  } catch (_) {
    // Fall through
  }
  return ''
}

// SVG processing functions
const processSvg = async (filePath, format, options) => {
  try {
    const svg = fs.readFileSync(filePath, 'utf8')
    const formatter = svgsus[format]
    
    if (!formatter) {
      throw new Error(`Unsupported format: ${format}`)
    }
    
    // Ensure options are correctly typed
    const processedOptions = {};
    
    // Copy all original options
    Object.keys(options).forEach(key => {
      const value = options[key];
      
      // Handle specific option types
      if (key === 'codeIndent') {
        // Ensure codeIndent is a string
        processedOptions[key] = value ? String(value) : '  ';
      } else if (key === 'compressed' || key === 'stripStyle') {
        // Ensure boolean options are actual booleans
        processedOptions[key] = value === true || value === 'true';
      } else if (typeof value === 'string') {
        // Keep other string values as strings
        processedOptions[key] = value;
      } else {
        // Copy other values as-is
        processedOptions[key] = value;
      }
    });
    
    // Ensure defaults are set
    // Enforce two-space indentation (no user control)
    processedOptions.codeIndent = '  ';
    if (!('compressed' in processedOptions)) processedOptions.compressed = false;
    
    const raw = await formatter.convert(svg, processedOptions)
    const output = extractStringOutput(raw)
    return { success: true, output }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

const processSvgBatch = async (filePaths, format, options) => {
  try {
    const inputs = filePaths.map(file => ({
      name: path.basename(file, path.extname(file)),
      svg: fs.readFileSync(file, 'utf8')
    }))
    
    const formatter = svgsus[format]
    
    if (!formatter) {
      throw new Error(`Unsupported format: ${format}`)
    }
    
    // Ensure options are correctly typed
    const processedOptions = {};
    
    // Copy all original options
    Object.keys(options).forEach(key => {
      const value = options[key];
      
      // Handle specific option types
      if (key === 'codeIndent') {
        // Ensure codeIndent is a string
        processedOptions[key] = value ? String(value) : '  ';
      } else if (key === 'compressed' || key === 'stripStyle') {
        // Ensure boolean options are actual booleans
        processedOptions[key] = value === true || value === 'true';
      } else if (typeof value === 'string') {
        // Keep other string values as strings
        processedOptions[key] = value;
      } else {
        // Copy other values as-is
        processedOptions[key] = value;
      }
    });
    
    // Ensure defaults are set
    // Enforce two-space indentation (no user control)
    processedOptions.codeIndent = '  ';
    if (!('compressed' in processedOptions)) processedOptions.compressed = false;
    
    const rawResults = await formatter.convertAll(inputs, processedOptions)
    let outputs = []
    if (Array.isArray(rawResults)) {
      outputs = rawResults.map(item => extractStringOutput(item))
    } else if (typeof rawResults === 'string') {
      outputs = [rawResults]
    } else {
      const extracted = extractStringOutput(rawResults)
      if (extracted) outputs = [extracted]
    }
    return { success: true, outputs }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

function createWindow () {
  // Create the browser window
  const maybeIcon = path.join(__dirname, '../assets/icons/icon.png')
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    icon: fs.existsSync(maybeIcon) ? maybeIcon : undefined
  })

  // In development mode, load from the Vite dev server
  const isDev = process.env.NODE_ENV === 'development' || 
    process.argv.includes('--dev') || 
    !app.isPackaged

  if (isDev) {
    // Detect which port Vite is running on - try common ports
    const checkPort = async (port) => {
      return new Promise(resolve => {
        try {
          const http = require('http')
          const req = http.get(`http://localhost:${port}/@vite/client`, (res) => {
            resolve(res.statusCode === 200)
          }).on('error', () => {
            resolve(false)
          })
          req.setTimeout(800, () => {
            try { req.destroy() } catch (_) {}
            resolve(false)
          })
        } catch (_) {
          resolve(false)
        }
      })
    }

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

    const tryLoadVite = async () => {
      // Try common Vite ports in order
      const ports = [5173, 5174, 5175, 5176, 5177, 5178]
      for (const port of ports) {
        if (await checkPort(port)) {
          const viteUrl = `http://localhost:${port}`
          mainWindow.loadURL(viteUrl)
          console.log(`Loading from Vite dev server: ${viteUrl}`)
          return true
        }
      }
      console.log('Waiting for Vite dev server to start...')
      return false
    }

    const pollViteAndLoad = async () => {
      // Poll for up to ~15s before falling back
      for (let i = 0; i < 60; i++) {
        const ok = await tryLoadVite()
        if (ok) return
        await delay(250)
      }
      const fallbackUrl = 'http://localhost:5173'
      console.log(`Falling back to default Vite URL: ${fallbackUrl}`)
      mainWindow.loadURL(fallbackUrl)
    }
    
    pollViteAndLoad()
  } else {
    // Load the local file in production
    // Use the correct path to find the renderer HTML file in production
    // Try several possible locations where the HTML file might be
    let rendererPath = path.join(__dirname, '../renderer/dist/index.html')
    console.log('Checking path:', rendererPath)
    
    // If that path doesn't exist (in packaged app), try alternative locations
    if (!fs.existsSync(rendererPath)) {
      rendererPath = path.join(__dirname, './renderer/dist/index.html')
      console.log('Checking path:', rendererPath)
    }
    
    // If still not found, try the location in the app.asar
    if (!fs.existsSync(rendererPath)) {
      rendererPath = path.join(process.resourcesPath, 'app.asar/renderer/dist/index.html')
      console.log('Checking path:', rendererPath)
    }
    
    // Try the extraResources location
    if (!fs.existsSync(rendererPath)) {
      rendererPath = path.join(process.resourcesPath, 'renderer/dist/index.html')
      console.log('Checking path:', rendererPath)
    }
    
    console.log('Loading renderer from:', rendererPath)
    mainWindow.loadFile(rendererPath)
  }

  // Open DevTools in development mode
  if (
    isDev ||
    process.argv.includes('--debug') ||
    process.argv.some(arg => arg.startsWith('--inspect')) ||
    process.argv.some(arg => arg.startsWith('--remote-debugging-port'))
  ) {
    mainWindow.webContents.openDevTools()
  }

  // Window closed event
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// App ready event
app.whenReady().then(() => {
  createWindow()

  // Register custom protocol for deep links like svgwiz://purchase/success
  try { app.setAsDefaultProtocolClient('svgwiz') } catch (_) {}

  app.on('activate', () => {
    // On macOS it's common to re-create a window when the dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  // Handle deep link passed on first run (Windows/Linux)
  try {
    const initial = (process.argv || []).find(a => typeof a === 'string' && a.startsWith('svgwiz://'))
    if (initial) handleDeepLink(initial)
  } catch (_) {}
})

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// macOS deep link handler
app.on('open-url', (event, rawUrl) => {
  try { event.preventDefault() } catch (_) {}
  handleDeepLink(rawUrl)
})

// Git operations
ipcMain.handle('git-init', async (event, { dir }) => gitSvc.initRepo(dir))
ipcMain.handle('git-status', async (event, { dir }) => gitSvc.status(dir))
ipcMain.handle('git-commit', async (event, { dir, message }) => gitSvc.addAllCommit(dir, message || 'chore(svgwiz): update assets'))
ipcMain.handle('git-branch', async (event, { dir, name }) => gitSvc.createBranch(dir, name || 'variant'))
ipcMain.handle('git-merge', async (event, { dir, sourceBranch }) => gitSvc.merge(dir, sourceBranch))
ipcMain.handle('git-log', async (event, { dir, limit }) => gitSvc.log(dir, limit || 50))

// Exports: rasterization (png/jpeg/webp/avif) with validation
ipcMain.handle('export-raster', async (event, { input, format, options }) => {
  try {
    const ALLOWED_EXPORT_FORMATS = new Set(['png', 'jpeg', 'jpg', 'webp', 'avif'])
    const fmt = String(format || '').toLowerCase()
    if (typeof input !== 'string' || input.length === 0) throw new Error('input required')
    if (!ALLOWED_EXPORT_FORMATS.has(fmt)) throw new Error('invalid format')
    if (!(options == null || typeof options === 'object')) throw new Error('bad options')
    return await exportsSvc.rasterize(input, fmt, options)
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// IPC handlers for SVG processing
ipcMain.handle('process-svg', async (event, { filePath, format, options }) => {
  return processSvg(filePath, format, options)
})

ipcMain.handle('process-svg-batch', async (event, { filePaths, format, options }) => {
  return processSvgBatch(filePaths, format, options)
})

// IPC handler for error logging
ipcMain.handle('log-error', async (event, { message, error }) => {
  console.error(`[SVGwiz UI Error] ${message}:`, error)
  return true
})

// IPC handlers for file operations
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'SVG Files', extensions: ['svg', 'SVG', 'Svg'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  try {
    console.log('[SVGwiz] open-file-dialog selected:', Array.isArray(result.filePaths) ? result.filePaths.length : 0)
  } catch (_) {}
  return result.filePaths
})

// Recursively collect SVG files from selected folders
function collectSvgFiles (dirPath, acc) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(dirPath, entry.name)
      if (entry.isDirectory()) {
        collectSvgFiles(full, acc)
      } else if (entry.isFile()) {
        const lower = entry.name.toLowerCase()
        if (lower.endsWith('.svg')) acc.push(full)
      }
    }
  } catch (e) {
    try { console.warn('Failed to read dir', dirPath, e?.message) } catch (_) {}
  }
}

// Folder selection to import entire icon sets
ipcMain.handle('open-folder-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'multiSelections']
  })
  const folders = result?.filePaths || []
  const files = []
  for (const dirPath of folders) collectSvgFiles(dirPath, files)
  try {
    console.log('[SVGwiz] open-folder-dialog aggregated SVG files:', files.length)
  } catch (_) {}
  return files
})

// Choose a single folder and return its path
ipcMain.handle('choose-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })
  const dir = (result?.filePaths || [])[0] || null
  try { console.log('[SVGwiz] choose-folder selected:', dir) } catch (_) {}
  return dir
})

// Vault: index and search
ipcMain.handle('vault-index', async (event, { rootDir }) => {
  try {
    if (!rootDir || !fs.existsSync(rootDir)) throw new Error('Invalid rootDir')
    const index = await vault.indexVault(rootDir)
    return { success: true, index }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('vault-search', async (event, { rootDir, query, filters }) => {
  try {
    if (!rootDir || !fs.existsSync(rootDir)) throw new Error('Invalid rootDir')
    const results = vault.searchVault(rootDir, query, filters)
    return { success: true, results }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// License storage
ipcMain.handle('get-license', async () => {
  try {
    return store.get('license') || ''
  } catch (_) {
    return ''
  }
})

ipcMain.handle('set-license', async (event, { license }) => {
  try {
    if (typeof license !== 'string' || license.length < 20) {
      throw new Error('Invalid license')
    }
    store.set('license', license)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('clear-license', async () => {
  try {
    store.delete('license')
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Validate license (moved from preload to main to avoid preload bundling issues)
ipcMain.handle('validate-license', async (event, { license }) => {
  try {
    if (typeof license !== 'string' || !license.includes('.')) {
      return { valid: false, reason: 'Malformed license' }
    }
    const [payloadB64u, sigB64u] = license.split('.')
    const payloadJson = base64UrlDecodeToString(payloadB64u)
    const payload = JSON.parse(payloadJson)
    const msgBytes = new TextEncoder().encode(payloadB64u)
    const sigBytes = base64UrlToBytes(sigB64u)
    const storedKey = store.get('licensePublicKey') || process.env.LICENSE_PUBLIC_KEY_BASE64 || ''
    if (!storedKey) {
      return { valid: false, reason: 'Missing public key' }
    }
    const pubKeyBytes = base64ToBytes(storedKey)
    const ok = nacl.sign.detached.verify(msgBytes, sigBytes, pubKeyBytes)
    if (!ok) return { valid: false, reason: 'Signature invalid' }

    // Basic semantic checks
    if (payload.product && typeof payload.product === 'string') {
      const prod = payload.product.toLowerCase()
      if (!(prod === 'svgwiz' || prod === 'svgsus')) {
        return { valid: false, reason: 'Wrong product' }
      }
    }
    if (payload.expires && Date.now() > Number(payload.expires)) {
      return { valid: false, reason: 'License expired' }
    }
    return { valid: true, payload }
  } catch (e) {
    return { valid: false, reason: e?.message || 'Validation error' }
  }
})

// License public key helpers
ipcMain.handle('get-license-public-key', async () => {
  try {
    return store.get('licensePublicKey') || process.env.LICENSE_PUBLIC_KEY_BASE64 || ''
  } catch (_) {
    return ''
  }
})

ipcMain.handle('set-license-public-key', async (event, { keyBase64 }) => {
  try {
    if (typeof keyBase64 !== 'string' || keyBase64.length < 32) {
      throw new Error('Invalid key')
    }
    store.set('licensePublicKey', keyBase64)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Plan storage and external link helpers
ipcMain.handle('get-plan', async () => {
  try {
    const plan = store.get('plan') || 'free'
    return plan
  } catch (_) {
    return 'free'
  }
})

ipcMain.handle('set-plan', async (event, { plan }) => {
  try {
    store.set('plan', plan)
    return { success: true, plan }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// Stable per-install ID for correlating purchases
ipcMain.handle('get-install-id', async () => {
  try {
    return getOrCreateInstallId()
  } catch (_) {
    return 'unknown'
  }
})

// App version IPC
ipcMain.handle('get-app-version', async () => {
  try { return app.getVersion() } catch (_) { return 'unknown' }
})

ipcMain.handle('open-external', async (event, { url }) => {
  try {
    if (typeof url !== 'string') throw new Error('Invalid URL')
    const { protocol, hostname } = new URL(url)
    const https = protocol === 'https:'
    const allowed = https && ([...ALLOWED_OPEN].some(pattern => {
      if (pattern.startsWith('*.')) return hostname.endsWith(pattern.slice(1))
      return hostname === pattern
    }))
    if (!allowed) throw new Error('Domain not allowed')
    await shell.openExternal(url)
    return { success: true }
  } catch (error) {
    console.error('Failed to open external URL:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-stripe-link', async () => {
  try {
    const link = store.get('stripePaymentLink') || process.env.STRIPE_PAYMENT_LINK || ''
    return link
  } catch (_) {
    return ''
  }
})

ipcMain.handle('set-stripe-link', async (event, { link }) => {
  try {
    if (typeof link !== 'string' || !/^https?:\/\//i.test(link)) {
      throw new Error('Invalid link')
    }
    store.set('stripePaymentLink', link)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('save-file-dialog', async (event, { format }) => {
  const ext = getExtensionForFormatId(format)
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `output.${ext || 'txt'}`,
    filters: getFiltersForFormat(ext)
  })

  if (!result.canceled && result.filePath) {
    return result.filePath
  }
  return null
})

ipcMain.handle('save-to-file', async (event, { filePath, content }) => {
  try {
    if (!filePath || typeof content !== 'string') throw new Error('Bad input')
    if (!isAllowedPath(filePath)) throw new Error('Blocked path')
    fs.writeFileSync(filePath, content)
    return { success: true, filePath }
  } catch (e) {
    console.error('Failed to save file:', e)
    return { success: false, error: e.message }
  }
})

ipcMain.handle('quick-save', async (event, { baseName, extension, content }) => {
  try {
    const downloads = app.getPath('downloads')
    const safeBase = (String(baseName || 'icon').trim() || 'icon').replace(/[^a-zA-Z0-9._-]+/g, '-')
    const ext = String(extension || 'txt').replace(/^\.+/, '') || 'txt'
    const initial = path.join(downloads, `${safeBase}-cleaned.${ext}`)

    const uniquePath = (p) => {
      if (!fs.existsSync(p)) return p
      const dir = path.dirname(p)
      const base = path.basename(p, `.${ext}`)
      let i = 1
      let candidate = path.join(dir, `${base}-${i}.${ext}`)
      while (fs.existsSync(candidate)) {
        i += 1
        candidate = path.join(dir, `${base}-${i}.${ext}`)
      }
      return candidate
    }

    const target = uniquePath(initial)
    fs.writeFileSync(target, String(content ?? ''))
    return { success: true, filePath: target }
  } catch (e) {
    console.error('quick-save failed:', e)
    return { success: false, error: e?.message || 'quick-save failed' }
  }
})

// Helper for file filters
function getFiltersForFormat(format) {
  const filters = [
    { name: 'All Files', extensions: ['*'] }
  ]
  
  switch (format) {
    case 'svg':
      filters.unshift({ name: 'SVG Files', extensions: ['svg'] })
      break
    case 'css':
      filters.unshift({ name: 'CSS Files', extensions: ['css'] })
      break
    case 'swift':
      filters.unshift({ name: 'Swift Files', extensions: ['swift'] })
      break
    case 'xml':
      filters.unshift({ name: 'XML Files', extensions: ['xml'] })
      break
    case 'pug':
    case 'jade':
      filters.unshift({ name: 'Pug/Jade Files', extensions: ['pug', 'jade'] })
      break
  }
  
  return filters
}

// Map renderer format id to file extension
function getExtensionForFormatId (formatId) {
  switch (formatId) {
    case 'svg':
    case 'svgsymbol':
      return 'svg'
    case 'css':
      return 'css'
    case 'pug':
      return 'pug'
    case 'jade':
      return 'jade'
    case 'cashapelayer':
    case 'uibezierpath':
      return 'swift'
    case 'vectordrawable':
      return 'xml'
    default:
      return 'txt'
  }
}

// --- helpers ---
function getOrCreateInstallId () {
  try {
    let id = store.get('installId')
    if (!id) {
      try {
        id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex')
      } catch (_) {
        id = String(Date.now())
      }
      store.set('installId', id)
    }
    return String(id)
  } catch (e) {
    return 'unknown'
  }
}

function handleDeepLink (rawUrl) {
  try {
    const parsed = new URL(String(rawUrl))
    if (parsed.protocol !== 'svgwiz:' && parsed.protocol !== 'svgwiz://') return
    const host = (parsed.hostname || '').toLowerCase()
    const path = (parsed.pathname || '').toLowerCase()
    if (host === 'purchase' && path === '/success') {
      // Mark plan as paid and notify renderer to hide DonationBar
      try { store.set('plan', 'paid') } catch (_) {}
      try { mainWindow?.webContents?.send('plan-updated', 'paid') } catch (_) {}
    }
    // Allow resetting plan for testing via svgwiz://purchase/reset or svgwiz://purchase/free
    if (host === 'purchase' && (path === '/reset' || path === '/free')) {
      try { store.set('plan', 'free') } catch (_) {}
      try { mainWindow?.webContents?.send('plan-updated', 'free') } catch (_) {}
    }
  } catch (e) {
    try { console.error('Deep link handling failed:', e?.message || e) } catch (_) {}
  }
}

function base64UrlToBytes (b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64url.length % 4)) % 4)
  return base64ToBytes(b64)
}

function base64ToBytes (b64) {
  const bin = Buffer.from(b64, 'base64')
  return new Uint8Array(bin)
}

function base64UrlDecodeToString (b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64url.length % 4)) % 4)
  return Buffer.from(b64, 'base64').toString('utf8')
}
