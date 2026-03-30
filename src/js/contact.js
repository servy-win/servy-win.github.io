/**
 * @file contact.js
 * @description Entry point for the Contact page.
 * Manages page-specific initialization and shared layout components.
 */

import * as utils from './utils.js'
import '../css/style.css'
import '../css/contact.css'

/**
 * Initialize the contact page once the DOM is fully parsed.
 * * Since the contact form uses a standard HTML action (e.g., Formspree), 
 * no heavy custom JavaScript is required for the form itself, 
 * allowing us to focus on shared layout integrity.
 */
document.addEventListener('DOMContentLoaded', () => {

  /**
   * Initialize shared layout features including:
   * - Google Analytics & Ads tracking
   * - Mobile navigation (Hamburger menu)
   * - Dark Mode / Light Mode synchronization
   * - "Back to Top" scroll functionality
   * - Automatic footer copyright year update
   */
  utils.initCommonLayout()

})
