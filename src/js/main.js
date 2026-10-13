/**
 * @file main.js
 * @description Entry point for the index/home page. 
 * Handles core layout initialization and home-specific interactive elements like code-copying.
 */

import * as utils from './utils.js'
// import 'lite-youtube-embed/src/lite-yt-embed.css'
// import 'lite-youtube-embed'
import '../css/base.css'
import '../css/home.css'

/**
 * Initialize page-specific logic once the DOM is fully loaded.
 */
window.addEventListener('DOMContentLoaded', () => {
  
  /**
   * Initialize shared layout features including:
   * - Google Analytics & Ads
   * - Hamburger Menu (Mobile Nav)
   * - Dark Mode Toggle & System Preference Sync
   * - Back to Top Button with rAF throttling
   * - Dynamic Footer Copyright Year
   */
  utils.initCommonLayout()

  /**
   * Initialize interactive code blocks.
   * Provides a "Copy" button functionality for all elements with the .code-block class.
   */
  initCodeBlocks()
})

/**
 * Scans the document for code blocks and attaches clipboard functionality.
 * @returns {void}
 */
const initCodeBlocks = () => {
  const codeBlocks = document.querySelectorAll('.code-block')
  
  codeBlocks.forEach(block => {
    const button = block.querySelector('.copy-btn')
    const codeElement = block.querySelector('code')
    const useElement = button?.querySelector('use')

    // Safety check to ensure the block has the expected internal structure
    if (!button || !codeElement || !useElement) return

    let timeoutId = null

    /**
     * Resets the button to its initial copy state.
     */
    const resetState = () => {
      useElement.setAttribute('href', '#icon-copy')
      button.classList.remove('copied')
    }

    /**
     * Handles the click event to copy code text to the system clipboard.
     * Provides visual feedback by temporarily changing the button icon.
     */
    button.addEventListener('click', () => {
      const writeText = navigator.clipboard?.writeText

      if (!writeText) return

      if (timeoutId) clearTimeout(timeoutId)

      writeText.call(navigator.clipboard, codeElement.textContent)
        .then(() => {
          useElement.setAttribute('href', '#icon-check')
          button.classList.add('copied')
          
          // Revert button icon after 2 seconds
          timeoutId = setTimeout(resetState, 2000)
        })
        .catch(() => {
          resetState()
        })
    })
  })
}
