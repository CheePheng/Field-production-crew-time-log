import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        forest: { DEFAULT: '#0D4F2B', light: '#10B981' },
        timber: '#D97706',
        accent: '#EA580C',
        surface: '#F8FAF5',
        success: '#059669',
        danger: '#DC2626',
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '15%':       { transform: 'translateX(-6px)' },
          '30%':       { transform: 'translateX(6px)' },
          '45%':       { transform: 'translateX(-4px)' },
          '60%':       { transform: 'translateX(4px)' },
          '75%':       { transform: 'translateX(-2px)' },
          '90%':       { transform: 'translateX(2px)' },
        },
      },
      animation: {
        shake: 'shake 0.4s ease-in-out',
      },
    },
  },
  plugins: [],
}

export default config
