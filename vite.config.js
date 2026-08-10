import { defineConfig } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  // Frames live in /public and are copied verbatim to the build output,
  // so they are referenced by absolute URL (/frames/...) at runtime.
  server: {
    host: true,
    open: true,
  },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        cephe: resolve(__dirname, 'gallery/cephe-dogramalari.html'),
        surme: resolve(__dirname, 'gallery/surme-dogramalari.html'),
        villa: resolve(__dirname, 'gallery/villa-gorselleri.html'),
        gunes: resolve(__dirname, 'gallery/gunes-kiricilar.html'),
        vitrin: resolve(__dirname, 'gallery/vitrin-dogramalari.html'),
        cam: resolve(__dirname, 'gallery/cam-turleri.html'),
        korkuluk: resolve(__dirname, 'gallery/cam-korkuluklar.html'),
        renkler: resolve(__dirname, 'gallery/ozel-renkler.html'),
      },
    },
  },
})
