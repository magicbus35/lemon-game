// tailwind.config.js
module.exports = {
  darkMode: 'class',        // ← 반드시 'class'
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: { extend: {} },
  plugins: [],
}
