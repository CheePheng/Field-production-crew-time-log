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
    },
  },
  plugins: [],
}

export default config
