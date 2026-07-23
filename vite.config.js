import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { createHtmlPlugin } from 'vite-plugin-html'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: '/',
  root: '.',
  build: {
    outDir: './dist',
    manifest: true,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        stats: resolve(__dirname, 'downloads/index.html'),
        contact: resolve(__dirname, 'contact/index.html'),
      },
      // No manualChunks — let Rollup handle code splitting automatically
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console statements
      },
      format: {
        comments: false, // Remove comments from output
      },
    },
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
      },
    }),
  ],
})
