/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          bg: '#0a0a0f',
          text: '#ffffff',
        },
        secondary: {
          bg: '#121218',
          text: '#a0a0b8',
        },
        accent: {
          bg: '#1a1a24',
        },
        electric: '#00D4FF',
        profit: '#00FF88',
        loss: '#FF4757',
        border: '#2a2a35',
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          from: { boxShadow: '0 0 20px #00D4FF40' },
          to: { boxShadow: '0 0 40px #00D4FF80' },
        }
      },
      screens: {
        'xs': '475px',
        '3xl': '1600px',
      },
    },
  },
  plugins: [],
}