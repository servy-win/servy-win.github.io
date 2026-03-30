/**
 * @file utils.js
 * @description Global utility functions for the Servy website. 
 * Contains shared logic for UI components, theme management, and third-party tracking.
 */

import { initGA } from './ga.js'

/**
 * Orchestrates the initialization of all common layout components and tracking.
 * Should be called once per page entry point (e.g., in main.js, stats.js).
 * * @returns {void}
 */
export const initCommonLayout = () => {
  // Initialize Google Analytics and Google Ads Conversion Tracking
  initGA('G-VQ7924LC4H', 'AW-16758312117')

  // Initialize Header Hamburger Menu
  initHeaderHamburger()

  // Initialize Dark Mode Toggle
  initToggleDarkMode()

  // Initialize Back to Top Button
  initBackToTop()

  // Initialize Footer Year
  initCopyrightYear()
}

/**
 * Initializes the mobile navigation hamburger menu.
 * Handles toggling active states, ARIA attributes, scroll locking, 
 * and "click-outside" auto-closure.
 * * @returns {void}
 */
export const initHeaderHamburger = () => {
  const hamburger = document.getElementById('hamburger-menu')
  const navLinks = document.getElementById('nav-links')

  if (!hamburger || !navLinks) return

  /**
   * Internal helper to close the menu and reset UI state.
   */
  const closeMenu = () => {
    navLinks.classList.remove('active')
    hamburger.classList.remove('active')
    hamburger.setAttribute('aria-expanded', 'false')
    document.body.style.overflow = ''
  }

  hamburger.addEventListener('click', (e) => {
    e.stopPropagation()

    const isOpening = !navLinks.classList.contains('active')
    navLinks.classList.toggle('active')
    hamburger.classList.toggle('active')

    hamburger.setAttribute('aria-expanded', String(isOpening))
    document.body.style.overflow = isOpening ? 'hidden' : ''
  })

  // Close when clicking outside the menu area
  document.addEventListener('click', (event) => {
    const isClickInsideMenu = navLinks.contains(event.target)
    const isClickOnHamburger = hamburger.contains(event.target)

    if (!isClickInsideMenu && !isClickOnHamburger && navLinks.classList.contains('active')) {
      closeMenu()
    }
  })

  // Close when a navigation link is clicked (useful for anchor links)
  document.querySelectorAll('.header-link').forEach(link => {
    link.addEventListener('click', closeMenu)
  })

  // Accessibility: Close on 'Escape' key
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu()
  })
}

/**
 * Initializes the Dark Mode theme switcher.
 * Synchronizes state with localStorage and OS-level system preferences.
 * * @returns {void}
 */
export const initToggleDarkMode = () => {
  const toggleBtn = document.getElementById('dark-mode-toggle')
  const root = document.documentElement
  if (!toggleBtn) return

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  /**
   * Helper to update the button's ARIA state.
   */
  const updateAriaPressed = () => {
    const isDark = root.getAttribute('data-theme') === 'dark'
    toggleBtn.setAttribute('aria-pressed', String(isDark))
  }

  // 1. Initial Load Logic
  if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && mediaQuery.matches)) {
    root.setAttribute('data-theme', 'dark')
  }
  updateAriaPressed()

  // 2. Listen for OS-level theme changes
  mediaQuery.addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      root.setAttribute('data-theme', e.matches ? 'dark' : 'light')
      updateAriaPressed()
    }
  })

  // 3. Manual Toggle Logic
  toggleBtn.addEventListener('click', () => {
    const isDark = root.getAttribute('data-theme') === 'dark'

    if (isDark) {
      root.removeAttribute('data-theme')
      localStorage.setItem('theme', 'light')
    } else {
      root.setAttribute('data-theme', 'dark')
      localStorage.setItem('theme', 'dark')
    }
    updateAriaPressed()
  })
}

/**
 * Initializes the "Back to Top" button with performance-optimized scroll listening.
 * Uses requestAnimationFrame (rAF) to prevent layout thrashing during scroll.
 * * @returns {void}
 */
export const initBackToTop = () => {
  const backToTopBtn = document.getElementById('back-to-top')
  if (!backToTopBtn) return

  let rAFId = null
  const SCROLL_THRESHOLD = 400

  /**
   * Updates the button visibility state. 
   * Executed within a requestAnimationFrame callback.
   */
  function updateBackToTopButton() {
    const currentScrollY = window.scrollY
    const show = currentScrollY > SCROLL_THRESHOLD

    backToTopBtn.classList.toggle('show', show)
    rAFId = null
  }

  /**
   * Scroll event handler that throttles updates using rAF.
   */
  function handleScroll() {
    if (!rAFId) {
      rAFId = window.requestAnimationFrame(updateBackToTopButton)
    }
  }

  updateBackToTopButton()
  window.addEventListener('scroll', handleScroll)

  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })
}

/**
 * Dynamically injects the current year into the footer copyright notice.
 * * @returns {void}
 */
export const initCopyrightYear = () => {
  const yearElement = document.getElementById('year')
  if (yearElement) {
    yearElement.textContent = String(new Date().getFullYear())
  }
}
