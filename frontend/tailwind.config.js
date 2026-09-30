/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        'surface-cmd': '#141820',
        'divider-border': '#39434F',
        'on-surface': '#e1e2ec',
        'on-surface-variant': '#9ba3b5',
        primary: '#68DFA0',
        secondary: '#78CBD4',
        'accent-amber': '#F59E0B',
      },
      fontFamily: {
        headline: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        code: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
