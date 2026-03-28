import * as utils from './utils.js'
import { initGA } from './ga.js'
import '../css/style.css'
import '../css/contact.css'

// Re-use theme toggle logic
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Google Analytics and Google Ads Conversion Tracking
  initGA('G-VQ7924LC4H', 'AW-16758312117')

  // Initialize Header Hamburger Menu
  utils.initHeaderHamburger()

  // Initialize Dark Mode Toggle
  utils.initToggleDarkMode()

  // Initialize Back to Top Button
  utils.initBackToTop()

  // Initialize Footer Year
  utils.initCopyrightYear()
})
