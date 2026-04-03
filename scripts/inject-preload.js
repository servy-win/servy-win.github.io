/* eslint-disable security/detect-non-literal-fs-filename */
/* eslint-disable security/detect-object-injection */
import fs from 'fs'
import path from 'path'
import process from 'process'

const distDir = './dist'
const manifestPath = path.join(distDir, '.vite/manifest.json')

// Ensure manifest exists
if (!fs.existsSync(manifestPath)) {
  console.error('Manifest not found:', manifestPath)
  process.exit(1)
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

// Pages to process
function getHtmlFiles(dir, base = '') {
  return fs.readdirSync(dir).flatMap((file) => {
    const fullPath = path.join(dir, file)
    const relativePath = path.join(base, file)

    if (fs.statSync(fullPath).isDirectory()) {
      return getHtmlFiles(fullPath, relativePath)
    }

    return file.endsWith('.html') ? [relativePath] : []
  })
}

const pages = getHtmlFiles(distDir)

// Inject preload into each page
pages.forEach((page) => {
  const filePath = path.join(distDir, page)

  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`)
    return
  }

  // Try to get page-specific entry, fallback to index
  const entry = manifest[page] || manifest['index.html']

  const cssFiles = entry?.css || []

  if (cssFiles.length === 0) {
    console.warn(`No CSS found for ${page}`)
    return
  }

  let html = fs.readFileSync(filePath, 'utf-8')

  let injected = false

  cssFiles.forEach((cssFile) => {
    const href = cssFile.startsWith('/') ? cssFile : `/${cssFile}`
    const preloadLink = `<link rel="preload" as="style" href="${href}" crossorigin>`

    if (!html.includes(preloadLink)) {
      html = html.replace('<head>', `<head>\n  ${preloadLink}`)
      injected = true
    }
  })

  if (injected) {
    fs.writeFileSync(filePath, html)
    console.log(`Injected CSS preload(s) into ${page}`)
  } else {
    console.log(`Preload already exists in ${page}`)
  }
})
