import fs from 'fs'
import path from 'path'

const distDir = './dist'
const manifest = JSON.parse(fs.readFileSync(path.join(distDir, '.vite/manifest.json'), 'utf-8'))

// Look up entry CSS from manifest
const entry = manifest['index.html']
const cssFile = entry?.css?.[0]

if (cssFile) {
  const indexPath = path.join(distDir, 'index.html')
  let html = fs.readFileSync(indexPath, 'utf-8')
  html = html.replace(
    '<head>',
    `<head><link rel="preload" as="style" href="/${cssFile}">`
  )
  fs.writeFileSync(indexPath, html)
  console.log(`Injected preload for ${cssFile}`)
}
