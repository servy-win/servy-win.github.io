/**
 * @file stats.js
 * @description Manages fetching and rendering GitHub release statistics for the Servy repository.
 * Features include ETag-based conditional fetching, multi-page results handling, 
 * robust error management, and LocalStorage caching.
 */

import * as utils from './utils.js'
import '../css/style.css'
import '../css/stats.css'

const REPO = 'aelassas/servy'
const CACHE_KEY = `github_stats_${REPO}`
const CACHE_TIME_KEY = `${CACHE_KEY}_timestamp`
const ETAG_KEY = `${CACHE_KEY}_etag`

const CACHE_DURATION = 65 * 60 * 1000 // GitHub rate limit window is 60m
const FETCH_TIMEOUT = 10 * 1000
const PAGE_SIZE = 100
const RENDER_BATCH_SIZE = 10

/**
 * Entry point for the Statistics page.
 * The fetch starts before layout initialization so the two overlap.
 * @returns {Promise<void>}
 */
export function init() {
  const pending = fetchStats()
  utils.initCommonLayout()
  return pending
}

/**
 * Reduces a GitHub release to the fields the UI needs (keeps the cache small).
 * @param {Object} release
 * @returns {Object}
 */
export function slimRelease(release) {
  const author = release.author || {}
  const assets = Array.isArray(release.assets) ? release.assets : []
  return {
    tag_name: release.tag_name,
    html_url: release.html_url,
    prerelease: Boolean(release.prerelease),
    published_at: release.published_at,
    author: { login: author.login, html_url: author.html_url, avatar_url: author.avatar_url },
    assets: assets.map(asset => ({
      name: asset.name,
      size: asset.size,
      download_count: asset.download_count,
      browser_download_url: asset.browser_download_url
    }))
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

/**
 * Reads cached releases, timestamp and ETag from LocalStorage.
 * @returns {{data: Array<Object>|null, timestamp: number, etag: string|null}}
 */
function readCache() {
  const empty = { data: null, timestamp: 0, etag: null }
  let raw, timestamp, etag

  try {
    raw = localStorage.getItem(CACHE_KEY)
    timestamp = Number(localStorage.getItem(CACHE_TIME_KEY)) || 0
    etag = localStorage.getItem(ETAG_KEY)
  } catch {
    console.warn('LocalStorage access denied or unavailable.')
    return empty
  }

  if (!raw) return empty

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('Cache is not an array')
    if (parsed.length === 0) return empty
    return { data: parsed.map(slimRelease), timestamp, etag }
  } catch {
    console.warn('Invalid cache detected, proceeding to fetch...')
    return empty
  }
}

/**
 * Fetches all release pages from the GitHub API.
 * @param {string|null} etag - ETag of the cached first page, if usable.
 * @returns {Promise<{notModified: true}|{releases: Array<Object>, etag: string|null}>}
 */
async function fetchReleases(etag) {
  const releases = []
  let newEtag = null

  for (let page = 1; ; page++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
    const headers = { 'Accept': 'application/vnd.github.v3+json' }
    // A conditional request answered with 304 doesn't count against the rate limit
    if (page === 1 && etag) headers['If-None-Match'] = etag

    let data
    try {
      const response = await fetch(
        `https://api.github.com/repos/${REPO}/releases?per_page=${PAGE_SIZE}&page=${page}`,
        { signal: controller.signal, headers }
      )

      if (page === 1 && response.status === 304) return { notModified: true }

      if (!response.ok) {
        if (response.status === 403 || response.status === 429) throw new Error('RATE_LIMIT')
        throw new Error(`API_ERROR_${response.status}`)
      }

      data = await response.json()
      if (page === 1) newEtag = response.headers?.get?.('ETag') ?? null
    } catch (err) {
      if (err.name === 'AbortError') throw new Error('TIMEOUT', { cause: err })
      throw err
    } finally {
      clearTimeout(timeoutId)
    }

    if (!Array.isArray(data)) throw new Error('API_ERROR_INVALID')
    releases.push(...data.map(slimRelease))
    if (data.length < PAGE_SIZE) break
  }

  if (releases.length === 0) throw new Error('NO_DATA')

  // The ETag only covers page 1, so it is only a valid freshness check for single-page results
  return { releases, etag: releases.length < PAGE_SIZE ? newEtag : null }
}

/**
 * Shows fresh cached data right away; otherwise keeps the loading indicator
 * until the GitHub API answers. Stale data is only shown if the refresh fails.
 * @async
 * @returns {Promise<void>}
 */
export async function fetchStats() {
  const cache = readCache()
  const hasCache = cache.data !== null
  const now = Date.now()

  if (hasCache && cache.timestamp && (now - cache.timestamp < CACHE_DURATION)) {
    showReleases(cache.data, cache.timestamp)
    console.log('Loaded GitHub stats from local cache.')
    return
  }

  const etag = hasCache && cache.data.length < PAGE_SIZE ? cache.etag : null

  try {
    const result = await fetchReleases(etag)

    if (result.notModified) {
      safeLocalStorageSet(CACHE_TIME_KEY, now.toString())
      showReleases(cache.data, now)
      console.log('GitHub data unchanged (304). Cache refreshed.')
      return
    }

    safeLocalStorageSet(CACHE_KEY, JSON.stringify(result.releases))
    safeLocalStorageSet(CACHE_TIME_KEY, now.toString())
    if (result.etag) safeLocalStorageSet(ETAG_KEY, result.etag)

    showReleases(result.releases, now)
  } catch (err) {
    if (hasCache) {
      console.warn('Could not refresh GitHub stats, showing cached data:', err.message)
      showReleases(cache.data, cache.timestamp)
      return
    }
    handleError(err)
  }
}

function showReleases(releases, timestamp) {
  renderStats(releases)
  updateTimestampUI(timestamp)
  finalizeUI()
}

/**
 * Updates the "Last Updated" text in the UI.
 * @param {number} ts - Unix timestamp.
 */
function updateTimestampUI(ts) {
  const el = document.getElementById('last-updated')
  if (!el || !ts) return
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
  const loading = document.getElementById('loading')
  const container = document.getElementById('stats-container')
  if (loading) loading.style.display = 'none'
  if (container) container.style.display = 'block'
}

/**
 * Centralized error handler for the fetch operation.
 * @param {Error} err
 */
function handleError(err) {
  console.error('Stats Fetch Error:', err.message)
  const loading = document.getElementById('loading')
  const errorDiv = document.getElementById('error')
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
 * Formats a byte count into a human-readable string (KB, MB, etc.).
 * @param {number} bytes
 * @returns {string}
 */
export function formatSize(bytes) {
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

let latestRenderId = 0
let assetIconTemplate = null

function el(tag, className, text) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function createAssetIcon() {
  if (!assetIconTemplate) {
    assetIconTemplate = document.createElement('template')
    // Static markup with no API data, parsed once and cloned per asset
    assetIconTemplate.innerHTML = '<svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>'
  }
  return assetIconTemplate.content.firstElementChild.cloneNode(true)
}

function scheduleIdle(callback) {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(callback, { timeout: 500 })
  } else {
    setTimeout(callback, 0)
  }
}

/** Requests a small avatar; GitHub serves them at the size given by `s`. */
function smallAvatarUrl(url) {
  try {
    const parsed = new URL(url)
    parsed.searchParams.set('s', '40')
    return parsed.toString()
  } catch {
    return url
  }
}

function getReleaseDownloads(release) {
  const assets = Array.isArray(release.assets) ? release.assets : []
  return assets.reduce((sum, asset) => sum + (Number(asset.download_count) || 0), 0)
}

function buildAssetItem(asset, formatter) {
  const li = el('li', 'asset-item')

  const assetLink = el('a', 'asset-link')
  if (asset.browser_download_url) assetLink.href = asset.browser_download_url
  assetLink.rel = 'nofollow noopener noreferrer'
  assetLink.appendChild(createAssetIcon())
  assetLink.appendChild(document.createTextNode(asset.name || 'Unnamed asset'))

  const assetMeta = el('span', 'asset-meta')
  assetMeta.appendChild(el('span', 'asset-size', formatSize(Number(asset.size) || 0)))
  assetMeta.appendChild(el('span', 'asset-downloads', `${formatter.format(Number(asset.download_count) || 0)} downloads`))

  li.appendChild(assetLink)
  li.appendChild(assetMeta)
  return li
}

function buildReleaseCard(release, isLatest, formatter, dateOpts) {
  const assets = Array.isArray(release.assets) ? release.assets : []
  const author = release.author || {}

  const card = el('div', isLatest ? 'release-card latest' : 'release-card')

  // --- Release Header ---
  const releaseHeader = el('div', 'release-header')
  const releaseTitle = el('div', 'release-title')

  const h3 = document.createElement('h3')
  const releaseLink = el('a', 'release-link', release.tag_name)
  if (release.html_url) releaseLink.href = release.html_url
  releaseLink.target = '_blank'
  releaseLink.setAttribute('aria-label', `Release ${release.tag_name}`)
  releaseLink.rel = 'noopener noreferrer'
  h3.appendChild(releaseLink)
  releaseTitle.appendChild(h3)

  if (isLatest) releaseTitle.appendChild(el('span', 'badge latest', 'Latest'))
  if (release.prerelease) releaseTitle.appendChild(el('span', 'badge pre', 'Pre-release'))

  const releaseDate = el('div', 'release-date',
    release.published_at ? new Date(release.published_at).toLocaleDateString('en-US', dateOpts) : 'N/A')

  releaseHeader.appendChild(releaseTitle)
  releaseHeader.appendChild(releaseDate)

  // --- Release Stats ---
  const releaseStats = el('div', 'release-stats')

  const downloadsStat = el('div', 'stat')
  downloadsStat.appendChild(el('span', 'label', 'Downloads:'))
  downloadsStat.appendChild(el('span', 'value', formatter.format(getReleaseDownloads(release))))

  const authorStat = el('div', 'stat')
  authorStat.appendChild(el('span', 'label', 'Author:'))
  const authorLink = el('a', 'author-link')
  authorLink.href = author.html_url || '#'
  authorLink.target = '_blank'
  authorLink.rel = 'noopener noreferrer'
  if (author.avatar_url) {
    const avatar = el('img', 'avatar')
    avatar.src = smallAvatarUrl(author.avatar_url)
    avatar.alt = ''
    avatar.width = 20
    avatar.height = 20
    avatar.loading = 'lazy'
    avatar.decoding = 'async'
    authorLink.appendChild(avatar)
  }
  authorLink.appendChild(document.createTextNode(author.login || 'Unknown'))
  authorStat.appendChild(authorLink)

  releaseStats.appendChild(downloadsStat)
  releaseStats.appendChild(authorStat)

  // --- Assets Section ---
  const assetsSection = el('div', 'assets-section')
  assetsSection.appendChild(el('h4', undefined, 'Assets'))
  const assetsList = el('ul', 'assets-list')

  if (assets.length === 0) {
    assetsList.appendChild(el('li', 'no-assets', 'No assets available'))
  } else {
    assets.forEach(asset => assetsList.appendChild(buildAssetItem(asset, formatter)))
  }
  assetsSection.appendChild(assetsList)

  card.appendChild(releaseHeader)
  card.appendChild(releaseStats)
  card.appendChild(assetsSection)
  return card
}

/**
 * Builds and injects the release cards into the DOM.
 * The first batch renders synchronously; the rest follow in idle batches.
 * @param {Array<Object>} releases - Array of GitHub release objects.
 * @returns {void}
 */
export function renderStats(releases) {
  const list = document.getElementById('releases-list')
  if (!list) return

  const renderId = ++latestRenderId
  const formatter = new Intl.NumberFormat('en-US')
  const dateOpts = { year: 'numeric', month: 'long', day: 'numeric' }

  // The newest stable release is "Latest", even when a pre-release is listed first
  const latestIndex = releases.findIndex(release => !release.prerelease)
  const totalDownloads = releases.reduce((sum, release) => sum + getReleaseDownloads(release), 0)

  list.replaceChildren()

  const renderBatch = (start) => {
    if (renderId !== latestRenderId) return

    const end = Math.min(start + RENDER_BATCH_SIZE, releases.length)
    const fragment = document.createDocumentFragment()
    releases.slice(start, end).forEach((release, offset) => {
      fragment.appendChild(buildReleaseCard(release, start + offset === latestIndex, formatter, dateOpts))
    })
    list.appendChild(fragment)

    if (end < releases.length) scheduleIdle(() => renderBatch(end))
  }
  renderBatch(0)

  const totalEl = document.getElementById('total-downloads')
  if (totalEl) totalEl.textContent = formatter.format(totalDownloads)
}

function bootstrap() {
  // Only run on the downloads page
  if (document.getElementById('releases-list')) init()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true })
} else {
  bootstrap()
}
