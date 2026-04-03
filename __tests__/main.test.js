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

describe('Contact Page Logic (main.js)', () => {
  test('calls initCommonLayout on DOMContentLoaded', async () => {
    // Clear mock state in case of multiple tests
    utils.initCommonLayout.mockClear()

    // 3. Import the file. 
    // This executes the top-level code and attaches the event listener.
    await import('../src/js/main.js')

    // 4. Dispatch the event AFTER the import has attached the listener
    window.document.dispatchEvent(new Event('DOMContentLoaded', {
      bubbles: true,
      cancelable: true
    }))

    // 5. Check the mock
    expect(utils.initCommonLayout).toHaveBeenCalledTimes(1)
  })
})

describe('Main Page Logic (main.js)', () => {
  let writeTextMock

  beforeEach(() => {
    writeTextMock = jest.fn().mockResolvedValue(undefined)

    // Correctly mock the navigator.clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true
    })

    document.body.innerHTML = `
      <div class="code-block">
        <code>console.log('test')</code>
        <button class="copy-btn">Copy</button>
      </div>`
  })


  test('initializes code blocks and copies text on click', async () => {
    // 1. Use cache-busting for ESM import
    await import(`../src/js/main.js?t=${Date.now()}`)

    // 2. Dispatch event
    window.dispatchEvent(new Event('DOMContentLoaded'))

    const btn = document.querySelector('.copy-btn')

    // 3. Trigger click
    btn.click()

    // 4. Verify the mock call
    expect(writeTextMock).toHaveBeenCalledWith('console.log(\'test\')')

    // 5. Optional: Verify UI feedback after the promise resolves
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(btn.textContent).toBe('Copied!')
  })
})
