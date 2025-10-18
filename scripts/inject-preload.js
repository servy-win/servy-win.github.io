import fs from 'fs'
import path from 'path'
import process from 'process'

const distDir = './dist'
const manifestPath = path.join(distDir, '.vite/manifest.json')
if (!fs.existsSync(manifestPath)) {
  console.error('Manifest not found:', manifestPath)
  process.exit(1)
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

// Look up entry CSS from manifest
const entry = manifest['index.html']
const cssFile = entry?.css?.[0]

if (cssFile) {
  const indexPath = path.join(distDir, 'index.html')
  let html = fs.readFileSync(indexPath, 'utf-8')

  // Make sure href exactly matches what's used in the built index (no double slash)
  const href = cssFile.startsWith('/') ? cssFile : `/${cssFile}`

  // Inject preload with crossorigin (helps avoid "credentials mode" warnings if needed)
  // Use rel=preload as=style and include crossorigin
  const preloadLink = `<link rel="preload" as="style" href="${href}" crossorigin>`

  // If a preload already exists, don't duplicate
  if (!html.includes(preloadLink)) {
    html = html.replace('<head>', `<head>\n  ${preloadLink}`)
    fs.writeFileSync(indexPath, html)
    console.log(`Injected preload for ${cssFile}`)
  } else {
    console.log('Preload already injected')
  }
}
