/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'glass',
    'glass-hover',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Academic navy/blue — primary brand palette
        brand: {
          50:  '#EFF6FF',  // light tints for badges, chips, hover backgrounds
          100: '#DBEAFE',
          200: '#BFDBFE',  // chip borders, dividers
          300: '#93C5FD',  // decorative, light accents
          400: '#3B82F6',  // links, icon colours (readable on white)
          500: '#2563EB',  // focus rings, accent
          600: '#1E3A5F',  // primary button bg, logo — deep academic navy
          700: '#162D4A',  // button hover
          800: '#0F1E35',
          900: '#0A1526',
          950: '#060E1A',
        },
        // Light neutral surfaces — replaces the old dark surface palette
        surface: {
          900: '#F8F9FA',  // page / body background
          800: '#F3F4F6',  // section tints, scrollbar track
          700: '#FFFFFF',  // card and input background
          600: '#F3F4F6',  // nav item hover background
          500: '#D1D5DB',  // scrollbar thumb, subtle dividers
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', '"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      animation: {
        'float':       'float 6s ease-in-out infinite',
        'pulse-slow':  'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in':    'slideIn 0.3s ease-out',
        'fade-in':     'fadeIn 0.4s ease-out',
        'shimmer':     'shimmer 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
  plugins: [],
}
