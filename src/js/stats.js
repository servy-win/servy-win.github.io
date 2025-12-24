import * as utils from './utils.js'
import { initGA } from './ga.js'
import '../css/style.css'
import '../css/stats.css'

// Re-use theme toggle logic
document.addEventListener('DOMContentLoaded', () => {
  // GA Init
  initGA('G-VQ7924LC4H')

  // Initialize Dark Mode Toggle
  utils.initToggleDarkMode()

  // Initialize Back to Top Button
  utils.initBackToTop()

  // Initialize Footer Year
  utils.initCopyrightYear()

  // Fetch Stats
  fetchStats()
})

async function fetchStats() {
  const loading = document.getElementById('loading')
  const container = document.getElementById('stats-container')
  const errorDiv = document.getElementById('error')
  const footer = document.querySelector('footer')
  const repo = 'aelassas/servy'

  let allReleases = []
  let page = 1
  let keepFetching = true

  try {
    while (keepFetching) {
      // Fetch specific page
      const response = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=100&page=${page}`)

      if (!response.ok) throw new Error(`GitHub API Error: ${response.status}`)

      const data = await response.json()

      // If data is empty, we have reached the end
      if (data.length === 0) {
        keepFetching = false
      } else {
        allReleases = allReleases.concat(data)
        // If we got fewer than 100 items, this is the last page
        if (data.length < 100) {
          keepFetching = false
        } else {
          page++
        }
      }
    }

    if (allReleases.length === 0) throw new Error('No releases found')

    allReleases.sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at))

    renderStats(allReleases)

    loading.style.display = 'none'
    container.style.display = 'block'
    footer.style.display = 'block'
  } catch (err) {
    console.error(err)
    loading.style.display = 'none'

    if (err.message.includes('403')) {
      errorDiv.textContent = 'Rate limit exceeded (GitHub API). Please try again in a few minutes.'
    } else {
      errorDiv.textContent = 'Failed to load statistics. Please try again later.'
    }

    errorDiv.style.display = 'block'
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`

  const units = ['KB', 'MB', 'GB', 'TB']
  let size = bytes / 1024
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  let display
  if (size >= 10) {
    // Large sizes: one decimal, rounded
    display = Math.round(size * 10) / 10
  } else {
    // Small sizes: two decimals
    display = size.toFixed(2)
  }

  return `${display} ${units[unitIndex]}`
}

function renderStats(releases) {
  let totalDownloads = 0
  const list = document.getElementById('releases-list')
  const formatter = new Intl.NumberFormat('en-US')
  const dateOpts = { year: 'numeric', month: 'long', day: 'numeric' }

  // Clear existing list if re-rendering
  list.innerHTML = ''

  releases.forEach((release, index) => {
    // Calculate downloads for this specific release
    const releaseDownloads = release.assets.reduce((sum, asset) => sum + asset.download_count, 0)
    totalDownloads += releaseDownloads

    // Create Release Card
    const card = document.createElement('div')
    card.className = `release-card ${index === 0 ? 'latest' : ''}`

    // Assets HTML
    const assetsHtml = release.assets.map(asset => {
      const size = formatSize(asset.size)

      return `
        <li class="asset-item">
          <a href="${asset.browser_download_url}" class="asset-link" rel="nofollow noopener noreferrer">
            <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            ${asset.name}
          </a>
          <span class="asset-meta">
            <span class="asset-size">${size}</span>
            <span class="asset-downloads">
              ${formatter.format(asset.download_count)} downloads
            </span>
          </span>
        </li>`
    }).join('')

    const publishedDate = new Date(release.published_at).toLocaleDateString('en-US', dateOpts)

    card.innerHTML = `
      <div class="release-header">
        <div class="release-title">
          <h3>
            <a href="${release.html_url}" class="release-link" target="_blank" rel="noopener">
              ${release.tag_name}
            </a>
          </h3>
          ${index === 0 ? '<span class="badge latest">Latest</span>' : ''}
          ${release.prerelease ? '<span class="badge pre">Pre-release</span>' : ''}
        </div>
        <div class="release-date">${publishedDate}</div>
      </div>
      
      <div class="release-stats">
        <div class="stat">
          <span class="label">Downloads:</span>
          <span class="value">${formatter.format(releaseDownloads)}</span>
        </div>
        <div class="stat">
          <span class="label">Author:</span>
          <a href="${release.author.html_url}" target="_blank" rel="noopener" class="author-link">
            <img src="${release.author.avatar_url}" alt="${release.author.login}" class="avatar">
            ${release.author.login}
          </a>
        </div>
      </div>

      <div class="assets-section">
        <h4>Assets</h4>
        <ul class="assets-list">${assetsHtml || '<li class="no-assets">No assets available</li>'}</ul>
      </div>
    `

    list.appendChild(card)
  })

  // Update Total
  document.getElementById('total-downloads').textContent = formatter.format(totalDownloads)
}
