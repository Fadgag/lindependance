/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{ts,tsx,js,jsx}',
    './app/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        atelier: {
          primary: '#C5908E', // Rose poudré
          dark: '#514443',    // Anthracite
          light: '#F3F3F3',   // Gris clair
        },
      },
      fontFamily: {
        serif: ['Noto Serif', 'serif'],
        sans: ['Manrope', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

