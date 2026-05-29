/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#070a13',
          dark: '#0e1424',
          card: 'rgba(15, 22, 42, 0.7)',
          border: 'rgba(51, 65, 85, 0.4)',
          cyan: '#00f0ff',
          green: '#0df041',
          magenta: '#ff0055',
          orange: '#ffb700',
          yellow: '#ffe600',
          text: '#e2e8f0',
          muted: '#94a3b8'
        }
      },
      boxShadow: {
        'neon-cyan': '0 0 8px rgba(0, 240, 255, 0.4), 0 0 16px rgba(0, 240, 255, 0.1)',
        'neon-green': '0 0 8px rgba(13, 240, 65, 0.4), 0 0 16px rgba(13, 240, 65, 0.1)',
        'neon-magenta': '0 0 8px rgba(255, 0, 85, 0.4), 0 0 16px rgba(255, 0, 85, 0.1)',
        'neon-orange': '0 0 8px rgba(255, 183, 0, 0.4), 0 0 16px rgba(255, 183, 0, 0.1)',
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        sans: ['Inter', 'Space Grotesk', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
