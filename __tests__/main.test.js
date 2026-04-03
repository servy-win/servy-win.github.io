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

describe('Main Page Core Initialization', () => {
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

describe('Main Page Clipboard UI Interactions', () => {
  let writeTextMock

  beforeEach(() => {
    writeTextMock = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true
    })

    document.body.innerHTML = `
      <div class="code-block" id="valid">
        <code>console.log('test')</code>
        <button class="copy-btn">Copy</button>
      </div>
      <div class="code-block" id="invalid">
        <button class="copy-btn">Copy</button>
      </div>`
  })

  test('reverts "Copied!" text after 2 seconds', async () => {
    jest.useFakeTimers()

    // Force a fresh import to attach listeners to the fake clock
    await import(`../src/js/main.js?t=${Date.now()}`)
    window.dispatchEvent(new Event('DOMContentLoaded'))

    const btn = document.querySelector('.copy-btn')

    // Trigger the click
    btn.click()

    // Wait for the clipboard promise to resolve AND the timer to finish
    // This flushes microtasks (promises) and macrotasks (timers) in order
    await jest.advanceTimersByTimeAsync(2000)

    expect(btn.textContent).toBe('Copy')

    jest.useRealTimers()
  })

  test('handles clipboard failure and reverts "Failed" text', async () => {
    jest.useFakeTimers()

    writeTextMock.mockRejectedValue(new Error('Clipboard error'))

    await import(`../src/js/main.js?t=${Date.now() + 1}`)
    window.dispatchEvent(new Event('DOMContentLoaded'))

    const btn = document.querySelector('#valid .copy-btn')
    btn.click()

    // Wait for the rejection to process
    await Promise.resolve()
    await Promise.resolve()

    expect(btn.textContent).toBe('Failed')

    // Fast-forward time
    jest.advanceTimersByTime(2000)
    expect(btn.textContent).toBe('Copy')
  })

  test('returns early if button or code element is missing', async () => {
    // This targets the "if (!button || !codeElement) return" line
    await import(`../src/js/main.js?t=${Date.now() + 2}`)
    window.dispatchEvent(new Event('DOMContentLoaded'))

    const invalidBlock = document.querySelector('#invalid')
    const btn = invalidBlock.querySelector('.copy-btn')

    // If the guard failed, an event listener would be attached. 
    // If the guard worked, clicking does nothing to the clipboard.
    btn.click()
    expect(writeTextMock).not.toHaveBeenCalled()
  })
})
