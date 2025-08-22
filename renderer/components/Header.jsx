import React from 'react';

import logoBlack from '../assets/logoblack.svg';
import logoWhite from '../assets/logowhite.svg';

const Header = ({ theme, toggleTheme, onToggleTools, toolsOpen }) => {
  const getThemeIcon = () => {
    switch(theme) {
      case 'system':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case 'light':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case 'dark':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getThemeName = () => {
    switch(theme) {
      case 'system': return 'System';
      case 'light': return 'Light';
      case 'dark': return 'Dark';
      default: return 'Unknown';
    }
  };

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const logoSrc = isDark ? logoWhite : logoBlack;

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between bg-surface border-b border-border px-4 sm:px-6 py-1.5 md:py-3 shadow-sm">
      <div className="flex items-center">
        <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded flex items-center justify-center bg-transparent flex-shrink-0 sparkle-host ion-waves-host twitch">
          <img
            src={logoSrc}
            alt="SVGwiz logo"
            className="w-full h-full object-contain select-none ion-glow rudolph-glow"
            width="64"
            height="64"
            loading="eager"
          />
          {/* Sparkle stars around the logo */}
          <span className="sparkle" style={{ left: '10%', top: '25%', '--d': '3.6s', '--delay': '0.2s' }} />
          <span className="sparkle" style={{ left: '25%', top: '80%', '--d': '4.2s', '--delay': '0.9s' }} />
          <span className="sparkle" style={{ left: '50%', top: '8%',  '--d': '3.2s', '--delay': '1.2s' }} />
          <span className="sparkle" style={{ left: '78%', top: '32%', '--d': '3.8s', '--delay': '0.4s' }} />
          <span className="sparkle" style={{ left: '88%', top: '68%', '--d': '4.6s', '--delay': '1.0s' }} />
          <span className="sparkle" style={{ left: '60%', top: '92%', '--d': '3.9s', '--delay': '1.6s' }} />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={onToggleTools}
          className="inline-flex items-center justify-center w-11 h-11 p-2 rounded-full text-text hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
          aria-label="Open tools drawer"
          aria-pressed={!!toolsOpen}
          title="Tools"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317a1 1 0 01.083 1.497l-1.11 1.11a2 2 0 000 2.829l4.949 4.95a2 2 0 002.829 0l1.11-1.11a1 1 0 011.497.083 5.5 5.5 0 01-7.778 7.778 1 1 0 01-.083-1.497l1.11-1.11a2 2 0 000-2.829l-4.95-4.95a2 2 0 00-2.828 0l-1.11 1.11a1 1 0 01-1.497-.083 5.5 5.5 0 017.778-7.778z" />
          </svg>
          <span className="sr-only">Toggle tools</span>
        </button>
        <button 
          onClick={toggleTheme}
          className="inline-flex items-center justify-center w-11 h-11 p-2 rounded-full text-text hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
          aria-label={`Change theme: current theme is ${getThemeName()}`}
          title={`Theme: ${getThemeName()}`}
        >
          {getThemeIcon()}
          <span className="sr-only">Toggle theme</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
