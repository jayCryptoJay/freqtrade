/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0b0e',
          secondary: '#111318',
          card: '#161b22',
          elevated: '#1c2128',
          border: '#30363d',
        },
        accent: {
          green: '#3fb950',
          red: '#f85149',
          blue: '#58a6ff',
          purple: '#bc8cff',
          orange: '#e3b341',
          cyan: '#39d353',
        },
        sol: {
          purple: '#9945FF',
          green: '#14F195',
          blue: '#00C2FF',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
      },
    },
  },
  plugins: [],
}
