import process from 'node:process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { createHtmlPlugin } from 'vite-plugin-html'

const isProd = process.env.NODE_ENV === 'production'

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
      },
      // No manualChunks — let Rollup handle code splitting automatically
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        // Keep console logs, so no drop_console here
        drop_console: false,
      },
      format: {
        comments: false, // Remove comments from output
      },
    },
  },
  plugins: [
    createHtmlPlugin({
      inject: {
        data: {
          preloadCss: isProd ? '' : '/src/css/style.css',
        }
      },
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
