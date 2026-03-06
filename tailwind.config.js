/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        pj: {
          navy:   '#0d2644',
          blue:   '#1a4a7a',
          mid:    '#2563a8',
          accent: '#3b82c4',
          light:  '#ddeaf7',
          pale:   '#f0f6fc',
        },
        success: { DEFAULT: '#16a34a', light: '#dcfce7' },
        warning: { DEFAULT: '#d97706', light: '#fef3c7' },
        danger:  { DEFAULT: '#dc2626', light: '#fee2e2' },
        info:    { DEFAULT: '#0891b2', light: '#cffafe' },
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      keyframes: {
        slideUp: {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
      },
      animation: {
        'slideUp': 'slideUp 0.25s ease',
      },
    },
  },
  plugins: [],
}
