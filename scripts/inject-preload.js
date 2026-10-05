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

// Collect CSS of an entry and of the chunks it imports (shared CSS lives in imported chunks)
function collectCss(key, seen = new Set()) {
  const chunk = manifest[key]
  if (!chunk || seen.has(key)) return []
  seen.add(key)

  const css = [...(chunk.css || [])]
  for (const imported of chunk.imports || []) {
    css.push(...collectCss(imported, seen))
  }
  return css
}

// Inject preload into each page
pages.forEach((page) => {
  const filePath = path.join(distDir, page)

  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`)
    return
  }

  // Manifest keys always use forward slashes
  const key = page.split(path.sep).join('/')

  // Static pages without a Vite entry (e.g. site verification files) have no CSS
  if (!manifest[key]) {
    console.log(`Skipping ${page}: not a Vite entry`)
    return
  }

  const cssFiles = [...new Set(collectCss(key))]

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
