import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { compression } from 'vite-plugin-compression2'
import { minify as minifyHtml } from 'html-minifier-terser'
import { minify as minifyJs } from 'terser'

const __dirname = dirname(fileURLToPath(import.meta.url))

const terserOptions = {
  compress: {
    passes: 3,
    drop_console: true,
    drop_debugger: true,
    pure_funcs: ['console.info', 'console.debug', 'console.warn'],
    unsafe: true,
    unsafe_arrows: true,
    unsafe_comps: true,
    unsafe_Function: true,
    unsafe_math: true,
    unsafe_symbols: true,
    unsafe_proto: true,
    hoist_funs: true,
    hoist_vars: true,
    sequences: true,
    dead_code: true,
  },
  mangle: {
    toplevel: true,
  },
  format: {
    comments: false,
    ascii_only: true,
  },
}

// Plugin to force Terser minification on all output JS chunks in dist/assets/
function terserBundlePlugin() {
  return {
    name: 'terser-bundle-plugin',
    enforce: 'post',
    async generateBundle(_, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === 'chunk' && chunk.fileName.endsWith('.js')) {
          const minified = await minifyJs(chunk.code, terserOptions)
          if (minified.code) {
            chunk.code = minified.code
          }
        }
      }
    },
  }
}

function htmlMinifyPlugin() {
  return {
    name: 'html-minify-plugin',
    enforce: 'post',
    async transformIndexHtml(html) {
      return await minifyHtml(html, {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeEmptyAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true,
        minifyCSS: true,
        minifyJS: true,
        processScripts: ['application/ld+json'],
      })
    },
  }
}

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
    
    // Automatically generates fingerprinted modulepreload tags matching output chunks
    modulePreload: { 
      polyfill: false 
    },
    minify: false,

    rolldownOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        stats: resolve(__dirname, 'downloads/index.html'),
        contact: resolve(__dirname, 'contact/index.html'),
      },
    },
  },
  plugins: [
    terserBundlePlugin(),
    htmlMinifyPlugin(),
    compression({ algorithm: 'gzip' }),
    compression({ algorithm: 'brotliCompress' }),
  ],
})
