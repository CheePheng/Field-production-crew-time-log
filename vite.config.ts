import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: '/Field-production-crew-time-log/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      manifest: {
        name: 'CCT PGL FieldLog',
        short_name: 'FieldLog',
        description: 'CCT PGL Field Production + Crew Time Log',
        theme_color: '#0D4F2B',
        background_color: '#F8FAF5',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/Field-production-crew-time-log/',
        start_url: '/Field-production-crew-time-log/',
        icons: [
          {
            src: '/Field-production-crew-time-log/icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/photos\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'photos-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
