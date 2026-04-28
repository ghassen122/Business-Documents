/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#226d68',
          dark:    '#1a5450',
          light:   '#2d8a83',
        },
        cream: '#f8f7f3',
        mint:  '#cef0ec',
        navy:  '#1a1a2e',
      },
      fontFamily: {
        sans: ["'Segoe UI'", 'Arial', 'Helvetica', 'sans-serif'],
      },
      animation: {
        'ray1':       'rayMove 9s linear 0s infinite',
        'ray2':       'rayMove 9s linear 2.5s infinite',
        'ray3':       'rayMove 9s linear 5s infinite',
        'ray4':       'rayMove 9s linear 7s infinite',
        'orb1':       'orbFloat 7s ease-in-out infinite',
        'orb2':       'orbFloat2 9s ease-in-out infinite',
        'hero-badge': 'heroBadge 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both',
        'hero-title': 'heroFadeIn 0.8s cubic-bezier(0.16,1,0.3,1) 0.3s both',
        'hero-sub':   'heroFadeIn 0.8s cubic-bezier(0.16,1,0.3,1) 0.5s both',
        'hero-btns':  'heroFadeIn 0.8s cubic-bezier(0.16,1,0.3,1) 0.65s both',
      },
      keyframes: {
        rayMove: {
          '0%':   { transform: 'translateX(-100%) rotate(35deg)' },
          '100%': { transform: 'translateX(200vw)  rotate(35deg)' },
        },
        orbFloat: {
          '0%, 100%': { transform: 'translateY(0px) scale(1)',    opacity: '0.18' },
          '50%':      { transform: 'translateY(-28px) scale(1.06)', opacity: '0.28' },
        },
        orbFloat2: {
          '0%, 100%': { transform: 'translateY(0px) scale(1)',   opacity: '0.12' },
          '50%':      { transform: 'translateY(22px) scale(0.96)', opacity: '0.22' },
        },
        heroFadeIn: {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        heroBadge: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        cardIn: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
