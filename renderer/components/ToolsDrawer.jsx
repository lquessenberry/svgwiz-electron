import React, { useState } from 'react'

const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3 py-2 text-sm rounded-md border transition-colors ${
      active ? 'bg-primary/10 text-primary border-primary/30' : 'bg-background text-text border-border hover:bg-surface'
    }`}
  >
    {children}
  </button>
)

export default function ToolsDrawer({ open, onClose }) {
  const [tab, setTab] = useState('vault')

  // Busy/notice banner
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  // Vault state
  const [vaultDir, setVaultDir] = useState('')
  const [vaultIndex, setVaultIndex] = useState(null)
  const [vaultQuery, setVaultQuery] = useState('')
  const [minPaths, setMinPaths] = useState('')
  const [maxPaths, setMaxPaths] = useState('')
  const [fill, setFill] = useState('')
  const [stroke, setStroke] = useState('')
  const [vaultResults, setVaultResults] = useState(null)

  // Git state
  const [repoDir, setRepoDir] = useState('')
  const [gitStatus, setGitStatus] = useState(null)
  const [commitMsg, setCommitMsg] = useState('chore(svgwiz): update assets')
  const [gitHistory, setGitHistory] = useState([])

  // Export state
  const [inputPath, setInputPath] = useState('')
  const [rFormat, setRFormat] = useState('png')
  const [rWidth, setRWidth] = useState('')
  const [rHeight, setRHeight] = useState('')
  const [rDensity, setRDensity] = useState(300)
  const [previewDataUrl, setPreviewDataUrl] = useState('')

  if (!open) return null

  const withBusy = async (fn) => {
    try {
      setBusy(true)
      setNotice('')
      await fn()
    } catch (e) {
      setNotice(e?.message || 'Operation failed')
    } finally {
      setBusy(false)
    }
  }

  // Vault handlers
  const chooseVault = async () => {
    const dir = await window.api.chooseFolder()
    if (dir) setVaultDir(dir)
  }

  const doIndex = () => withBusy(async () => {
    if (!vaultDir) return setNotice('Select a vault root first')
    const resp = await window.api.vaultIndex(vaultDir)
    if (!resp?.success) return setNotice(resp?.error || 'Indexing failed')
    setVaultIndex(resp.index)
  })

  const doSearch = () => withBusy(async () => {
    if (!vaultDir) return setNotice('Select a vault root first')
    const filters = {}
    if (minPaths) filters.minPaths = Number(minPaths)
    if (maxPaths) filters.maxPaths = Number(maxPaths)
    if (fill) filters.fill = fill
    if (stroke) filters.stroke = stroke
    const resp = await window.api.vaultSearch(vaultDir, vaultQuery, filters)
    if (!resp?.success) return setNotice(resp?.error || 'Search failed')
    setVaultResults(resp.results)
  })

  // Git handlers
  const chooseRepo = async () => {
    const dir = await window.api.chooseFolder()
    if (dir) setRepoDir(dir)
  }

  const gitInit = () => withBusy(async () => {
    if (!repoDir) return setNotice('Choose a repo directory first')
    const resp = await window.api.gitInit(repoDir)
    if (!resp?.success) return setNotice(resp?.error || 'Git init failed')
    setNotice(resp.initialized ? 'Repository initialized' : 'Already a repository')
  })

  const gitRefreshStatus = () => withBusy(async () => {
    if (!repoDir) return setNotice('Choose a repo directory first')
    const resp = await window.api.gitStatus(repoDir)
    if (!resp?.success) return setNotice(resp?.error || 'Git status failed')
    setGitStatus(resp.status)
  })

  const gitDoCommit = () => withBusy(async () => {
    if (!repoDir) return setNotice('Choose a repo directory first')
    const resp = await window.api.gitCommit(repoDir, commitMsg)
    if (!resp?.success) return setNotice(resp?.error || 'Git commit failed')
    setNotice('Committed')
    gitRefreshStatus()
  })

  const gitLoadLog = () => withBusy(async () => {
    if (!repoDir) return setNotice('Choose a repo directory first')
    const resp = await window.api.gitLog(repoDir, 20)
    if (!resp?.success) return setNotice(resp?.error || 'Git log failed')
    const list = Array.isArray(resp.log?.all) ? resp.log.all : (Array.isArray(resp.log) ? resp.log : [])
    setGitHistory(list)
  })

  // Export handlers
  const chooseSvgFile = async () => {
    const files = await window.api.openFileDialog()
    if (Array.isArray(files) && files[0]) setInputPath(files[0])
  }

  const doRasterize = () => withBusy(async () => {
    if (!inputPath) return setNotice('Choose an input SVG file')
    const options = {}
    if (rWidth) options.width = Number(rWidth)
    if (rHeight) options.height = Number(rHeight)
    if (rDensity) options.density = Number(rDensity)
    const resp = await window.api.exportRaster(inputPath, rFormat, options)
    if (!resp?.success) return setNotice(resp?.error || 'Raster export failed (install sharp?)')
    if (resp.base64) setPreviewDataUrl(`data:${resp.contentType || 'image/png'};base64,${resp.base64}`)
  })

  return (
    <div className="fixed inset-0 z-40">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* drawer */}
      <section
        role="dialog"
        aria-modal="true"
        className="absolute inset-0 md:inset-y-0 md:right-0 h-full w-full md:w-[380px] bg-surface md:border-l md:border-border shadow-xl flex flex-col transition-transform"
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <TabButton active={tab === 'vault'} onClick={() => setTab('vault')}>Vault</TabButton>
            <TabButton active={tab === 'git'} onClick={() => setTab('git')}>Git</TabButton>
            <TabButton active={tab === 'export'} onClick={() => setTab('export')}>Export</TabButton>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-background"
            aria-label="Close tools"
            title="Close"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        {busy && (
          <div className="px-4 py-2 text-xs text-text-light">Working…</div>
        )}
        {!!notice && (
          <div className="px-4 py-2 text-xs text-amber-600 dark:text-amber-300">{notice}</div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'vault' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button onClick={chooseVault} className="px-3 py-2 text-sm rounded-md bg-background border border-border hover:bg-surface">Choose Vault Root</button>
                <button onClick={doIndex} className="px-3 py-2 text-sm rounded-md bg-background border border-border hover:bg-surface" disabled={!vaultDir}>Index</button>
              </div>
              <div className="text-xs text-text-light break-all">{vaultDir || 'No vault selected'}</div>

              {vaultIndex && (
                <div className="text-sm">
                  <div className="mb-2">Indexed <span className="font-medium">{vaultIndex.count}</span> items</div>
                  {!!vaultIndex.colors?.length && (
                    <div className="flex flex-wrap gap-2">
                      {vaultIndex.colors.slice(0, 16).map((c, i) => (
                        <div key={i} className="flex items-center gap-1 text-xs">
                          <span className="inline-block w-3 h-3 rounded" style={{ background: c.color }} />
                          <span className="text-text-light">{c.color} ({c.count})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <input value={vaultQuery} onChange={e => setVaultQuery(e.target.value)} placeholder="Search text…" className="col-span-2 px-3 py-2 rounded-md bg-background border border-border" />
                <input value={minPaths} onChange={e => setMinPaths(e.target.value)} placeholder="Min paths" className="px-3 py-2 rounded-md bg-background border border-border" />
                <input value={maxPaths} onChange={e => setMaxPaths(e.target.value)} placeholder="Max paths" className="px-3 py-2 rounded-md bg-background border border-border" />
                <input value={fill} onChange={e => setFill(e.target.value)} placeholder="Fill color" className="px-3 py-2 rounded-md bg-background border border-border" />
                <input value={stroke} onChange={e => setStroke(e.target.value)} placeholder="Stroke color" className="px-3 py-2 rounded-md bg-background border border-border" />
                <div className="col-span-2">
                  <button onClick={doSearch} className="px-3 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90">Search</button>
                </div>
              </div>

              {vaultResults && (
                <div>
                  <div className="text-sm mb-2">Results: <span className="font-medium">{vaultResults.count}</span></div>
                  <ul className="space-y-1 max-h-64 overflow-auto pr-1">
                    {vaultResults.items.slice(0, 50).map((it, i) => (
                      <li key={i} className="text-xs flex items-center justify-between border-b border-border/60 py-1">
                        <span className="truncate mr-2" title={it.file}>{it.name}</span>
                        <span className="text-text-light">{it.pathCount} paths</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {tab === 'git' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button onClick={chooseRepo} className="px-3 py-2 text-sm rounded-md bg-background border border-border hover:bg-surface">Choose Repo Dir</button>
                <button onClick={gitInit} className="px-3 py-2 text-sm rounded-md bg-background border border-border hover:bg-surface" disabled={!repoDir}>Init</button>
                <button onClick={gitRefreshStatus} className="px-3 py-2 text-sm rounded-md bg-background border border-border hover:bg-surface" disabled={!repoDir}>Status</button>
              </div>
              <div className="text-xs text-text-light break-all">{repoDir || 'No repo selected'}</div>

              <div className="grid grid-cols-1 gap-2">
                <input value={commitMsg} onChange={e => setCommitMsg(e.target.value)} placeholder="Commit message" className="px-3 py-2 rounded-md bg-background border border-border" />
                <div>
                  <button onClick={gitDoCommit} className="px-3 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90" disabled={!repoDir}>Commit</button>
                </div>
              </div>

              {gitStatus && (
                <div className="text-xs space-y-1">
                  <div>Branch: <span className="font-medium">{gitStatus.current || '-'}</span></div>
                  <div>Ahead/Behind: {gitStatus.ahead || 0}/{gitStatus.behind || 0}</div>
                  {!!gitStatus.files?.length && (
                    <div className="mt-2">
                      <div className="text-text-light">Changed files:</div>
                      <ul className="list-disc pl-5">
                        {gitStatus.files.slice(0, 20).map((f, i) => (
                          <li key={i}>{f.path} <span className="text-text-light">({f.working_dir || f.workingTree || '?'})</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div>
                <button onClick={gitLoadLog} className="px-3 py-2 text-sm rounded-md bg-background border border-border hover:bg-surface" disabled={!repoDir}>Load Log</button>
                {!!gitHistory.length && (
                  <ul className="mt-2 space-y-1 max-h-40 overflow-auto pr-1 text-xs">
                    {gitHistory.map((e, i) => (
                      <li key={i} className="border-b border-border/60 pb-1">
                        <div className="font-medium truncate" title={e.hash}>{e.message || '(no message)'}</div>
                        <div className="text-text-light">{e.author_name} • {e.date}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {tab === 'export' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button onClick={chooseSvgFile} className="px-3 py-2 text-sm rounded-md bg-background border border-border hover:bg-surface">Choose SVG</button>
                <div className="text-xs text-text-light truncate max-w-[12rem]" title={inputPath}>{inputPath || 'No file selected'}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="col-span-2 text-xs text-text-light">Format</label>
                <select value={rFormat} onChange={e => setRFormat(e.target.value)} className="col-span-2 px-3 py-2 rounded-md bg-background border border-border">
                  <option value="png">PNG</option>
                  <option value="jpeg">JPEG</option>
                  <option value="webp">WebP</option>
                  <option value="avif">AVIF</option>
                </select>
                <input value={rWidth} onChange={e => setRWidth(e.target.value)} placeholder="Width (px)" className="px-3 py-2 rounded-md bg-background border border-border" />
                <input value={rHeight} onChange={e => setRHeight(e.target.value)} placeholder="Height (px)" className="px-3 py-2 rounded-md bg-background border border-border" />
                <input value={rDensity} onChange={e => setRDensity(e.target.value)} placeholder="Density (dpi)" className="px-3 py-2 rounded-md bg-background border border-border" />
                <div className="col-span-2">
                  <button onClick={doRasterize} className="px-3 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90" disabled={!inputPath}>Rasterize (preview)</button>
                </div>
              </div>

              {previewDataUrl && (
                <div className="mt-2 border border-border rounded-md p-2 bg-background">
                  <img src={previewDataUrl} alt="Raster preview" className="max-w-full h-auto" />
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
