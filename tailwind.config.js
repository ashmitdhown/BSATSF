/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: "#00E0FF",
        secondary: "#00B8D9", 
        "background-light": "#f6f6f8",
        "background-dark": "#0A0F1A",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"]
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem", 
        "xl": "0.75rem",
        "full": "9999px"
      },
    },
  },
  plugins: [],
}
