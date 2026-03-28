import * as utils from './utils.js'
import { initGA } from './ga.js'
import '../css/style.css'
import '../css/stats.css'

// Re-use theme toggle logic
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Google Analytics and Google Ads Conversion Tracking
  initGA('G-VQ7924LC4H', 'AW-16758312117')

  // Initialize Header Hamburger Menu
  utils.initHeaderHamburger()

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
  const cacheKey = `github_stats_${repo}`
  const cacheTimeKey = `${cacheKey}_timestamp`
  const CACHE_DURATION = 30 * 60 * 1000 // ms
  const FETCH_TIMEOUT = 10000 // 10 seconds timeout

  try {
    // 1. Safe Cache Retrieval
    let cachedData = null
    let cachedTimestamp = 0
    try {
      cachedData = localStorage.getItem(cacheKey)
      cachedTimestamp = Number(localStorage.getItem(cacheTimeKey)) || 0
    } catch {
      console.warn('LocalStorage access denied or unavailable.')
    }

    const now = Date.now()

    // Ignore cache for now
    // if (cachedData && cachedTimestamp && (now - cachedTimestamp < CACHE_DURATION)) {
    //   try {
    //     renderStats(JSON.parse(cachedData))
    //     finalizeUI()
    //     return
    //   } catch {
    //     console.warn('Invalid cache, ignoring...')
    //   }
    // }

    // 2. Fetch with Timeout and Pagination Limits
    let allReleases = []
    let page = 1
    let keepFetching = true

    while (keepFetching) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

      try {
        const response = await fetch(
          `https://api.github.com/repos/${repo}/releases?per_page=100&page=${page}`,
          { signal: controller.signal }
        )
        clearTimeout(timeoutId)

        if (!response.ok) {
          if (response.status === 403 || response.status === 429) throw new Error('RATE_LIMIT')
          throw new Error(`API_ERROR_${response.status}`)
        }

        const data = await response.json()
        if (data.length === 0) {
          keepFetching = false
        } else {
          allReleases = allReleases.concat(data)
          keepFetching = data.length === 100
          page++
        }
      } catch (fetchErr) {
        clearTimeout(timeoutId)
        if (fetchErr.name === 'AbortError') throw new Error('TIMEOUT')
        throw fetchErr
      }
    }

    if (allReleases.length === 0) throw new Error('NO_DATA')

    // GitHub returns latest first by default; sorting is redundant.

    // 3. Safe Cache Update
    try {
      localStorage.setItem(cacheKey, JSON.stringify(allReleases))
      localStorage.setItem(cacheTimeKey, now.toString())
    } catch {
      console.warn('Failed to update LocalStorage (possibly full).')
    }

    renderStats(allReleases)
    finalizeUI()

  } catch (err) {
    handleError(err)
  }

  function finalizeUI() {
    loading.style.display = 'none'
    container.style.display = 'block'
    footer.style.display = 'block'
  }

  function handleError(err) {
    console.error('Stats Fetch Error:', err.message)
    loading.style.display = 'none'

    const messages = {
      'RATE_LIMIT': 'Rate limit exceeded (GitHub API). Please try again in a few minutes.',
      'TIMEOUT': 'Request timed out. Please check your connection and try again.',
      'NO_DATA': 'No releases were found for this repository.',
      'TypeError': 'Network error. Please check if you are online.'
    }

    errorDiv.textContent = messages[err.message] || messages[err.name] || 'Failed to load statistics. Please try again later.'
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
    const releaseDownloads = release.assets.reduce((sum, asset) => sum + asset.download_count, 0)
    totalDownloads += releaseDownloads

    // --- Card ---
    const card = document.createElement('div')
    card.className = `release-card ${index === 0 ? 'latest' : ''}`

    // --- Release Header ---
    const releaseHeader = document.createElement('div')
    releaseHeader.className = 'release-header'

    const releaseTitle = document.createElement('div')
    releaseTitle.className = 'release-title'

    const h3 = document.createElement('h3')
    const releaseLink = document.createElement('a')
    releaseLink.href = release.html_url
    releaseLink.className = 'release-link'
    releaseLink.target = '_blank'
    releaseLink.rel = 'noopener'
    releaseLink.textContent = release.tag_name
    h3.appendChild(releaseLink)
    releaseTitle.appendChild(h3)

    if (index === 0) {
      const latestBadge = document.createElement('span')
      latestBadge.className = 'badge latest'
      latestBadge.textContent = 'Latest'
      releaseTitle.appendChild(latestBadge)
    }

    if (release.prerelease) {
      const preBadge = document.createElement('span')
      preBadge.className = 'badge pre'
      preBadge.textContent = 'Pre-release'
      releaseTitle.appendChild(preBadge)
    }

    const releaseDate = document.createElement('div')
    releaseDate.className = 'release-date'
    releaseDate.textContent = new Date(release.published_at).toLocaleDateString('en-US', dateOpts)

    releaseHeader.appendChild(releaseTitle)
    releaseHeader.appendChild(releaseDate)

    // --- Release Stats ---
    const releaseStats = document.createElement('div')
    releaseStats.className = 'release-stats'

    const downloadsStat = document.createElement('div')
    downloadsStat.className = 'stat'
    const downloadsLabel = document.createElement('span')
    downloadsLabel.className = 'label'
    downloadsLabel.textContent = 'Downloads:'
    const downloadsValue = document.createElement('span')
    downloadsValue.className = 'value'
    downloadsValue.textContent = formatter.format(releaseDownloads)
    downloadsStat.appendChild(downloadsLabel)
    downloadsStat.appendChild(downloadsValue)

    const authorStat = document.createElement('div')
    authorStat.className = 'stat'
    const authorLabel = document.createElement('span')
    authorLabel.className = 'label'
    authorLabel.textContent = 'Author:'
    const authorLink = document.createElement('a')
    authorLink.href = release.author.html_url
    authorLink.target = '_blank'
    authorLink.rel = 'noopener'
    authorLink.className = 'author-link'
    const avatar = document.createElement('img')
    avatar.src = release.author.avatar_url
    avatar.alt = ''
    avatar.className = 'avatar'
    authorLink.appendChild(avatar)
    authorLink.appendChild(document.createTextNode(release.author.login))
    authorStat.appendChild(authorLabel)
    authorStat.appendChild(authorLink)

    releaseStats.appendChild(downloadsStat)
    releaseStats.appendChild(authorStat)

    // --- Assets Section ---
    const assetsSection = document.createElement('div')
    assetsSection.className = 'assets-section'
    const assetsHeading = document.createElement('h4')
    assetsHeading.textContent = 'Assets'
    const assetsList = document.createElement('ul')
    assetsList.className = 'assets-list'

    if (release.assets.length === 0) {
      const noAssets = document.createElement('li')
      noAssets.className = 'no-assets'
      noAssets.textContent = 'No assets available'
      assetsList.appendChild(noAssets)
    } else {
      release.assets.forEach(asset => {
        const li = document.createElement('li')
        li.className = 'asset-item'

        const assetLink = document.createElement('a')
        assetLink.href = asset.browser_download_url
        assetLink.className = 'asset-link'
        assetLink.rel = 'nofollow noopener noreferrer'
        // SVG is static markup with no API data — innerHTML is safe here
        assetLink.innerHTML = '<svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>'
        assetLink.appendChild(document.createTextNode(asset.name))

        const assetMeta = document.createElement('span')
        assetMeta.className = 'asset-meta'
        const assetSize = document.createElement('span')
        assetSize.className = 'asset-size'
        assetSize.textContent = formatSize(asset.size)
        const assetDownloads = document.createElement('span')
        assetDownloads.className = 'asset-downloads'
        assetDownloads.textContent = `${formatter.format(asset.download_count)} downloads`
        assetMeta.appendChild(assetSize)
        assetMeta.appendChild(assetDownloads)

        li.appendChild(assetLink)
        li.appendChild(assetMeta)
        assetsList.appendChild(li)
      })
    }

    assetsSection.appendChild(assetsHeading)
    assetsSection.appendChild(assetsList)

    // --- Assemble Card ---
    card.appendChild(releaseHeader)
    card.appendChild(releaseStats)
    card.appendChild(assetsSection)
    list.appendChild(card)
  })

  // Update Total
  document.getElementById('total-downloads').textContent = formatter.format(totalDownloads)
}
