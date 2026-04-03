/**
 * @file stats.js
 * @description Manages fetching and rendering GitHub release statistics for the Servy repository.
 * Features include ETag-based conditional fetching, multi-page results handling, 
 * robust error management, and LocalStorage caching.
 */

import * as utils from './utils.js'
import '../css/style.css'
import '../css/stats.css'

/**
 * Entry point for the Statistics page.
 */
document.addEventListener('DOMContentLoaded', () => {
  /**
   * Initialize shared layout features (GA, Nav, Theme, etc.)
   */
  utils.initCommonLayout()

  /**
   * Execute the statistics fetch and render pipeline.
   */
  fetchStats()
})

/**
 * Fetches release data from the GitHub API with caching and rate-limit awareness.
 * @async
 * @returns {Promise<void>}
 */
async function fetchStats() {
  const loading = document.getElementById('loading')
  const container = document.getElementById('stats-container')
  const errorDiv = document.getElementById('error')
  const footer = document.querySelector('footer')

  const repo = 'aelassas/servy'
  const cacheKey = `github_stats_${repo}`
  const cacheTimeKey = `${cacheKey}_timestamp`
  const etagKey = `${cacheKey}_etag`

  const CACHE_DURATION = 65 * 60 * 1000 // 65 minutes (GitHub rate limit window is 60m)
  const FETCH_TIMEOUT = 10 * 1000 // 10 seconds

  try {
    let cachedData = null
    let cachedTimestamp = 0
    let cachedEtag = null

    // Attempt to retrieve metadata from LocalStorage
    try {
      cachedData = localStorage.getItem(cacheKey)
      cachedTimestamp = Number(localStorage.getItem(cacheTimeKey)) || 0
      cachedEtag = localStorage.getItem(etagKey)
    } catch {
      console.warn('LocalStorage access denied or unavailable.')
    }

    const now = Date.now()

    // 1. Instant Cache Load: If data is fresh, render immediately and exit.
    if (cachedData && cachedTimestamp && (now - cachedTimestamp < CACHE_DURATION)) {
      try {
        const data = JSON.parse(cachedData)
        renderStats(data)
        updateTimestampUI(cachedTimestamp)
        finalizeUI()
        console.log('Loaded GitHub stats from local cache.')
        return
      } catch {
        console.warn('Invalid cache detected, proceeding to fetch...')
      }
    }

    let allReleases = []
    let page = 1
    let keepFetching = true
    let newEtag = null

    // 2. Fetch Loop: Handles pagination for large release histories
    while (keepFetching) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

      const headers = { 'Accept': 'application/vnd.github.v3+json' }
      // Use ETag for the first page to check for updates without consuming rate limit
      if (page === 1 && cachedEtag) {
        headers['If-None-Match'] = cachedEtag
      }

      try {
        const response = await fetch(
          `https://api.github.com/repos/${repo}/releases?per_page=100&page=${page}`,
          { signal: controller.signal, headers }
        )
        clearTimeout(timeoutId)

        // Handle 304 Not Modified: Data hasn't changed since last fetch
        if (page === 1 && response.status === 304 && cachedData) {
          const data = JSON.parse(cachedData)
          safeLocalStorageSet(cacheTimeKey, now.toString())
          renderStats(data)
          updateTimestampUI(now)
          finalizeUI()
          console.log('GitHub data unchanged (304). Cache refreshed.')
          return
        }

        if (!response.ok) {
          if (response.status === 403 || response.status === 429) throw new Error('RATE_LIMIT')
          throw new Error(`API_ERROR_${response.status}`)
        }

        const data = await response.json()
        if (page === 1) newEtag = response.headers.get('ETag')

        if (data.length === 0) {
          keepFetching = false
        } else {
          allReleases = allReleases.concat(data)
          keepFetching = data.length === 100 // Continue if page was full
          page++
        }
      } catch (fetchErr) {
        clearTimeout(timeoutId)
        if (fetchErr.name === 'AbortError') {
          throw new Error('TIMEOUT', { cause: fetchErr })
        }
        throw fetchErr
      }
    }

    if (allReleases.length === 0) throw new Error('NO_DATA')

    // 3. Update Cache with New Data
    safeLocalStorageSet(cacheKey, JSON.stringify(allReleases))
    safeLocalStorageSet(cacheTimeKey, now.toString())
    if (newEtag) safeLocalStorageSet(etagKey, newEtag)

    renderStats(allReleases)
    updateTimestampUI(now)
    finalizeUI()

  } catch (err) {
    handleError(err)
  }

  /**
   * Updates the "Last Updated" text in the UI.
   * @param {number} ts - Unix timestamp.
   */
  function updateTimestampUI(ts) {
    const el = document.getElementById('last-updated')
    if (!el) return
    // Use 'en-US' explicitly for consistent formatting
    const dateStr = new Date(ts).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
    el.textContent = `Last updated: ${dateStr}`
  }

  /**
   * Hides loading indicators and shows the content container.
   */
  function finalizeUI() {
    if (loading) loading.style.display = 'none'
    if (container) container.style.display = 'block'
    if (footer) footer.style.display = 'block'
  }

  /**
   * Centralized error handler for the fetch operation.
   * @param {Error} err 
   */
  function handleError(err) {
    console.error('Stats Fetch Error:', err.message)
    if (loading) loading.style.display = 'none'
    const messages = {
      'RATE_LIMIT': 'Rate limit exceeded (GitHub API). Please try again in a few minutes.',
      'TIMEOUT': 'Request timed out. Please check your connection and try again.',
      'NO_DATA': 'No releases were found for this repository.',
      'TypeError': 'Network error. Please check if you are online.'
    }
    if (errorDiv) {
      errorDiv.textContent = messages[err.message] || messages[err.name] || 'Failed to load statistics.'
      errorDiv.style.display = 'block'
    }
  }

  /**
   * Utility to safely set LocalStorage items without crashing on QuotaExceeded errors.
   */
  function safeLocalStorageSet(key, value) {
    try {
      localStorage.setItem(key, value)
    } catch (e) {
      console.warn('LocalStorage write failed:', e)
    }
  }
}

/**
 * Formats a byte count into a human-readable string (KB, MB, etc.).
 * @param {number} bytes 
 * @returns {string}
 */
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let size = bytes / 1024
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  const display = size >= 10 ? Math.round(size * 10) / 10 : size.toFixed(2)
  // eslint-disable-next-line security/detect-object-injection
  return `${display} ${units[unitIndex]}`
}

/**
 * Dynamically builds and injects the release cards into the DOM.
 * @param {Array<Object>} releases - Array of GitHub release objects.
 * @returns {void}
 */
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

  // Update Global Counter
  const totalEl = document.getElementById('total-downloads')
  if (totalEl) totalEl.textContent = formatter.format(totalDownloads)
}
