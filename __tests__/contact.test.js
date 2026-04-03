import { jest, describe, test, expect } from '@jest/globals'

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

describe('Contact Page Logic (contact.js)', () => {
  test('calls initCommonLayout on DOMContentLoaded', async () => {
    // Clear mock state in case of multiple tests
    utils.initCommonLayout.mockClear()

    // 3. Import the file. 
    // This executes the top-level code and attaches the event listener.
    await import('../src/js/contact.js')
    
    // 4. Dispatch the event AFTER the import has attached the listener
    window.document.dispatchEvent(new Event('DOMContentLoaded', {
      bubbles: true,
      cancelable: true
    }))
    
    // 5. Check the mock
    expect(utils.initCommonLayout).toHaveBeenCalledTimes(1)
  })
})
