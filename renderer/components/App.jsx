import React, { useState, useEffect, useCallback, useReducer, useMemo, useRef } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import DropZone from './DropZone';
import Preview from './Preview';
import DonationBar from './DonationBar';
import ToolsDrawer from './ToolsDrawer';
import BottomNav from './BottomNav';

// Define action types for state reducer
const actionTypes = {
  SET_THEME: 'SET_THEME',
  SET_FILES: 'SET_FILES',
  SET_FORMAT: 'SET_FORMAT',
  SET_OPTIONS: 'SET_OPTIONS',
  SET_PROCESSING: 'SET_PROCESSING',
  SET_RESULTS: 'SET_RESULTS',
  SET_ERROR: 'SET_ERROR',
  RESET_ERROR: 'RESET_ERROR',
  RESET_APP: 'RESET_APP'
};

// Initial state
const initialState = {
  theme: 'system',
  files: [],
  format: 'svg',
  options: {},
  isProcessing: false,
  processedResults: [],
  error: null
};

// Reducer function for state management
const appReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.SET_THEME:
      return { ...state, theme: action.payload };
    case actionTypes.SET_FILES:
      return { ...state, files: action.payload };
    case actionTypes.SET_FORMAT:
      return { ...state, format: action.payload };
    case actionTypes.SET_OPTIONS:
      return { ...state, options: { ...state.options, ...action.payload } };
    case actionTypes.SET_PROCESSING:
      return { ...state, isProcessing: action.payload };
    case actionTypes.SET_RESULTS:
      return { ...state, processedResults: action.payload };
    case actionTypes.SET_ERROR:
      return { ...state, error: action.payload };
    case actionTypes.RESET_ERROR:
      return { ...state, error: null };
    case actionTypes.RESET_APP:
      return { ...initialState, theme: state.theme }; // Keep theme preference
    default:
      return state;
  }
};

const App = () => {
  // Use reducer for complex state management
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { theme, files, format, options, isProcessing, processedResults, error } = state;
  const [searchQuery, setSearchQuery] = useState('');
  const [toolsOpen, setToolsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('library');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'name' | 'tags'
  const [recentSearches, setRecentSearches] = useState([]);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [userTagsMap, setUserTagsMap] = useState({}); // { [filePath]: string[] }
  const contentRef = useRef(null);
  const searchInputRef = useRef(null);

  const deriveTags = useCallback((fullPath) => {
    try {
      const parts = String(fullPath).split(/[\\\/]+/);
      const file = parts.pop() || '';
      const stem = file.replace(/\.[^.]+$/, '');
      const nameTokens = stem.split(/[^a-zA-Z0-9]+/).filter(Boolean);
      const folderTokens = parts.slice(-2).flatMap(p => String(p).split(/[^a-zA-Z0-9]+/).filter(Boolean));
      const set = new Set([...nameTokens, ...folderTokens].map(t => t.toLowerCase()))
      return Array.from(set);
    } catch (_) {
      return [];
    }
  }, []);

  // Remove a single tag from a file's user tag list
  const handleRemoveTag = useCallback((filePath, tag) => {
    setUserTagsMap(prev => {
      const next = { ...prev };
      const list = Array.isArray(next[filePath]) ? next[filePath] : [];
      const filtered = list.filter(t => t !== tag);
      if (filtered.length) next[filePath] = filtered; else delete next[filePath];
      return next;
    });
  }, []);

  // Debounce search input
  useEffect(() => {
    const h = setTimeout(() => setDebouncedQuery(searchQuery), 200);
    return () => clearTimeout(h);
  }, [searchQuery]);

  const filteredResults = useMemo(() => {
    const q = (debouncedQuery || '').trim().toLowerCase();
    if (!q) return processedResults;
    try {
      return processedResults.filter(r => {
        const name = (r?.filename || '').toLowerCase();
        const baseTags = (Array.isArray(r?.tags) && r.tags.length)
          ? r.tags
          : deriveTags(r?.filePath || r?.filename || '');
        const extra = Array.isArray(userTagsMap?.[r?.filePath]) ? userTagsMap[r.filePath] : [];
        const combined = Array.from(new Set([...(baseTags || []), ...(extra || [])]));
        const tags = combined.map(t => String(t).toLowerCase());
        if (filterMode === 'name') return name.includes(q);
        if (filterMode === 'tags') return tags.some(t => t.includes(q));
        return name.includes(q) || tags.some(t => t.includes(q));
      });
    } catch (_) {
      return processedResults;
    }
  }, [processedResults, debouncedQuery, filterMode, userTagsMap]);
  
  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'system';
    dispatch({ type: actionTypes.SET_THEME, payload: savedTheme });
  }, []);

  // Initialize search preferences from localStorage
  useEffect(() => {
    try {
      const rs = JSON.parse(localStorage.getItem('recentSearches') || '[]');
      if (Array.isArray(rs)) setRecentSearches(rs);
    } catch (_) {}
    try {
      const fm = localStorage.getItem('filterMode') || 'all';
      setFilterMode(['all','name','tags'].includes(fm) ? fm : 'all');
    } catch (_) {}
    try {
      const ut = JSON.parse(localStorage.getItem('userTagsMap') || '{}');
      if (ut && typeof ut === 'object') setUserTagsMap(ut);
    } catch (_) {}
  }, []);
  
  // Handle theme switching
  useEffect(() => {
    const applyTheme = () => {
      const isDark = 
        theme === 'dark' || 
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      
      document.documentElement.classList.toggle('dark', isDark);
    };
    
    applyTheme();
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') applyTheme();
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Persist search preferences
  useEffect(() => {
    try { localStorage.setItem('recentSearches', JSON.stringify(recentSearches)); } catch (_) {}
  }, [recentSearches]);
  useEffect(() => {
    try { localStorage.setItem('filterMode', filterMode); } catch (_) {}
  }, [filterMode]);
  useEffect(() => {
    try { localStorage.setItem('userTagsMap', JSON.stringify(userTagsMap)); } catch (_) {}
  }, [userTagsMap]);
  
  // Toggle theme function
  const toggleTheme = useCallback(() => {
    const themeMap = { system: 'light', light: 'dark', dark: 'system' };
    const newTheme = themeMap[theme];
    dispatch({ type: actionTypes.SET_THEME, payload: newTheme });
    localStorage.setItem('theme', newTheme);
  }, [theme]);
  
  // Error reset function
  const resetError = useCallback(() => {
    dispatch({ type: actionTypes.RESET_ERROR });
  }, []);
  
  // Process SVG files using the preload bridge
  const processSvgFiles = useCallback(async (filesToProcess) => {
    const filesToUse = filesToProcess || files;
    if (!filesToUse?.length) return;
    
    dispatch({ type: actionTypes.SET_PROCESSING, payload: true });
    dispatch({ type: actionTypes.RESET_ERROR });
    
    try {
      const resp = await window.api.processSvgBatch(filesToUse, format, options);
      if (!resp?.success) {
        throw new Error(resp?.error || 'Batch processing failed');
      }
      const outputs = Array.isArray(resp.outputs) ? resp.outputs : [];
      const mapped = outputs.map((out, idx) => {
        const full = String(filesToUse[idx] || '');
        const filename = full.split(/[\\\/]/).pop() || `Output ${idx + 1}`;
        const baseName = filename.replace(/\.[^.]+$/, '')
        const tags = deriveTags(full);
        return { filename, baseName, filePath: full, output: out, tags };
      });
      dispatch({ type: actionTypes.SET_RESULTS, payload: mapped });
      // Subtle success cue
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = 880; // A5
          osc.connect(gain);
          gain.connect(ctx.destination);
          const now = ctx.currentTime;
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
          osc.start(now);
          osc.stop(now + 0.26);
          setTimeout(() => { try { ctx.close(); } catch (_) {} }, 400);
        }
      } catch (_) {}
    } catch (err) {
      console.error('Error processing SVGs:', err);
      dispatch({ 
        type: actionTypes.SET_ERROR, 
        payload: err.message || 'An error occurred while processing SVG files' 
      });
    } finally {
      dispatch({ type: actionTypes.SET_PROCESSING, payload: false });
    }
  }, [files, format, options]);
  
  // Handle file selection
  const handleFilesSelected = useCallback((newFiles) => {
    const combined = Array.from(new Set([...(files || []), ...(newFiles || [])]));
    dispatch({ type: actionTypes.SET_FILES, payload: combined });
    processSvgFiles(combined);
  }, [files, processSvgFiles]);
  
  // Handle format change
  const handleFormatChange = useCallback((newFormat) => {
    dispatch({ type: actionTypes.SET_FORMAT, payload: newFormat });
    if (files.length > 0) {
      processSvgFiles(null); // Use current files from state
    }
  }, [files.length, processSvgFiles]);
  
  // Handle options change
  const handleOptionsChange = useCallback((newOptions) => {
    dispatch({ type: actionTypes.SET_OPTIONS, payload: newOptions });
    if (files.length > 0) {
      processSvgFiles(null); // Use current files from state
    }
  }, [files.length, processSvgFiles]);
  
  // Reset application state
  const handleReset = useCallback(() => {
    dispatch({ type: actionTypes.RESET_APP });
  }, []);

  // Bulk add user tags to selected file paths
  const handleAddTags = useCallback((filePaths, tags) => {
    try {
      const clean = (tags || []).map(t => String(t).trim()).filter(Boolean);
      if (!Array.isArray(filePaths) || !filePaths.length || !clean.length) return;
      setUserTagsMap(prev => {
        const next = { ...prev };
        for (const fp of filePaths) {
          const existing = Array.isArray(next[fp]) ? next[fp] : [];
          next[fp] = Array.from(new Set([...existing, ...clean]));
        }
        return next;
      });
    } catch (_) {}
  }, []);

  // Commit current search to recents
  const commitSearch = useCallback(() => {
    const q = (searchQuery || '').trim();
    if (!q) return;
    setRecentSearches(prev => {
      const next = [q, ...prev.filter(v => v.toLowerCase() !== q.toLowerCase())];
      return next.slice(0, 8);
    });
  }, [searchQuery]);

  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === 'Enter') commitSearch();
  }, [commitSearch]);

  // Handle BottomNav tab selection (special behavior for 'add')
  const handleSelectTab = useCallback(async (tab) => {
    if (tab === 'add') {
      try {
        const selected = await window.api.openFolderDialog();
        if (Array.isArray(selected) && selected.length) {
          handleFilesSelected(selected);
        }
      } catch (_) {}
      setActiveTab('library');
      return;
    }
    if (tab === 'search') {
      setActiveTab('search');
      setTimeout(() => {
        try { searchInputRef.current?.focus(); } catch (_) {}
        try { contentRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' }); } catch (_) {}
      }, 0);
      return;
    }
    setActiveTab(tab);
  }, [handleFilesSelected]);

  return (
    <div className="flex flex-col h-screen bg-background text-text">
      <Header 
        toggleTheme={toggleTheme} 
        theme={theme}
        onToggleTools={() => setToolsOpen(v => !v)}
        toolsOpen={toolsOpen}
      />
      
      <main className="flex flex-1 overflow-hidden pb-24 md:pb-0" aria-busy={isProcessing}>
        <div className="hidden md:block">
          <Sidebar 
            format={format} 
            onFormatChange={handleFormatChange}
            options={options}
            onOptionsChange={handleOptionsChange}
          />
        </div>
        
        <div className="flex-1 flex flex-col overflow-auto relative" ref={contentRef}>
          {error && (
            <div 
              className="absolute top-0 left-0 right-0 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 z-10 flex items-center justify-between"
              role="alert"
              aria-live="assertive"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p>{error}</p>
              </div>
              <button 
                onClick={resetError}
                className="ml-4 p-1 hover:bg-red-100 dark:hover:bg-red-800/50 rounded"
                aria-label="Dismiss error"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          
          {activeTab === 'favorites' ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <p className="text-text-light">Favorites view coming soon</p>
            </div>
          ) : activeTab === 'settings' ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <p className="text-text-light">Settings coming soon</p>
            </div>
          ) : files.length === 0 ? (
            <DropZone onFilesSelected={handleFilesSelected} />
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="sticky top-0 z-20 p-2 flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center bg-surface/95 backdrop-blur border-b border-border">
                <div className="text-sm">
                  <span className="font-medium">{files.length}</span> SVG file{files.length !== 1 ? 's' : ''} loaded
                  <span className="ml-2 text-text-light">• {filteredResults.length} match{filteredResults.length !== 1 ? 'es' : ''}</span>
                </div>
                <div className="w-full sm:w-80 relative">
                  <label htmlFor="search" className="sr-only">Search icons</label>
                  <input
                    id="search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search icons…"
                    className="w-full px-3 py-2 rounded-md bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                    ref={searchInputRef}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => { setSearchQuery(''); setTimeout(() => searchInputRef.current?.focus(), 0); }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-7 h-7 rounded-full text-text hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label="Clear search"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-text-light">Filter:</span>
                    {['all','name','tags'].map(m => (
                      <button
                        key={m}
                        onClick={() => setFilterMode(m)}
                        className={`px-3 py-1 rounded-full border text-xs ${filterMode === m ? 'bg-primary/10 border-primary text-primary' : 'bg-background hover:bg-background/70 border-border text-text'}`}
                        aria-pressed={filterMode === m}
                        aria-label={`Filter mode: ${m}`}
                      >
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                {recentSearches.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-text-light">Recents:</span>
                    <div className="flex gap-2 overflow-x-auto max-w-full">
                      {recentSearches.map((q) => (
                        <button
                          key={q}
                          onClick={() => { setSearchQuery(q); setActiveTab('search'); setTimeout(() => searchInputRef.current?.focus(), 0); }}
                          className="px-3 py-1 rounded-full border border-border bg-background text-xs hover:bg-background/70"
                          aria-label={`Use recent search ${q}`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setRecentSearches([])}
                      className="text-xs text-text-light underline decoration-dotted hover:text-text"
                      aria-label="Clear recent searches"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
              <Preview 
                results={filteredResults} 
                isProcessing={isProcessing}
                onAddTags={handleAddTags}
                onRemoveTag={handleRemoveTag}
                userTagsMap={userTagsMap}
              />
            </div>
          )}
        </div>
      </main>
      <DonationBar />
      <BottomNav activeTab={activeTab} onSelect={handleSelectTab} />
      <ToolsDrawer open={toolsOpen} onClose={() => setToolsOpen(false)} />
    </div>
  );
};

export default App;
