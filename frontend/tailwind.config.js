/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Deep navy — the institution's authority colour
        navy: {
          950: '#060E1C',
          900: '#0B1F3A',
          800: '#122847',
          700: '#1A3557',
          600: '#234470',
          500: '#2D5690',
        },
        // Academic gold — for highlights, accents, badges
        gold: {
          DEFAULT: '#C9A84C',
          light:   '#E2C97E',
          pale:    '#F5EDD0',
          dark:    '#A07828',
        },
        // Neutral tones
        ink:    '#0B1F3A',
        mist:   '#F4F6F9',
        silver: '#8A9BB0',
        // Legacy aliases so existing code still works
        accent: {
          DEFAULT: '#2D5690',
          light:   '#E2C97E',
          gold:    '#C9A84C',
        },
        canvas: '#F4F6F9',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans:    ['"Inter"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'card':    '0 1px 4px 0 rgba(11,31,58,0.08), 0 4px 16px 0 rgba(11,31,58,0.06)',
        'card-lg': '0 4px 24px 0 rgba(11,31,58,0.12)',
        'glow':    '0 0 0 3px rgba(201,168,76,0.25)',
      },
      backgroundImage: {
        'hero-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C9A84C' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};
