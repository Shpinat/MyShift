import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Трекер смен',
        short_name: 'Трекер',
        description: 'Приложение для учёта смен и зарплаты, работающее офлайн',
        theme_color: '#5136f5',
        background_color: '#14162b',
        display: 'standalone',
        icons: [
          {
            src: 'favicon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  server: {
    host: true,
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    // Allow the Figma preview origin only when running inside Figma
    allowedHosts: process.env.FIGMA ? true : undefined,
  },
});
