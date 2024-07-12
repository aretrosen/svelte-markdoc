/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: ['class'],
  safelist: ['dark'],
  theme: {
    extend: {

fontFamily: {
	sans: ['Montserrat', ...fontFamily.sans],
	serif: ['"Cormorant Garamond"', fontFamily.serif],
	mono: ['"Monaspace Neon"', ...fontFamily.mono],
	cursive: ['Allura']
}
    },
  },
  plugins: [require('@tailwindcss/typography')],
}

