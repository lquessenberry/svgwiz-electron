/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./renderer/**/*.{js,jsx,ts,tsx}",
    "./renderer/index.html",
  ],
  theme: {
    screens: {
      'xs': '480px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        border: 'var(--color-border)',
        text: 'var(--color-text)',
        'text-light': 'var(--color-text-light)',
        error: 'var(--color-error)',
        success: 'var(--color-success)',
      }
    },
  },
  plugins: [],
  darkMode: 'class',
}
