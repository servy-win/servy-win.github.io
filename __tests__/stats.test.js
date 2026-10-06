import { jest, describe, beforeEach, afterEach, test, expect } from '@jest/globals'

jest.unstable_mockModule('../src/js/utils.js', () => ({
  initCommonLayout: jest.fn(),
  initCopyrightYear: jest.fn(),
  initHeaderHamburger: jest.fn(),
  initToggleDarkMode: jest.fn(),
  initBackToTop: jest.fn(),
  initThemeSync: jest.fn(),
}))

const utils = await import('../src/js/utils.js')
const { init, fetchStats, renderStats, formatSize, slimRelease } = await import('../src/js/stats.js')

const CACHE_KEY = 'github_stats_aelassas/servy'
const TIME_KEY = `${CACHE_KEY}_timestamp`
const ETAG_KEY = `${CACHE_KEY}_etag`

const DOM = `
  <div id="loading"></div>
  <div id="error" style="display: none;"></div>
  <div id="stats-container" style="display: none;"></div>
  <span id="last-updated"></span>
  <div id="total-downloads"></div>
  <div id="releases-list"></div>
  <footer></footer>
`

const makeRelease = (tag, overrides = {}) => ({
  tag_name: tag,
  html_url: `https://github.com/aelassas/servy/releases/tag/${tag}`,
  prerelease: false,
  published_at: '2024-01-01T00:00:00Z',
  author: {
    login: 'testuser',
    html_url: 'https://github.com/testuser',
    avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
  },
  assets: [{
    name: 'app.exe',
    size: 1024,
    download_count: 1,
    browser_download_url: 'https://example.com/app.exe',
  }],
  ...overrides,
})

// jsdom does not provide fetch/Headers, so responses are plain objects
const response = (data, { status = 200, etag = null } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (name) => (name.toLowerCase() === 'etag' ? etag : null) },
  json: async () => data,
})

const seedCache = (releases, timestamp, etag = null) => {
  localStorage.setItem(CACHE_KEY, JSON.stringify(releases))
  localStorage.setItem(TIME_KEY, String(timestamp))
  if (etag) localStorage.setItem(ETAG_KEY, etag)
}

const waitFor = async (assertion, timeout = 1000) => {
  const start = Date.now()
  for (;;) {
    try {
      return assertion()
    } catch (err) {
      if (Date.now() - start > timeout) throw err
      await new Promise(resolve => setTimeout(resolve, 5))
    }
  }
}

const cards = () => document.querySelectorAll('.release-card')
const byId = (id) => document.getElementById(id)

beforeEach(() => {
  document.body.innerHTML = DOM
  localStorage.clear()
  globalThis.fetch = jest.fn()
  utils.initCommonLayout.mockClear()
  jest.spyOn(console, 'log').mockImplementation(() => { })
})

afterEach(() => {
  jest.useRealTimers()
  jest.restoreAllMocks()
})

describe('formatSize', () => {
  test.each([
    [500, '500 B'],
    [2048, '2.00 KB'],
    [5 * 1024 * 1024, '5.00 MB'],
    [12 * 1024 * 1024, '12 MB'],
    [15.5 * 1024 * 1024, '15.5 MB'],
    [3 * 1024 ** 3, '3.00 GB'],
  ])('formats %d bytes as %s', (bytes, expected) => {
    expect(formatSize(bytes)).toBe(expected)
  })
})

describe('slimRelease', () => {
  test('keeps only the fields used by the UI', () => {
    const slim = slimRelease({
      ...makeRelease('v1.0.0'),
      body: 'long markdown',
      reactions: { total_count: 3 },
      author: { login: 'u', html_url: 'h', avatar_url: 'a', node_id: 'x', site_admin: false },
      assets: [{ name: 'n', size: 1, download_count: 2, browser_download_url: 'b', uploader: {} }],
    })

    expect(Object.keys(slim).sort()).toEqual(
      ['assets', 'author', 'html_url', 'prerelease', 'published_at', 'tag_name']
    )
    expect(slim.author).toEqual({ login: 'u', html_url: 'h', avatar_url: 'a' })
    expect(slim.assets).toEqual([{ name: 'n', size: 1, download_count: 2, browser_download_url: 'b' }])
  })

  test('tolerates missing author and assets', () => {
    const slim = slimRelease({ tag_name: 'v1' })
    expect(slim.assets).toEqual([])
    expect(slim.prerelease).toBe(false)
    expect(slim.author.login).toBeUndefined()
  })
})

describe('renderStats', () => {
  test('renders a card per release and the total download count', () => {
    renderStats([
      makeRelease('v2.0.0', { assets: [{ name: 'a', size: 1, download_count: 1500, browser_download_url: '#' }] }),
      makeRelease('v1.0.0', { assets: [{ name: 'b', size: 1, download_count: 500, browser_download_url: '#' }] }),
    ])

    expect(cards()).toHaveLength(2)
    expect(document.querySelector('.release-link').textContent).toBe('v2.0.0')
    expect(byId('total-downloads').textContent).toBe('2,000')
  })

  test('marks the newest stable release as latest, even when a pre-release is listed first', () => {
    renderStats([
      makeRelease('v3.0.0-beta', { prerelease: true }),
      makeRelease('v2.0.0'),
      makeRelease('v1.0.0'),
    ])

    const [first, second, third] = cards()
    expect(first.querySelector('.badge.latest')).toBeNull()
    expect(first.querySelector('.badge.pre').textContent).toBe('Pre-release')
    expect(second.querySelector('.badge.latest').textContent).toBe('Latest')
    expect(third.querySelector('.badge.latest')).toBeNull()
    expect(document.querySelectorAll('.badge.latest')).toHaveLength(1)
  })

  test('shows "No assets available" when a release has no assets', () => {
    renderStats([makeRelease('v1.0.0', { assets: [] })])
    expect(document.querySelector('.no-assets').textContent).toBe('No assets available')
  })

  test('requests small lazy-loaded avatars', () => {
    renderStats([makeRelease('v1.0.0')])

    const avatar = document.querySelector('.avatar')
    expect(avatar.src).toContain('s=40')
    expect(avatar.loading).toBe('lazy')
    expect(avatar.width).toBe(20)
    expect(avatar.height).toBe(20)
  })

  test('omits the avatar image when the author has no avatar_url', () => {
    renderStats([makeRelease('v1.0.0', { author: { login: 'jdoe' } })])

    expect(document.querySelector('.avatar')).toBeNull()
    expect(document.querySelector('.author-link').textContent).toBe('jdoe')
  })

  test('falls back to "Unknown" when the author is missing', () => {
    renderStats([makeRelease('v1.0.0', { author: undefined })])
    expect(document.querySelector('.author-link').textContent).toBe('Unknown')
  })

  test('does not render NaN or undefined for missing asset fields', () => {
    renderStats([makeRelease('v1.0.0', { assets: [{}] })])

    const text = document.body.textContent
    expect(text).not.toContain('NaN')
    expect(text).not.toContain('undefined')
    expect(document.querySelector('.asset-size').textContent).toBe('0 B')
  })

  test('renders large histories in batches and still counts every release', async () => {
    const releases = Array.from({ length: 25 }, (_, i) => makeRelease(`v${i}`))

    renderStats(releases)

    expect(cards()).toHaveLength(10)
    expect(byId('total-downloads').textContent).toBe('25')

    await waitFor(() => expect(cards()).toHaveLength(25))
    expect(cards()[0].querySelector('.release-link').textContent).toBe('v0')
    expect(cards()[24].querySelector('.release-link').textContent).toBe('v24')
  })

  test('a re-render cancels batches still pending from the previous render', async () => {
    renderStats(Array.from({ length: 25 }, (_, i) => makeRelease(`old${i}`)))
    renderStats([makeRelease('new0'), makeRelease('new1')])

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(cards()).toHaveLength(2)
    expect(document.querySelector('.release-link').textContent).toBe('new0')
  })

  test('does not throw when the total or list elements are missing', () => {
    byId('total-downloads').remove()
    expect(() => renderStats([makeRelease('v1.0.0')])).not.toThrow()

    byId('releases-list').remove()
    expect(() => renderStats([makeRelease('v1.0.0')])).not.toThrow()
  })
})

describe('fetchStats: network', () => {
  test('fetches, renders and caches a slim copy on a fresh load', async () => {
    globalThis.fetch.mockResolvedValueOnce(
      response([{ ...makeRelease('v1.0.0'), body: 'large body' }], { etag: 'etag-123' })
    )

    await fetchStats()

    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    expect(globalThis.fetch.mock.calls[0][0]).toContain('per_page=100&page=1')
    expect(byId('loading').style.display).toBe('none')
    expect(byId('stats-container').style.display).toBe('block')
    expect(byId('total-downloads').textContent).toBe('1')
    expect(byId('last-updated').textContent).toMatch(/^Last updated: /)
    expect(document.querySelector('.release-link').textContent).toBe('v1.0.0')

    const cached = JSON.parse(localStorage.getItem(CACHE_KEY))
    expect(cached).toHaveLength(1)
    expect(cached[0].body).toBeUndefined()
    expect(localStorage.getItem(ETAG_KEY)).toBe('etag-123')
    expect(localStorage.getItem(TIME_KEY)).not.toBeNull()
  })

  test('follows pagination, merges pages and skips the ETag for multi-page results', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => makeRelease(`v1.${i}`))
    const page2 = Array.from({ length: 3 }, (_, i) => makeRelease(`v0.${i}`))
    globalThis.fetch
      .mockResolvedValueOnce(response(page1, { etag: 'page-1-etag' }))
      .mockResolvedValueOnce(response(page2))

    await fetchStats()

    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
    expect(globalThis.fetch.mock.calls[1][0]).toContain('page=2')
    expect(byId('total-downloads').textContent).toBe('103')
    expect(JSON.parse(localStorage.getItem(CACHE_KEY))).toHaveLength(103)
    expect(localStorage.getItem(ETAG_KEY)).toBeNull()
  })

  test('sends If-None-Match only for the first page', async () => {
    seedCache([makeRelease('v1.0.0')], 1000, 'old-etag')
    globalThis.fetch.mockResolvedValue(response([makeRelease('v1.0.0')]))

    await fetchStats()

    expect(globalThis.fetch.mock.calls[0][1].headers['If-None-Match']).toBe('old-etag')
  })

  test('does not send the cached ETag when the cache spans multiple pages', async () => {
    seedCache(Array.from({ length: 100 }, (_, i) => makeRelease(`v${i}`)), 1000, 'multi-page-etag')
    globalThis.fetch
      .mockResolvedValueOnce(response(Array.from({ length: 100 }, (_, i) => makeRelease(`v${i}`))))
      .mockResolvedValue(response([]))

    await fetchStats()

    expect(globalThis.fetch.mock.calls[0][1].headers['If-None-Match']).toBeUndefined()
  })
})

describe('fetchStats: caching', () => {
  test('uses fresh cache without touching the network', async () => {
    seedCache([makeRelease('v1.1.0')], Date.now())

    await fetchStats()

    expect(globalThis.fetch).not.toHaveBeenCalled()
    expect(byId('stats-container').style.display).toBe('block')
    expect(document.querySelector('.release-link').textContent).toBe('v1.1.0')
  })

  test('shows the loading indicator instead of stale data, then refreshes on 304', async () => {
    seedCache([makeRelease('v3.0.0')], 1000, 'old-etag')
    let resolveFetch
    globalThis.fetch.mockReturnValue(new Promise(resolve => { resolveFetch = resolve }))

    const pending = fetchStats()

    // Stale data stays hidden while the network answers
    expect(cards()).toHaveLength(0)
    expect(byId('loading').style.display).not.toBe('none')
    expect(byId('stats-container').style.display).toBe('none')

    resolveFetch(response(null, { status: 304 }))
    await pending

    expect(cards()).toHaveLength(1)
    expect(document.querySelector('.release-link').textContent).toBe('v3.0.0')
    expect(byId('loading').style.display).toBe('none')
    expect(byId('stats-container').style.display).toBe('block')
    expect(Number(localStorage.getItem(TIME_KEY))).toBeGreaterThan(1000)
    expect(byId('last-updated').textContent).not.toContain('1970')
  })

  test('renders only the new data when the refresh returns changes', async () => {
    seedCache([makeRelease('v1.0.0')], 1000)
    globalThis.fetch.mockResolvedValue(response([makeRelease('v2.0.0'), makeRelease('v1.0.0')]))

    await fetchStats()

    expect(cards()).toHaveLength(2)
    expect(document.querySelector('.release-link').textContent).toBe('v2.0.0')
    expect(JSON.parse(localStorage.getItem(CACHE_KEY))).toHaveLength(2)
  })

  test('falls back to stale data when the refresh fails', async () => {
    seedCache([makeRelease('v1.0.0')], 1000)
    globalThis.fetch.mockResolvedValue(response(null, { status: 429 }))
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { })

    await fetchStats()

    expect(byId('error').style.display).toBe('none')
    expect(byId('loading').style.display).toBe('none')
    expect(document.querySelector('.release-link').textContent).toBe('v1.0.0')
    expect(warnSpy).toHaveBeenCalledWith(
      'Could not refresh GitHub stats, showing cached data:',
      'RATE_LIMIT'
    )
  })

  test('ignores an invalid cache and fetches', async () => {
    localStorage.setItem(CACHE_KEY, 'not-json')
    localStorage.setItem(TIME_KEY, String(Date.now()))
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { })
    globalThis.fetch.mockResolvedValue(response([makeRelease('v2.0.0')]))

    await fetchStats()

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid cache detected'))
    expect(document.querySelector('.release-link').textContent).toBe('v2.0.0')
  })

  test('continues when localStorage reads are denied', async () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { })
    globalThis.fetch.mockResolvedValue(response([makeRelease('v1.0.0')]))

    await fetchStats()

    expect(warnSpy).toHaveBeenCalledWith('LocalStorage access denied or unavailable.')
    expect(document.querySelector('.release-link').textContent).toBe('v1.0.0')
  })

  test('continues when localStorage writes fail (quota exceeded)', async () => {
    const quotaError = new Error('QuotaExceededError')
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw quotaError })
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { })
    globalThis.fetch.mockResolvedValue(response([makeRelease('v7.2.1')], { etag: 'e' }))

    await fetchStats()

    expect(warnSpy).toHaveBeenCalledWith('LocalStorage write failed:', quotaError)
    expect(document.querySelector('.release-link').textContent).toBe('v7.2.1')
  })
})

describe('fetchStats: errors', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => { })
  })

  test.each([
    [403, 'RATE_LIMIT', 'Rate limit exceeded'],
    [429, 'RATE_LIMIT', 'Rate limit exceeded'],
    [500, 'API_ERROR_500', 'Failed to load statistics.'],
  ])('HTTP %d shows the matching message', async (status, code, message) => {
    globalThis.fetch.mockResolvedValue(response(null, { status }))

    await fetchStats()

    expect(console.error).toHaveBeenCalledWith('Stats Fetch Error:', code)
    expect(byId('error').style.display).toBe('block')
    expect(byId('error').textContent).toContain(message)
    expect(byId('loading').style.display).toBe('none')
  })

  test('network failures show an offline message', async () => {
    globalThis.fetch.mockRejectedValue(new TypeError('Failed to fetch'))

    await fetchStats()

    expect(byId('error').textContent).toContain('Network error')
  })

  test('aborts and reports a timeout when the request hangs', async () => {
    jest.useFakeTimers()
    globalThis.fetch.mockImplementation((url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => {
        const err = new Error('The operation was aborted')
        err.name = 'AbortError'
        reject(err)
      })
    }))

    const pending = fetchStats()
    jest.advanceTimersByTime(11000)
    await pending

    expect(console.error).toHaveBeenCalledWith('Stats Fetch Error:', 'TIMEOUT')
    expect(byId('error').textContent).toContain('Request timed out')
  })

  test('reports NO_DATA when the repository has no releases', async () => {
    globalThis.fetch.mockResolvedValue(response([]))

    await fetchStats()

    expect(console.error).toHaveBeenCalledWith('Stats Fetch Error:', 'NO_DATA')
    expect(byId('error').textContent).toContain('No releases were found')
  })

  test('reports an error when the API returns an unexpected payload', async () => {
    globalThis.fetch.mockResolvedValue(response({ message: 'oops' }))

    await fetchStats()

    expect(byId('error').textContent).toBe('Failed to load statistics.')
  })
})

describe('fetchStats: optional elements', () => {
  test('does not throw when UI elements are missing', async () => {
    ;['last-updated', 'loading', 'stats-container', 'total-downloads'].forEach(id => byId(id).remove())
    globalThis.fetch.mockResolvedValue(response([makeRelease('v7.2.3')]))

    await expect(fetchStats()).resolves.toBeUndefined()

    expect(document.querySelector('.release-link').textContent).toBe('v7.2.3')
  })

  test('does not throw on errors when the error element is missing', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => { })
    byId('error').remove()
    byId('loading').remove()
    globalThis.fetch.mockResolvedValue(response(null, { status: 500 }))

    await expect(fetchStats()).resolves.toBeUndefined()
  })
})

describe('init', () => {
  test('starts the fetch before initializing the shared layout', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => { })
    globalThis.fetch.mockResolvedValue(response([]))

    const pending = init()
    await pending

    expect(utils.initCommonLayout).toHaveBeenCalledTimes(1)
    expect(globalThis.fetch.mock.invocationCallOrder[0])
      .toBeLessThan(utils.initCommonLayout.mock.invocationCallOrder[0])
  })
})
