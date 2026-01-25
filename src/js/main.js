import * as utils from './utils.js'
import { initGA } from './ga.js'
import 'lite-youtube-embed/src/lite-yt-embed.css'
import 'lite-youtube-embed'
import '../css/style.css'

window.addEventListener('DOMContentLoaded', () => {
  // Initialize Google Analytics
  initGA('G-VQ7924LC4H')

  // Initialize Google Ads Conversion Tracking
  initGA('AW-16758312117')

  // Initialize Header Hamburger Menu
  utils.initHeaderHamburger()

  // Initialize Dark Mode Toggle
  utils.initToggleDarkMode()

  // Initialize Back to Top Button
  utils.initBackToTop()

  // Initialize Footer Year
  utils.initCopyrightYear()

  // Initialize code blocks
  document.querySelectorAll('.code-block').forEach(block => {
    const button = block.querySelector('.copy-btn')
    const codeElement = block.querySelector('code')

    button.addEventListener('click', () => {
      navigator.clipboard.writeText(codeElement.innerText).then(() => {
        button.textContent = 'Copied!'
        setTimeout(() => button.textContent = 'Copy', 2000)
      })
    })
  })

})
