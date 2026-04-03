import { jest, describe, beforeEach, test, expect } from '@jest/globals'
import * as utils from '../src/js/utils.js'

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
