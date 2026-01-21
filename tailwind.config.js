/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          primary: '#4C1D95', // Deep purple
          secondary: '#4338CA', // Indigo
          accent: '#6366F1',
          surface: '#1E1B4B',
          card: '#312E81',
        }
      }
    },
  },
  plugins: [],
}
