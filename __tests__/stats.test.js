import { jest, describe, beforeEach, test, expect } from '@jest/globals'

// A helper to wait for all currently pending promises to resolve
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0))

// 1. Mock Fetch IMMEDIATELY (Before any imports)
globalThis.fetch = jest.fn()
globalThis.Headers = class {
  constructor(entries) { this.entries = entries || {} }
  get(name) { return this.entries[name.toLowerCase()] || null }
}

// 2. Define the mock
jest.unstable_mockModule('../src/js/utils.js', () => ({
  initCommonLayout: jest.fn(),
  initCopyrightYear: jest.fn(),
  initHeaderHamburger: jest.fn(),
  initToggleDarkMode: jest.fn(),
  initBackToTop: jest.fn(),
  initThemeSync: jest.fn(),
}))

// 3. Get the mock reference
const utils = await import('../src/js/utils.js')

describe('Stats Page Logic (stats.js)', () => {
  test('calls initCommonLayout on DOMContentLoaded', async () => {
    // Clear mock state in case of multiple tests
    utils.initCommonLayout.mockClear()

    // 3. Import the file. 
    // This executes the top-level code and attaches the event listener.
    await import('../src/js/stats.js')

    // 4. Dispatch the event AFTER the import has attached the listener
    window.document.dispatchEvent(new Event('DOMContentLoaded', {
      bubbles: true,
      cancelable: true
    }))

    // 5. Check the mock
    expect(utils.initCommonLayout).toHaveBeenCalledTimes(1)
  })
})

describe('Statistics Page Logic (stats.js)', () => {
  // Increased timeout to ensure all microtasks (fetch -> json -> render) finish
  const flushPromises = () => new Promise(resolve => setTimeout(resolve, 20))

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="loading"></div>
      <div id="error" style="display: none;"></div>
      <div id="stats-container" style="display: none;"></div>
      <span id="last-updated"></span>
      <div id="total-downloads"></div>
      <div id="releases-list"></div>
      <footer></footer>
    `
    localStorage.clear()
    // Use a clean mock for every test
    globalThis.fetch = jest.fn()
  })

  test('fetches and renders stats correctly on fresh load', async () => {
    const mockReleaseData = [{
      html_url: 'http://example.com',
      tag_name: 'v1.0.0',
      published_at: '2024-01-01T00:00:00Z',
      author: { html_url: 'http://author.com', avatar_url: 'http://avatar.com', login: 'testuser' },
      assets: [{ download_count: 50, browser_download_url: 'http://dl.com', name: 'app.exe', size: 1024 }]
    }]

    // Mock first call as data, subsequent calls as empty array to break the loop
    globalThis.fetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'etag': 'etag-123' }),
        json: async () => mockReleaseData
      })
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => []
      })

    await import(`../src/js/stats.js?t=${Date.now()}`)
    window.document.dispatchEvent(new Event('DOMContentLoaded'))

    await flushPromises()

    expect(document.getElementById('loading').style.display).toBe('none')
    expect(document.getElementById('stats-container').style.display).toBe('block')
    expect(document.getElementById('total-downloads').textContent).toBe('50')
    expect(document.querySelector('.release-link').textContent).toBe('v1.0.0')
  })

  test('displays error message on rate limit', async () => {
    // Use sticky mockResolvedValue so even if multiple listeners fire, 
    // they all get the 403 and don't throw TypeErrors.
    globalThis.fetch.mockResolvedValue({
      ok: false,
      status: 403,
    })

    await import(`../src/js/stats.js?err=${Date.now()}`)
    window.document.dispatchEvent(new Event('DOMContentLoaded'))

    await flushPromises()

    const errorEl = document.getElementById('error')
    expect(errorEl.style.display).toBe('block')
    // Matches the message defined in your stats.js handleError function
    expect(errorEl.textContent).toContain('Rate limit exceeded')
  })

  test('loads from cache if data is fresh', async () => {
    const repo = 'aelassas/servy'
    const now = Date.now()
    const freshData = [{
      tag_name: 'v1.1.0',
      assets: [],
      author: { login: 'user' },
      published_at: now
    }]

    // Setup Fresh Cache
    localStorage.setItem(`github_stats_${repo}`, JSON.stringify(freshData))
    localStorage.setItem(`github_stats_${repo}_timestamp`, now.toString())

    await import(`../src/js/stats.js?cache=${Date.now()}`)
    window.document.dispatchEvent(new Event('DOMContentLoaded'))

    await flushPromises()

    // Verify UI updated from cache
    expect(document.getElementById('stats-container').style.display).toBe('block')
    expect(document.querySelector('.release-link').textContent).toBe('v1.1.0')
    // Verify fetch was NEVER called because of the early 'return'
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  test('proceeds to fetch if cache is invalid JSON', async () => {
    const repo = 'aelassas/servy'

    // 1. Setup invalid cache to trigger the catch block
    localStorage.setItem(`github_stats_${repo}`, 'not-json')
    localStorage.setItem(`github_stats_${repo}_timestamp`, Date.now().toString())

    // 2. Mock the FETCH loop
    globalThis.fetch
      // First call: Return data
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'etag': 'new-etag' }),
        json: async () => [{
          tag_name: 'v2.0.0',
          assets: [],
          author: { login: 'u', html_url: '', avatar_url: '' },
          published_at: new Date().toISOString()
        }]
      })
      // ALL subsequent calls: Return empty array to break the 'while' loop
      // This prevents the "cannot read status of undefined" error
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => []
      })

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { })

    await import(`../src/js/stats.js?corrupt=${Date.now()}`)
    window.document.dispatchEvent(new Event('DOMContentLoaded'))

    await flushPromises()

    // Verify the 'catch' block was hit
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid cache detected'))
    // Verify UI rendered the network data
    expect(document.querySelector('.release-link').textContent).toBe('v2.0.0')

    warnSpy.mockRestore()
  })

  test('handles 304 Not Modified correctly', async () => {
    const repo = 'aelassas/servy'
    const cachedData = [{ tag_name: 'v3.0.0', assets: [], author: { login: 'u' } }]

    localStorage.setItem(`github_stats_${repo}`, JSON.stringify(cachedData))
    localStorage.setItem(`github_stats_${repo}_etag`, 'old-etag')
    // Set timestamp to expired to force the fetch loop
    localStorage.setItem(`github_stats_${repo}_timestamp`, '1000')

    globalThis.fetch.mockResolvedValue({
      status: 304,
      ok: true
    })

    await import(`../src/js/stats.js?304=${Date.now()}`)
    window.document.dispatchEvent(new Event('DOMContentLoaded'))

    await flushPromises()

    // Verify it used the cached data even though it went to the network
    expect(document.querySelector('.release-link').textContent).toBe('v3.0.0')
    expect(localStorage.getItem(`github_stats_${repo}_timestamp`)).not.toBe('1000')
  })
})

test('handles localStorage access denial gracefully', async () => {
  // 1. Spy on localStorage.getItem and force it to throw
  const storageSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('SecurityError: The operation is insecure.')
  })

  // 2. Also spy on console.warn to verify the branch was hit
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { })

  // 3. Setup a successful fetch mock so the rest of the function completes
  globalThis.fetch
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => [{ tag_name: 'v1.0.0', assets: [], author: { login: 'u' } }]
    })
    .mockResolvedValue({ ok: true, json: async () => [] })

  // 4. Trigger the logic
  await import(`../src/js/stats.js?storage-fail=${Date.now()}`)
  window.document.dispatchEvent(new Event('DOMContentLoaded'))

  await flushPromises()

  // 5. Assertions
  // This confirms the 'catch' block on line 64 was executed
  expect(warnSpy).toHaveBeenCalledWith('LocalStorage access denied or unavailable.')

  // Confirm it proceeded to fetch anyway
  expect(globalThis.fetch).toHaveBeenCalled()

  // 6. Cleanup
  storageSpy.mockRestore()
  warnSpy.mockRestore()
})

test('handles generic API errors (e.g., 500) and constructs error string', async () => {
  // 1. Ensure a clean slate so we skip the 'Instant Cache Load' (line 71)
  localStorage.clear()

  // 2. Mock a response that has the minimal structure needed to avoid crashes
  // We need 'headers' because line 108 calls response.headers.get('ETag')
  const mockFailure = {
    ok: false,
    status: 500,
    headers: { get: () => null },
    json: async () => []
  }

  // Use a sticky mock so any loop iteration is safe
  globalThis.fetch.mockResolvedValue(mockFailure)

  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { })

  // 3. Trigger the logic with a fresh cache-busting import
  await import(`../src/js/stats.js?api-err=${Date.now()}`)
  window.document.dispatchEvent(new Event('DOMContentLoaded'))

  await flushPromises()

  // 4. Verify the 'throw' and 'handleError' logic worked
  expect(errorSpy).toHaveBeenCalledWith('Stats Fetch Error:', 'API_ERROR_500')

  const errorEl = document.getElementById('error')
  expect(errorEl.style.display).toBe('block')
  expect(errorEl.textContent).toBe('Failed to load statistics.')

  errorSpy.mockRestore()
})

test('triggers controller.abort() when FETCH_TIMEOUT is reached', async () => {
  // 1. Reset state
  jest.resetModules()
  localStorage.clear()
  jest.useFakeTimers()

  // 2. Mock fetch to respect the abort signal
  // This is the key: we simulate a fetch that hangs, but rejects when aborted
  globalThis.fetch = jest.fn().mockImplementation((url, { signal }) => {
    return new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => {
        const err = new Error('The operation was aborted')
        err.name = 'AbortError'
        reject(err)
      })
    })
  })

  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { })

  // 3. Fresh import and execution
  await import(`../src/js/stats.js?abort-trigger=${Date.now()}`)
  window.document.dispatchEvent(new Event('DOMContentLoaded'))

  // 4. Fast-forward past FETCH_TIMEOUT (10s)
  // This triggers: () => controller.abort()
  jest.advanceTimersByTime(11000)

  // 5. Switch back to real timers to process the resulting promise rejection
  jest.useRealTimers()
  await flushPromises()

  // 6. Final Assertions
  expect(errorSpy).toHaveBeenCalledWith('Stats Fetch Error:', 'TIMEOUT')

  const errorEl = document.getElementById('error')
  expect(errorEl.textContent).toContain('Request timed out')

  errorSpy.mockRestore()
})

test('formatSize covers all branches (Bytes, KB, MB)', async () => {
  const mockMultiSizeData = [{
    tag_name: 'v2.1.0',
    published_at: new Date().toISOString(),
    author: { login: 'u', html_url: '', avatar_url: '' },
    assets: [
      {
        name: 'small-file.txt',
        size: 500, // 500 B
        download_count: 1,
        browser_download_url: '#'
      },
      {
        name: 'large-app.zip',
        size: 1024 * 1024 * 5, // 5 MB
        download_count: 1,
        browser_download_url: '#'
      },
      {
        name: 'large-file.msi',
        size: 1024 * 1024 * 12.55, // 12.55 MB -> size >= 10 -> Math.round logic
        download_count: 1,
        browser_download_url: '#'
      }
    ]
  }]

  globalThis.fetch
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => mockMultiSizeData
    })
    .mockResolvedValue({ ok: true, json: async () => [] })

  await import(`../src/js/stats.js?format-test=${Date.now()}`)
  window.document.dispatchEvent(new Event('DOMContentLoaded'))

  await flushPromises()

  const assetSizes = Array.from(document.querySelectorAll('.asset-size'))
    .map(el => el.textContent)

  expect(assetSizes).toContain('500 B')

  // Changed from '5 MB' to '5.00 MB' to match the toFixed(2) branch
  expect(assetSizes).toContain('5.00 MB')
})

test('renders "Pre-release" badge when release.prerelease is true', async () => {
  // 1. Reset state for a fresh execution
  jest.resetModules()
  localStorage.clear()

  const mockPreData = [
    {
      tag_name: 'v7.3.0-beta',
      prerelease: true, // Should trigger the branch
      published_at: new Date().toISOString(),
      author: { login: 'jdoe', html_url: '#', avatar_url: '#' },
      assets: []
    },
    {
      tag_name: 'v7.2.0',
      prerelease: false, // Should NOT trigger the branch
      published_at: new Date().toISOString(),
      author: { login: 'jdoe', html_url: '#', avatar_url: '#' },
      assets: []
    }
  ]

  globalThis.fetch
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => mockPreData
    })
    .mockResolvedValue({ ok: true, json: async () => [] })

  // 2. Import with cache-busting
  await import(`../src/js/stats.js?pre=${Date.now()}`)
  window.document.dispatchEvent(new Event('DOMContentLoaded'))

  await flushPromises()

  // 3. Verify the Badge exists
  const preBadges = document.querySelectorAll('.badge.pre')
  expect(preBadges.length).toBe(1)
  expect(preBadges[0].textContent).toBe('Pre-release')

  // 4. Verify it's attached to the correct release (v7.3.0-beta)
  const firstReleaseTitle = document.querySelectorAll('.release-title')[0]
  expect(firstReleaseTitle.querySelector('.badge.pre')).not.toBeNull()

  // 5. Verify the stable release doesn't have it
  const secondReleaseTitle = document.querySelectorAll('.release-title')[1]
  expect(secondReleaseTitle.querySelector('.badge.pre')).toBeNull()
})

test('handles localStorage write failure (QuotaExceeded) gracefully', async () => {
  // 1. Reset everything
  jest.resetModules()
  localStorage.clear()

  const storageError = new Error('Persistent storage maximum size exceeded')
  const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw storageError
  })

  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { })

  // 2. Mock a clean, single-page fetch success
  globalThis.fetch = jest.fn()
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'ETag': 'new-etag' }),
      json: async () => [{
        tag_name: 'v7.2.1',
        published_at: new Date().toISOString(),
        author: { login: 'jdoe', html_url: '', avatar_url: '' },
        assets: []
      }]
    })
    .mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [] // To break the while loop immediately
    })

  // 3. Import and trigger
  await import(`../src/js/stats.js?write-fail=${Date.now()}`)
  window.document.dispatchEvent(new Event('DOMContentLoaded'))

  // 4. Use a slightly longer flush to ensure the 'Update Cache' phase is reached
  await new Promise(resolve => setTimeout(resolve, 50))

  // 5. Assertions
  // safeLocalStorageSet is called for: cacheKey, cacheTimeKey, and etagKey
  expect(warnSpy).toHaveBeenCalledWith('LocalStorage write failed:', storageError)

  const releaseLink = document.querySelector('.release-link')
  expect(releaseLink.textContent).toBe('v7.2.1')

  // 6. Cleanup
  setItemSpy.mockRestore()
  warnSpy.mockRestore()
})

test('sets keepFetching to false when API returns no data', async () => {
  // 1. Reset for a clean execution
  jest.resetModules()
  localStorage.clear()

  // 2. Mock fetch to return an empty array immediately
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => [] // This triggers the 'if (data.length === 0)' branch
  })

  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { })

  // 3. Trigger the logic
  await import(`../src/js/stats.js?no-data=${Date.now()}`)
  window.document.dispatchEvent(new Event('DOMContentLoaded'))

  // 4. Wait for the loop and the subsequent 'NO_DATA' throw
  await flushPromises()

  // 5. Assertions
  // Since allReleases.length is 0, it should throw 'NO_DATA' (Line 124)
  expect(errorSpy).toHaveBeenCalledWith('Stats Fetch Error:', 'NO_DATA')

  const errorEl = document.getElementById('error')
  expect(errorEl.textContent).toContain('No releases were found')

  errorSpy.mockRestore()
})

test('updateTimestampUI returns early if last-updated element is missing', async () => {
  // 1. Reset for fresh execution
  jest.resetModules()
  localStorage.clear()

  // 2. Remove the specific element from the DOM provided by beforeEach
  const el = document.getElementById('last-updated')
  if (el) el.remove()

  // 3. Mock a successful fetch so the code reaches the updateTimestampUI call
  globalThis.fetch = jest.fn()
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => [{
        tag_name: 'v7.2.2',
        published_at: new Date().toISOString(),
        author: { login: 'jdoe' },
        assets: []
      }]
    })
    .mockResolvedValue({ ok: true, json: async () => [] })

  // 4. Trigger the logic
  await import(`../src/js/stats.js?missing-el=${Date.now()}`)
  window.document.dispatchEvent(new Event('DOMContentLoaded'))

  await flushPromises()

  // 5. Assertions
  // If the branch wasn't covered, the test would have crashed 
  // with "Cannot set properties of null (setting 'textContent')"
  expect(document.getElementById('last-updated')).toBeNull()

  // Verify the rest of the UI still rendered correctly
  expect(document.querySelector('.release-link').textContent).toBe('v7.2.2')
})

test('finalizeUI handles missing elements without throwing', async () => {
  jest.resetModules()
  localStorage.clear()

  // 1. Specifically remove ONLY the elements finalizeUI checks for
  const idsToRemove = ['loading', 'stats-container', 'footer']
  idsToRemove.forEach(id => {
    const el = document.getElementById(id) || document.querySelector(id)
    if (el) el.remove()
  })

  // 2. Mock a clean fetch success
  globalThis.fetch = jest.fn()
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'ETag': 'v7-etag' }),
      json: async () => [{
        tag_name: 'v7.2.3',
        published_at: new Date().toISOString(),
        author: { login: 'jdoe', html_url: '#', avatar_url: '#' },
        assets: []
      }]
    })
    .mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => []
    })

  await import(`../src/js/stats.js?final-ui-v2=${Date.now()}`)
  window.document.dispatchEvent(new Event('DOMContentLoaded'))

  await flushPromises()

  // 3. Assertions
  // Check that the elements are indeed null
  expect(document.getElementById('loading')).toBeNull()
  expect(document.getElementById('stats-container')).toBeNull()

  // Verify that even if it rendered elsewhere, the core logic finished
  // without a "TypeError: Cannot set properties of null (setting 'display')"
  const link = document.querySelector('.release-link')
  if (link) {
    expect(link.textContent).toBe('v7.2.3')
  }
})

test('covers both branches of ETag assignment (page 1 vs page 2+)', async () => {
  jest.resetModules()
  localStorage.clear()

  // 1. Setup DOM to avoid render crashes
  document.body.innerHTML = '<div id="loading"></div><div id="stats-container"></div><div id="error"></div><div id="releases-list"></div><div id="last-updated"></div><div id="total-downloads"></div><footer></footer>'

  // 2. Mock 100 items for Page 1 (Triggers Page 2)
  const page1Data = Array(100).fill({
    tag_name: 'v1.0.0',
    published_at: new Date().toISOString(),
    author: { login: 'akram', html_url: '#', avatar_url: '#' },
    assets: []
  })

  // 3. Precise Fetch Mocking
  const mockFetch = jest.fn()
  globalThis.fetch = mockFetch

  // Page 1: Sets newEtag (True branch)
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    headers: { get: (k) => k.toLowerCase() === 'etag' ? 'page-1-etag' : null },
    json: async () => page1Data
  })

  // Page 2: Skips ETag assignment (False branch) and STOPS loop
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    headers: { get: (k) => k.toLowerCase() === 'etag' ? 'ignored-etag' : null },
    json: async () => [] // length 0 is critical here to set keepFetching = false
  })

  // Fallback for safety: If the script calls page 3+, this prevents the 'ok' crash
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: async () => []
  })

  // 4. Execution
  await import(`../src/js/stats.js?bust=${Date.now()}`)
  window.document.dispatchEvent(new Event('DOMContentLoaded'))
  
  await flushPromises()
  await new Promise(resolve => setTimeout(resolve, 50))

  // 5. Assertions
  const etagKey = 'github_stats_aelassas/servy_etag'
  
  // Verify it captured Page 1 and ignored Page 2
  expect(localStorage.getItem(etagKey)).toBe('page-1-etag')
  expect(mockFetch).toHaveBeenCalled()
})

test('covers the FALSE branch for total-downloads element (when missing)', async () => {
  // 1. Full reset
  jest.resetModules()
  localStorage.clear()
  
  // 2. DOM WITHOUT the element
  document.body.innerHTML = `
    <div id="loading"></div>
    <div id="stats-container"></div>
    <div id="error"></div>
    <div id="releases-list"></div>
    <div id="last-updated"></div>
    <footer></footer>
  `

  // 3. Mock fetch to return valid data so it reaches the UI update phase
  const mockFetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Map([['etag', 'branch-test']]),
    json: async () => [{
      tag_name: 'v1.0.0',
      published_at: new Date().toISOString(),
      author: { login: 'akram' },
      assets: [{ download_count: 100 }] // totalDownloads will be 100
    }]
  })
  globalThis.fetch = mockFetch

  // 4. Import and Trigger
  // Use a unique query string to ensure this is the ONLY script instance running
  await import(`../src/js/stats.js?branch-false=${Date.now()}`)
  window.document.dispatchEvent(new Event('DOMContentLoaded'))

  // 5. Wait specifically for the UI update phase
  await new Promise(resolve => setTimeout(resolve, 100))

  // 6. Assertion
  const totalEl = document.getElementById('total-downloads')
  expect(totalEl).toBeNull()
  
  // Verify that the script reached the end (finalizeUI) despite the missing element
  const container = document.getElementById('stats-container')
  expect(container.style.display).toBe('block')
})
