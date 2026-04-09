/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
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
  // `safelist` permet de forcer la génération de classes parfois omises par le JIT
  // si elles ne sont pas encore présentes dans le code. Utile pour tester.
  safelist: [
    'bg-atelier-primary',
    'text-atelier-primary',
    'bg-atelier-dark',
    'bg-atelier-light',
    'text-atelier-dark',
  ],
}

