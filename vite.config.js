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
    cssMinify: 'lightningcss',   // Deepest CSS minification for faster FCP/LCP
    reportCompressedSize: false,
    modulePreload: { polyfill: false },
    rolldownOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        stats: resolve(__dirname, 'downloads/index.html'),
        contact: resolve(__dirname, 'contact/index.html'),
      },
      output: {
        comments: false,
        minify: {
          compress: {
            passes: 2,           // Extra compression pass for minimum file size
            drop_console: true,  // Removes console statements
            drop_debugger: true
          },
        },
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
        processScripts: ['application/ld+json'],
      },
    }),
  ],
})
