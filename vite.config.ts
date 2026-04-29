import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
// @ts-ignore
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            // Không bundle các package có dynamic require theo __dirname.
            // Nếu bundle, __dirname trong package sẽ trỏ vào main.js (sai vị trí)
            // → không tìm được binary platform-specific → throw string → dialog
            // 'undefined: undefined' khi mở app sau khi cài.
            rollupOptions: {
              external: [
                'electron',
                'fluent-ffmpeg',
                '@ffmpeg-installer/ffmpeg',
                '@ffprobe-installer/ffprobe',
                /^@ffmpeg-installer\/.*/,
                /^@ffprobe-installer\/.*/,
              ],
            },
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload()
        },
      },
    ]),
    renderer(),
  ],
})
