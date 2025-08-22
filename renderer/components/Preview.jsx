import React, { useCallback, useEffect, useRef, useState } from 'react';

const Preview = ({ results, isProcessing, onAddTags, onRemoveTag, userTagsMap }) => {
  const [busyKey, setBusyKey] = useState(null)
  const [lastActionMsg, setLastActionMsg] = useState('')
  const [selected, setSelected] = useState(() => new Set()) // Set of filePaths
  const [bulkTags, setBulkTags] = useState('')
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null)
  const bulkInputRef = useRef(null)
  const longPressTimer = useRef(null)

  const toggleSelect = useCallback((filePath, index, withRange = false) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (withRange && lastSelectedIndex != null && Array.isArray(results) && results.length) {
        const start = Math.min(lastSelectedIndex, index)
        const end = Math.max(lastSelectedIndex, index)
        for (let i = start; i <= end; i++) {
          const it = results[i]
          const id = it?.filePath || it?.filename || String(i)
          next.add(id)
        }
      } else {
        if (next.has(filePath)) next.delete(filePath)
        else next.add(filePath)
      }
      return next
    })
    if (!withRange) setLastSelectedIndex(index)
  }, [lastSelectedIndex, results])

  const clearSelection = useCallback(() => setSelected(new Set()), [])

  const handleBulkAddTags = useCallback(() => {
    const list = String(bulkTags || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
    if (!list.length || selected.size === 0) return
    try {
      onAddTags && onAddTags(Array.from(selected), list)
      setLastActionMsg(`Tagged ${selected.size} item${selected.size !== 1 ? 's' : ''}`)
      setBulkTags('')
    } catch (_) {}
  }, [bulkTags, selected, onAddTags])

  // Keyboard shortcuts for bulk bar
  useEffect(() => {
    const onKey = (e) => {
      if (selected.size === 0) return
      if (e.key === 'Enter') {
        e.preventDefault()
        handleBulkAddTags()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        clearSelection()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected.size, handleBulkAddTags, clearSelection])

  // Focus input when bulk bar opens
  useEffect(() => {
    if (selected.size > 0) setTimeout(() => { try { bulkInputRef.current?.focus() } catch(_) {} }, 0)
  }, [selected.size])

  const cleanSvg = useCallback(async (item) => {
    try {
      const existing = (item?.output || '').trim()
      if (existing) return existing
      if (!item?.filePath) return ''
      const resp = await window.api.processSvg(item.filePath, 'svg', {})
      if (resp?.success && typeof resp.output === 'string') return resp.output
      // fallback to existing output
      return existing
    } catch (e) {
      try { console.warn('cleanSvg failed:', e) } catch (_) {}
      return (item?.output || '')
    }
  }, [])

  const handleQuickDownload = useCallback(async (item) => {
    try {
      setBusyKey(item.filename)
      const content = await cleanSvg(item)
      const res = await window.api.quickSave(item.baseName || 'icon', 'svg', content)
      if (res?.success) setLastActionMsg(`Saved to Downloads: ${res.filePath.split('/').pop()}`)
      else setLastActionMsg(res?.error || 'Save failed')
    } finally {
      setBusyKey(null)
      setTimeout(() => setLastActionMsg(''), 2000)
    }
  }, [cleanSvg])

  const handleSaveAs = useCallback(async (item) => {
    try {
      setBusyKey(item.filename)
      const content = await cleanSvg(item)
      const target = await window.api.saveFileDialog('svg')
      if (!target) return
      const res = await window.api.saveToFile(target, content)
      if (res?.success) setLastActionMsg('Saved')
      else setLastActionMsg(res?.error || 'Save failed')
    } finally {
      setBusyKey(null)
      setTimeout(() => setLastActionMsg(''), 1500)
    }
  }, [cleanSvg])

  const handleCopy = useCallback(async (item) => {
    try {
      setBusyKey(item.filename)
      const content = await cleanSvg(item)
      await navigator.clipboard.writeText(content)
      setLastActionMsg('Copied')
    } catch (e) {
      setLastActionMsg('Copy failed')
    } finally {
      setBusyKey(null)
      setTimeout(() => setLastActionMsg(''), 1200)
    }
  }, [cleanSvg])
  if (isProcessing) {
    return (
      <div className="flex-1 flex items-center justify-center p-8" aria-live="polite">
        <div className="text-center">
          <div 
            className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-t-primary border-r-primary border-b-transparent border-l-transparent mb-4"
            role="progressbar"
            aria-label="Processing SVG files"
          ></div>
          <p className="text-text">Processing SVG files...</p>
        </div>
      </div>
    );
  }

  if (!results?.length) {
    return (
      <div className="flex-1 flex items-center justify-center p-8" aria-live="polite">
        <p className="text-center text-text-light dark:text-text-light">No results to display</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-2 sm:p-4" role="region" aria-label="SVG Preview Results">
      <div className="flex items-center justify-between mb-2">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="w-4 h-4 accent-[var(--color-primary)]"
            checked={selected.size > 0 && selected.size === results.length}
            onChange={(e) => {
              const all = e.target.checked
              setSelected(() => {
                if (!all) return new Set()
                const s = new Set()
                results.forEach((r, i) => {
                  const id = r.filePath || r.filename || String(i)
                  s.add(id)
                })
                return s
              })
            }}
            aria-label="Select all"
          />
          <span>Select all</span>
        </label>
        <div className="text-xs text-text-light">{selected.size} selected</div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 gap-1.5">
        {results.map((result, index) => {
          const fileId = result.filePath || result.filename || String(index)
          const isSel = selected.has(fileId)
          return (
          <div 
            key={fileId} 
            className={`border border-border rounded-md overflow-hidden bg-surface hover:shadow-sm transition-shadow duration-200 relative group ${isSel ? 'ring-2 ring-primary' : ''}`}
            onContextMenu={(e) => { e.preventDefault(); setSelected(prev => new Set(prev).add(fileId)); setTimeout(() => bulkInputRef.current?.focus(), 0) }}
            onTouchStart={() => {
              clearTimeout(longPressTimer.current)
              longPressTimer.current = setTimeout(() => {
                setSelected(prev => new Set(prev).add(fileId))
                try { bulkInputRef.current?.focus() } catch(_) {}
              }, 450)
            }}
            onTouchEnd={() => { clearTimeout(longPressTimer.current) }}
            onTouchCancel={() => { clearTimeout(longPressTimer.current) }}
          >
            <div className="absolute top-1 left-1 z-10 bg-background/80 dark:bg-surface/70 border border-border rounded-sm backdrop-blur px-1 py-0.5">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-[var(--color-primary)]"
                  aria-label={`Select ${result.filename}`}
                  checked={isSel}
                  onChange={(e) => toggleSelect(fileId, index, e.shiftKey)}
                />
                <span className="text-[10px]">Select</span>
              </label>
            </div>
            <div className="p-1 bg-background border-b border-border flex items-center justify-between">
              <h3 className="font-medium truncate text-[10px]" title={result.filename}>
                {result.filename}
              </h3>
            </div>
            <div className="p-1.5 h-20 sm:h-24 md:h-28 overflow-hidden">
              <div className="absolute top-1 right-1 z-10 flex gap-1 bg-background/80 dark:bg-surface/70 border border-border rounded-sm backdrop-blur px-1 py-0.5">
                <button
                  className="p-1 rounded hover:bg-surface disabled:opacity-50"
                  aria-label="Quick download cleaned SVG"
                  disabled={busyKey === result.filename}
                  onClick={() => handleQuickDownload(result)}
                  title="Quick Download"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </button>
                <button
                  className="p-1 rounded hover:bg-surface disabled:opacity-50"
                  aria-label="Save cleaned SVG as…"
                  disabled={busyKey === result.filename}
                  onClick={() => handleSaveAs(result)}
                  title="Save As"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V7l4-4h10l4 4v12a2 2 0 0 1-2 2z"/>
                    <path d="M17 21v-8H7v8"/>
                    <path d="M7 3v4h10V3"/>
                  </svg>
                </button>
                <button
                  className="p-1 rounded hover:bg-surface disabled:opacity-50"
                  aria-label="Copy cleaned SVG"
                  disabled={busyKey === result.filename}
                  onClick={() => handleCopy(result)}
                  title="Copy"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </button>
              </div>
              {result.error ? (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded p-3">
                  <p className="font-medium mb-1">Error</p>
                  <p>{result.error}</p>
                </div>
              ) : (
                <div 
                  className="svg-tile h-full ring-1 ring-border"
                  dangerouslySetInnerHTML={{ 
                    __html: result.preview || result.output 
                  }}
                  aria-label={`SVG preview for ${result.filename}`}
                />
              )}
              {/* User tag chips */}
              {!!(userTagsMap && userTagsMap[result.filePath]?.length) && (
                <div className="absolute left-1 bottom-1 z-10 flex flex-wrap gap-1 max-w-[90%]">
                  {userTagsMap[result.filePath].map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-background/80 dark:bg-surface/70 border border-border">
                      <span className="truncate max-w-[6rem]" title={tag}>{tag}</span>
                      <button
                        className="w-4 h-4 inline-flex items-center justify-center rounded hover:bg-background"
                        aria-label={`Remove tag ${tag}`}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemoveTag && onRemoveTag(result.filePath, tag) }}
                        title="Remove tag"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )})}
      </div>
      {selected.size > 0 && (
        <div className="fixed left-2 right-2 bottom-28 md:bottom-4 z-30 bg-surface/95 backdrop-blur border border-border rounded-lg shadow-sm p-2 sm:p-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <div className="text-sm"><strong>{selected.size}</strong> selected</div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label htmlFor="bulkTags" className="sr-only">Tags to add</label>
              <input
                id="bulkTags"
                type="text"
                value={bulkTags}
                onChange={(e) => setBulkTags(e.target.value)}
                placeholder="tag1, tag2, tag3"
                className="flex-1 sm:w-64 px-3 py-2 rounded-md bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleBulkAddTags() } }}
                ref={bulkInputRef}
              />
              <button
                onClick={handleBulkAddTags}
                className="px-3 py-2 rounded-md bg-primary text-white hover:opacity-90"
                aria-label="Add tags to selected"
              >
                Add tags
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-2 rounded-md border border-border hover:bg-background"
                aria-label="Clear selection"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
      {lastActionMsg && (
        <div className="fixed bottom-20 md:bottom-4 right-4 bg-surface border border-border rounded-md px-3 py-1.5 shadow-sm text-sm" role="status" aria-live="polite">{lastActionMsg}</div>
      )}
    </div>
  );
};

export default Preview;
