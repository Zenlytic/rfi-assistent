/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        zenlytic: {
          // Primary cyan/teal accent
          cyan: '#05fcdf',
          // Primary blue
          blue: '#4d65ff',
          // Forest green (CTAs)
          green: '#09493D',
          // Dark backgrounds
          dark: '#111111',
          'dark-secondary': '#1a1a1a',
          'dark-tertiary': '#222222',
          // Legacy scale (keeping for compatibility)
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#05fcdf',
          600: '#09493D',
          700: '#0f766e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        heading: ['Exo', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
