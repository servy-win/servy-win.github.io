import { jest, describe, beforeEach, test, expect } from '@jest/globals'

// 1. Define the mock
jest.unstable_mockModule('../src/js/utils.js', () => ({
  initCommonLayout: jest.fn(),
  // Add other exports if needed by other files
  initCopyrightYear: jest.fn(),
  initHeaderHamburger: jest.fn(),
  initToggleDarkMode: jest.fn(),
  initBackToTop: jest.fn(),
  initThemeSync: jest.fn(),
}))

// 2. Get the mock reference
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
})
