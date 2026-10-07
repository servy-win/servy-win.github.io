import { jest, describe, test, expect } from '@jest/globals'

jest.unstable_mockModule('../src/js/utils.js', () => ({
  initCommonLayout: jest.fn(),
  initCopyrightYear: jest.fn(),
  initHeaderHamburger: jest.fn(),
  initToggleDarkMode: jest.fn(),
  initBackToTop: jest.fn(),
  initThemeSync: jest.fn(),
}))

const utils = await import('../src/js/utils.js')

describe('Contact Page Logic (contact.js)', () => {
  test('calls initCommonLayout once when the module loads', async () => {
    utils.initCommonLayout.mockClear()

    await import('../src/js/contact.js')

    expect(utils.initCommonLayout).toHaveBeenCalledTimes(1)
  })
})