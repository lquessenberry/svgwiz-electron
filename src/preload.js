const { contextBridge, ipcRenderer } = require('electron')
// Note: License validation moved to main process to avoid heavy deps in preload

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // SVG Processing
  processSvg: (filePath, format, options) => {
    return ipcRenderer.invoke('process-svg', { filePath, format, options })
  },
  processSvgBatch: (filePaths, format, options) => {
    return ipcRenderer.invoke('process-svg-batch', { filePaths, format, options })
  },
  
  // File Operations
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
  chooseFolder: () => ipcRenderer.invoke('choose-folder'),
  // Vault: index and search
  vaultIndex: (rootDir) => ipcRenderer.invoke('vault-index', { rootDir }),
  vaultSearch: (rootDir, query, filters) => ipcRenderer.invoke('vault-search', { rootDir, query, filters }),
  // Ask main to open a Save dialog for a given format id, returns a file path string
  saveFileDialog: (format) => ipcRenderer.invoke('save-file-dialog', { format }),
  // Write content to disk at a chosen path
  saveToFile: (filePath, content) => ipcRenderer.invoke('save-to-file', { filePath, content }),
  // Quick save directly to Downloads with automatic unique naming
  quickSave: (baseName, extension, content) => ipcRenderer.invoke('quick-save', { baseName, extension, content }),

  // Git operations
  gitInit: (dir) => ipcRenderer.invoke('git-init', { dir }),
  gitStatus: (dir) => ipcRenderer.invoke('git-status', { dir }),
  gitCommit: (dir, message) => ipcRenderer.invoke('git-commit', { dir, message }),
  gitBranch: (dir, name) => ipcRenderer.invoke('git-branch', { dir, name }),
  gitMerge: (dir, sourceBranch) => ipcRenderer.invoke('git-merge', { dir, sourceBranch }),
  gitLog: (dir, limit) => ipcRenderer.invoke('git-log', { dir, limit }),

  // Exports
  exportRaster: (input, format, options) => ipcRenderer.invoke('export-raster', { input, format, options }),
  
  // App info
  getAppVersion: () => process.env.npm_package_version,
  
  // Logging
  logError: (message, error) => ipcRenderer.invoke('log-error', { message, error }),
  
  // Format options
  getAvailableFormats: () => {
    return [
      { id: 'svg', name: 'SVG (Cleaned)', extension: '.svg' },
      { id: 'svgsymbol', name: 'SVG Symbol', extension: '.svg' },
      { id: 'css', name: 'CSS Background', extension: '.css' },
      { id: 'pug', name: 'Pug Template', extension: '.pug' },
      { id: 'jade', name: 'Jade Template', extension: '.jade' },
      { id: 'cashapelayer', name: 'Swift Shape Layer', extension: '.swift' },
      { id: 'uibezierpath', name: 'Swift UIBezierPath', extension: '.swift' },
      { id: 'vectordrawable', name: 'Android Vector Drawable', extension: '.xml' }
    ]
  },
  
  // Get format-specific options
  getFormatOptions: (format) => {
    const commonOptions = {
      compressed: { type: 'boolean', label: 'Compressed', default: false }
    }
    
    switch (format) {
      case 'svgsymbol':
        return {
          ...commonOptions,
          stripStyle: { type: 'boolean', label: 'Strip Style', default: false },
          name: { type: 'text', label: 'Symbol Name', default: 'svg-symbol' }
        }
      case 'cashapelayer':
      case 'uibezierpath':
        return {
          ...commonOptions,
          codeType: { 
            type: 'select', 
            label: 'Platform',
            options: [
              { value: 'UIKit', label: 'iOS (UIKit)' },
              { value: 'AppKit', label: 'macOS (AppKit)' }
            ],
            default: 'UIKit'
          }
        }
      default:
        return commonOptions
    }
  },
  
  // Plan and external link helpers
  getPlan: () => ipcRenderer.invoke('get-plan'),
  setPlan: (plan) => ipcRenderer.invoke('set-plan', { plan }),
  openExternal: (url) => ipcRenderer.invoke('open-external', { url }),
  getStripeLink: () => ipcRenderer.invoke('get-stripe-link'),
  setStripeLink: (link) => ipcRenderer.invoke('set-stripe-link', { link }),
  getInstallId: () => ipcRenderer.invoke('get-install-id'),
  onPlanUpdated: (callback) => {
    try {
      if (typeof callback !== 'function') return () => {}
      const handler = (_event, plan) => {
        try { callback(plan) } catch (_) {}
      }
      ipcRenderer.on('plan-updated', handler)
      // return unsubscribe
      return () => {
        try { ipcRenderer.removeListener('plan-updated', handler) } catch (_) {}
      }
    } catch (_) {
      return () => {}
    }
  },
  waitForPaid: async () => {
    try {
      const current = await ipcRenderer.invoke('get-plan')
      if (current === 'paid') return 'paid'
    } catch (_) {}
    return new Promise((resolve) => {
      const handler = (_event, plan) => {
        if (plan === 'paid') {
          try { ipcRenderer.removeListener('plan-updated', handler) } catch (_) {}
          resolve('paid')
        }
      }
      ipcRenderer.on('plan-updated', handler)
    })
  },

  // License helpers
  getLicense: () => ipcRenderer.invoke('get-license'),
  setLicense: (license) => ipcRenderer.invoke('set-license', { license }),
  clearLicense: () => ipcRenderer.invoke('clear-license'),
  validateLicense: (license) => ipcRenderer.invoke('validate-license', { license }),
  getLicensePublicKey: () => ipcRenderer.invoke('get-license-public-key'),
  setLicensePublicKey: (keyBase64) => ipcRenderer.invoke('set-license-public-key', { keyBase64 })
})

// --- helpers ---
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
