/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f5f6fa',
          100: '#e8eaf2',
          200: '#c9cde0',
          300: '#9ea5c4',
          400: '#6b7497',
          500: '#4a5275',
          600: '#363d5c',
          700: '#262c45',
          800: '#1a1f33',
          900: '#101424',
          950: '#080b16',
        },
        accent: {
          50: '#e6fffa',
          100: '#b3fff5',
          200: '#80ffee',
          300: '#4dffe8',
          400: '#1affe2',
          500: '#00e6d0',
          600: '#00b8a7',
          700: '#008a7e',
          800: '#005c55',
          900: '#002e2b',
        },
        success: {
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
        },
        warning: {
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
        },
        error: {
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.5s ease-out infinite',
        'hit-flash': 'hit-flash 0.3s ease-out',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.8' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        'hit-flash': {
          '0%': { opacity: '1', transform: 'scale(1.1)' },
          '100%': { opacity: '0', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
