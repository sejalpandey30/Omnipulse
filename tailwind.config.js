/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tv: {
          bg: "#0B0E14",
          surface: "#141A24",
          card: "#1C2433",
          accent: "#00A8E1",      // Signature Amazon Cyan
          orange: "#FF9900",      // Signature Amazon Amber/Orange
          focus: "#38BDF8",       // Bright Focus Ring Blue
          highlight: "#22D3EE",
        }
      },
      boxShadow: {
        'tv-focus': '0 0 0 4px #00A8E1, 0 10px 25px -5px rgba(0, 168, 225, 0.5)',
        'tv-glow': '0 0 30px rgba(0, 168, 225, 0.4)',
        'tv-card': '0 8px 24px rgba(0, 0, 0, 0.5)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
