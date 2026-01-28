/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors');

module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    colors: {
      ...colors,
      purple: colors.blue,
    },
    extend: {
      colors: {
        dark: {
          primary: '#1E3A8A', // Deep blue
          secondary: '#4338CA', // Indigo
          accent: '#6366F1',
          surface: '#1E1B4B',
          card: '#312E81',
        },
      },
    },
  },
  plugins: [],
}
