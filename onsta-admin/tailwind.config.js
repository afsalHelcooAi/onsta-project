/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          900: '#081c14',
          800: '#0d281e',
          700: '#13392a',
          600: '#1a4a37',
          500: '#235c45',
        },
        cream: {
          50: '#fcfaf6',
          100: '#f7f4ee',
          200: '#efe9de',
          300: '#e5ded0',
          400: '#d5c9b6',
        },
        onsta: {
          green: '#0d281e',
          lightGreen: '#e6f4ea',
          textGreen: '#137333',
          borderGreen: '#ceead6',
          amber: '#fef7e0',
          textAmber: '#b06000',
          borderAmber: '#fde293',
          red: '#fce8e6',
          textRed: '#c5221f',
          borderRed: '#fad2cf',
          card: '#ffffff',
          cardBorder: '#e7e0d5',
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'Cambria', 'serif'],
        sans: ['"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
