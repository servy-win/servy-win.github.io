import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { createHtmlPlugin } from 'vite-plugin-html'
import { compression } from 'vite-plugin-compression2'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: '/',
  root: '.',
  build: {
    outDir: './dist',
    manifest: true,
    emptyOutDir: true,
    target: 'es2022',
    cssMinify: 'lightningcss',
    reportCompressedSize: false,
    modulePreload: { polyfill: false },
    rolldownOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        stats: resolve(__dirname, 'downloads/index.html'),
        contact: resolve(__dirname, 'contact/index.html'),
      },
    },
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
  plugins: [
    createHtmlPlugin({
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        minifyCSS: true,
        minifyJS: true,
        processScripts: ['application/ld+json'],
      },
    }),
    compression({ algorithm: 'gzip' }),
    compression({ algorithm: 'brotliCompress' }),
  ],
})
