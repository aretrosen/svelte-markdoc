import { fontFamily } from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: ['class'],
	safelist: ['dark'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['"Inter Variable"', ...fontFamily.sans]
			}
		}
	},
	plugins: [require('@tailwindcss/typography')]
};
