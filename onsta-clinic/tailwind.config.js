/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        plum: {
          950: '#1A1320',
          900: '#261A2F',
          800: '#552B51',
          700: '#6B3B66',
          600: '#824B7C',
          200: '#DECBE9',
          100: '#F0E6F6',
          50: '#F6F0FA',
        },
        slateSurface: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
        },
        onsta: {
          primary: '#6B3B66',
          primaryHover: '#552B51',
          lilac: '#F6F0FA',
          slate: '#F8FAFC',
          card: '#FFFFFF',
          cardBorder: '#EAE0F2',
          lightGreen: '#DCFCE7',
          textGreen: '#166534',
          borderGreen: '#BBF7D0',
          amber: '#FFEDD5',
          textAmber: '#9A3412',
          borderAmber: '#FED7AA',
          red: '#FEE2E2',
          textRed: '#991B1B',
          borderRed: '#FECACA',
        }
      },
      fontFamily: {
        alata: ['"Alata"', 'sans-serif'],
        serif: ['"Alata"', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', '"Alata"', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
