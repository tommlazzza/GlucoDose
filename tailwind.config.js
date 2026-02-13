/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./views/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#93BFC7',
        secondary: '#ABE7B2',
        appBg: '#ECF4E8',
        cardBg: '#FFFFFF',
        textMain: '#1F2937',
        textMuted: '#6B7280',
      },
    },
  },
  plugins: [],
}