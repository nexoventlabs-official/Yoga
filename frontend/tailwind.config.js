/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f4f7f0',
          100: '#e3ecd8',
          200: '#c7d8b1',
          300: '#a3bf83',
          400: '#83a560',
          500: '#658b48',
          600: '#4f6f37',
          700: '#3f582d',
          800: '#344726',
          900: '#2c3c20',
        },
        saffron: {
          500: '#f3a712',
          600: '#d98c08',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
