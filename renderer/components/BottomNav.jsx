import React from 'react'

const NavButton = ({ active, label, onClick, children }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center h-14 min-h-14 py-1 select-none ${
      active ? 'text-primary' : 'text-text'
    }`}
    aria-current={active ? 'page' : undefined}
  >
    <div className={`inline-flex items-center justify-center w-9 h-9 rounded-full ${active ? 'bg-primary/10' : 'bg-transparent'} focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}>
      {children}
    </div>
    <span className="text-[11px] leading-3 mt-0.5">{label}</span>
  </button>
)

export default function BottomNav({ activeTab, onSelect }) {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur border-t border-border">
      <ul className="grid grid-cols-5">
        <li className="flex justify-center">
          <NavButton active={activeTab === 'library'} label="Library" onClick={() => onSelect('library')}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="7" height="16" rx="1"/>
              <rect x="14" y="4" width="7" height="16" rx="1"/>
            </svg>
          </NavButton>
        </li>
        <li className="flex justify-center">
          <NavButton active={activeTab === 'search'} label="Search" onClick={() => onSelect('search')}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </NavButton>
        </li>
        <li className="flex justify-center">
          <NavButton active={activeTab === 'add'} label="Add" onClick={() => onSelect('add')}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
          </NavButton>
        </li>
        <li className="flex justify-center">
          <NavButton active={activeTab === 'favorites'} label="Favorites" onClick={() => onSelect('favorites')}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </NavButton>
        </li>
        <li className="flex justify-center">
          <NavButton active={activeTab === 'settings'} label="Settings" onClick={() => onSelect('settings')}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .66.39 1.26 1 1.51.31.13.65.2 1 .2H21a2 2 0 1 1 0 4h-.09c-.35 0-.69.07-1 .2-.61.25-1 .85-1 1.51z"/>
            </svg>
          </NavButton>
        </li>
      </ul>
      <div className="pb-[env(safe-area-inset-bottom)]" />
    </nav>
  )
}
