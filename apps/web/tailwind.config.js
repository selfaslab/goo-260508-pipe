/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        lab: {
          50: '#f0fdf9',
          100: '#cbfbf0',
          200: '#96f5de',
          300: '#4ee8c9',
          400: '#1dd5b5',
          500: '#0fb79c',
          600: '#0a957f',
          700: '#0c7667',
          800: '#0e5f54',
          900: '#0d4f47',
        },
        ink: '#0f172a',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Fredoka"', '"Plus Jakarta Sans"', 'system-ui'],
      },
      boxShadow: {
        soft: '0 10px 40px -24px rgb(14 165 233 / 0.35)',
      },
      backgroundImage: {
        labmesh:
          'radial-gradient(circle at 15% 20%, rgb(217 249 239) 0, transparent 32%), radial-gradient(circle at 85% 10%, rgb(224 231 255) 0, transparent 28%), linear-gradient(180deg, #f8fafc 0%, #ecfeff 100%)',
      },
    },
  },
  plugins: [],
};
