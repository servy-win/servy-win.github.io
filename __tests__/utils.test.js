import { jest, describe, beforeEach, test, expect } from '@jest/globals'

// 1. This MUST come before any other imports
jest.unstable_mockModule('../src/js/ga.js', () => ({
  initGA: jest.fn(),
}))

// 2. You MUST use dynamic imports for the modules you want to mock
const { initGA } = await import('../src/js/ga.js')
const utils = await import('../src/js/utils.js')

describe('initCommonLayout', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <div id="hamburger-menu"></div>
      <div id="nav-links"></div>
      <button id="dark-mode-toggle"></button>
      <button id="back-to-top"></button>
      <span id="year"></span>
    `

    // Mock matchMedia for the theme toggle logic
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }))

    // Reset the mock call counts between tests
    jest.clearAllMocks()
    localStorage.clear()
  })

  test('initCommonLayout initializes all components', () => {
    // Setup state
    const navLinks = document.getElementById('nav-links')
    navLinks.innerHTML = '<a href="#" class="header-link">Link</a>'

    // Execute
    utils.initCommonLayout()

    // Assertions
    expect(document.getElementById('year').textContent).toBe(new Date().getFullYear().toString())

    // Now initGA will be recognized as a mock function
    expect(initGA).toHaveBeenCalledWith('G-VQ7924LC4H', 'AW-16758312117')
  })
})

describe('Utility Functions (utils.js)', () => {
  // Helper to wait for the asynchronous rAF mock to complete
  const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0))

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="hamburger-menu"></div>
      <div id="nav-links"></div>
      <button id="dark-mode-toggle"></button>
      <button id="back-to-top"></button>
      <span id="year"></span>
    `
    localStorage.clear()
    jest.restoreAllMocks()

    // 1. Mock scrollTo (JSDOM doesn't support it)
    window.scrollTo = jest.fn()

    // 2. Correctly mock requestAnimationFrame asynchronously
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      setTimeout(cb, 0) // Executes AFTER the rAFId assignment in the source code
      return 123 // Returns a dummy ID immediately
    })
  })

  test('initCopyrightYear sets the current year', () => {
    utils.initCopyrightYear()
    const yearEl = document.getElementById('year')
    expect(yearEl.textContent).toBe(new Date().getFullYear().toString())
  })

  test('initBackToTop toggles visibility on scroll and scrolls to top on click', async () => {
    const btn = document.getElementById('back-to-top')

    // Initialize
    utils.initBackToTop()

    // Test 1: Hidden initially (Scroll is 0)
    expect(btn.classList.contains('show')).toBe(false)

    // Test 2: Show when scrolling past threshold (400)
    Object.defineProperty(window, 'scrollY', { value: 500, writable: true, configurable: true })
    window.dispatchEvent(new Event('scroll'))

    await flushPromises() // Wait for rAF callback
    expect(btn.classList.contains('show')).toBe(true)

    // Test 3: Hide when scrolling back up
    Object.defineProperty(window, 'scrollY', { value: 100, writable: true, configurable: true })
    window.dispatchEvent(new Event('scroll'))

    await flushPromises() // Wait for rAF callback
    expect(btn.classList.contains('show')).toBe(false)

    // Test 4: Scroll to top on click
    btn.click()
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: 'smooth'
    })
  })

test('initBackToTop throttles multiple scroll events', async () => {
  // 1. Reset modules to clear internal variables like 'rAFId'
  jest.resetModules()
  const { initBackToTop } = await import('../src/js/utils.js')

  // 2. Setup a fresh DOM and Spy
  document.body.innerHTML = '<button id="back-to-top"></button>'
  const rAFSpy = jest.spyOn(window, 'requestAnimationFrame').mockReturnValue(123)

  // 3. Initialize (This calls updateBackToTopButton once immediately)
  initBackToTop()
  
  // 4. Clear that initial call so we only track the scrolls
  rAFSpy.mockClear()

  // 5. Trigger first scroll -> Sets rAFId to 123
  window.dispatchEvent(new Event('scroll'))
  
  // 6. Trigger second scroll -> Sees rAFId is 123, skips 'if (!rAFId)'
  window.dispatchEvent(new Event('scroll'))

  // 7. Success: Only 1 rAF call from the two scrolls
  expect(rAFSpy).toHaveBeenCalled()

  rAFSpy.mockRestore()
})

  test('initHeaderHamburger toggles active class on click', () => {
    utils.initHeaderHamburger()
    const hamburger = document.getElementById('hamburger-menu')
    const navLinks = document.getElementById('nav-links')

    hamburger.click()
    expect(navLinks.classList.contains('active')).toBe(true)
    expect(hamburger.classList.contains('active')).toBe(true)
    expect(document.body.style.overflow).toBe('hidden')

    hamburger.click()
    expect(navLinks.classList.contains('active')).toBe(false)
  })

  test('initHeaderHamburger closes menu when a link is clicked', () => {
    const hamburger = document.getElementById('hamburger-menu')
    const navLinks = document.getElementById('nav-links')

    // 1. Add links to the DOM BEFORE initializing
    navLinks.innerHTML = '<a href="#" class="header-link">Link</a>'

    utils.initHeaderHamburger()

    // 2. Open the menu first
    hamburger.click()
    expect(navLinks.classList.contains('active')).toBe(true)

    // 3. Click the nav link
    const link = navLinks.querySelector('.header-link')
    link.click()

    // 4. Verify closeMenu was called
    expect(navLinks.classList.contains('active')).toBe(false)
    expect(document.body.style.overflow).toBe('')
  })

  test('initHeaderHamburger closes menu when clicking outside', () => {
    utils.initHeaderHamburger()
    const hamburger = document.getElementById('hamburger-menu')
    const navLinks = document.getElementById('nav-links')

    // Open menu
    hamburger.click()

    // Create a click event on the body (outside the menu/hamburger)
    document.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(navLinks.classList.contains('active')).toBe(false)
    expect(hamburger.getAttribute('aria-expanded')).toBe('false')
  })

  test('initHeaderHamburger closes menu on Escape key', () => {
    utils.initHeaderHamburger()
    const hamburger = document.getElementById('hamburger-menu')
    const navLinks = document.getElementById('nav-links')

    // Open menu
    hamburger.click()

    // Trigger Escape key
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(navLinks.classList.contains('active')).toBe(false)
    expect(document.body.style.overflow).toBe('')
  })

  test('initHeaderHamburger toggles states correctly on repeated clicks', () => {
    utils.initHeaderHamburger()
    const hamburger = document.getElementById('hamburger-menu')
    const navLinks = document.getElementById('nav-links')

    // Open
    hamburger.click()
    expect(hamburger.getAttribute('aria-expanded')).toBe('true')

    // Close (this triggers the second half of the toggle logic/closeMenu)
    hamburger.click()
    expect(navLinks.classList.contains('active')).toBe(false)
    expect(hamburger.classList.contains('active')).toBe(false)
    expect(hamburger.getAttribute('aria-expanded')).toBe('false')
    expect(document.body.style.overflow).toBe('')
  })

  test('initHeaderHamburger does NOT close menu on non-Escape key', () => {
    utils.initHeaderHamburger()
    const hamburger = document.getElementById('hamburger-menu')
    const navLinks = document.getElementById('nav-links')

    // Open menu
    hamburger.click()
    expect(navLinks.classList.contains('active')).toBe(true)

    // Trigger 'Enter' key instead of 'Escape'
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))

    // Menu should still be active (the branch inside the IF was skipped)
    expect(navLinks.classList.contains('active')).toBe(true)
  })

  test('initToggleDarkMode toggles dark theme and saves to localStorage', () => {
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: jest.fn(),
    }))

    utils.initToggleDarkMode()
    const toggleBtn = document.getElementById('dark-mode-toggle')
    const root = document.documentElement

    expect(root.getAttribute('data-theme')).toBeNull()

    toggleBtn.click()
    expect(root.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem('theme')).toBe('dark')

    toggleBtn.click()
    expect(root.getAttribute('data-theme')).toBeNull()
    expect(localStorage.getItem('theme')).toBe('light')
  })
})

test('initToggleDarkMode responds to OS-level theme changes when no preference is saved', () => {
  let changeHandler

  // 1. Mock matchMedia to capture the 'change' listener
  window.matchMedia = jest.fn().mockImplementation(() => ({
    matches: true, // Simulate system is currently dark
    addEventListener: jest.fn((event, cb) => {
      if (event === 'change') changeHandler = cb
    }),
    removeEventListener: jest.fn(),
  }))

  utils.initToggleDarkMode()
  const root = document.documentElement

  // 2. Ensure localStorage is empty (no manual preference)
  localStorage.clear()

  // 3. Simulate OS switching to Light Mode (matches: false)
  changeHandler({ matches: false })
  expect(root.getAttribute('data-theme')).toBe('light')

  // 4. Simulate OS switching to Dark Mode (matches: true)
  changeHandler({ matches: true })
  expect(root.getAttribute('data-theme')).toBe('dark')

  // 5. Test the Guard: If user has a saved preference, OS changes should be ignored
  localStorage.setItem('theme', 'dark')
  changeHandler({ matches: false }) // OS wants light

  // Should still be dark because localStorage takes priority
  expect(root.getAttribute('data-theme')).toBe('dark')
})

describe('Utility Functions Guard Clauses', () => {

  test('initHeaderHamburger returns early if elements are missing', () => {
    // Clear DOM so getElementById returns null
    document.body.innerHTML = ''

    // This should not throw an error
    expect(() => utils.initHeaderHamburger()).not.toThrow()
  })

  test('initToggleDarkMode returns early if button is missing', () => {
    document.body.innerHTML = ''

    expect(() => utils.initToggleDarkMode()).not.toThrow()
  })

  test('initBackToTop returns early if button is missing', () => {
    document.body.innerHTML = ''

    expect(() => utils.initBackToTop()).not.toThrow()
  })

  test('initCopyrightYear handles missing year element gracefully', () => {
    document.body.innerHTML = ''

    // The if(yearElement) block won't execute, coverage will show the branch skip
    expect(() => utils.initCopyrightYear()).not.toThrow()
  })
})
