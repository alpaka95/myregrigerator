import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: false // 개발 모드에서는 PWA를 꺼서 인증 충돌 방지
      },
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: '내 냉장고 관리 (My Fridge)',
        short_name: '내 냉장고',
        description: '냉장고 식재료를 한눈에 관리하고 AI 식단 추천을 받으세요.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'favicon.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: 'favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  build: {
    target: 'es2020'
  }
})
