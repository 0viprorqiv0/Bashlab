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
        'surface-hero': '#0A0D14',
        'surface-cmd': '#141820',
        'surface-learn': '#0A0D14',
        'surface-course': '#171C24',
        'surface-faq': '#0A0D14',
        'divider-border': '#39434F',
        outline: '#849581',
        'on-surface': '#e1e2ec',
        'on-surface-variant': '#9ba3b5',
        primary: '#00FF66',
        secondary: '#00E5FF',
        'accent-amber': '#F59E0B',
        accent: '#F59E0B',
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
