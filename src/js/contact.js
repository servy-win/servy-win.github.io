import * as utils from './utils.js'
import { initGA } from './ga.js'
import '../css/style.css'

// Re-use theme toggle logic
document.addEventListener('DOMContentLoaded', () => {
  // GA Init
  initGA('G-VQ7924LC4H')

  // Initialize Dark Mode Toggle
  utils.initToggleDarkMode()

  // Initialize Back to Top Button
  utils.initBackToTop()

  // Initialize Footer Year
  utils.initCopyrightYear()
})
