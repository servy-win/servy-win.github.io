/**
 * @file main.js
 * @description Entry point for the index/home page. 
 * Handles core layout initialization and home-specific interactive elements like code-copying.
 */

import * as utils from './utils.js'
import 'lite-youtube-embed/src/lite-yt-embed.css'
import 'lite-youtube-embed'
import '../css/style.css'

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

    // Safety check to ensure the block has the expected internal structure
    if (!button || !codeElement) return

    /**
     * Handles the click event to copy code text to the system clipboard.
     * Provides visual feedback by temporarily changing the button text.
     */
    button.addEventListener('click', () => {
      navigator.clipboard.writeText(codeElement.innerText)
        .then(() => {
          const originalText = button.textContent
          button.textContent = 'Copied!'
          
          // Revert button text after 2 seconds
          setTimeout(() => {
            button.textContent = originalText
          }, 2000)
        })
        .catch(() => { 
          button.textContent = 'Failed' 
          setTimeout(() => { button.textContent = 'Copy' }, 2000)
        })
    })
  })
}
