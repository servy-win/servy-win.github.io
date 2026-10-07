/**
 * @file contact.js
 * @description Entry point for the Contact page.
 * Manages page-specific initialization and shared layout components.
 */

import * as utils from './utils.js'
import '../css/base.css'

/**
 * Module scripts are deferred, so the DOM is already parsed here.
 * The contact form uses a standard HTML action (Formspree), so only the
 * shared layout needs initializing: analytics, hamburger menu, dark mode,
 * "Back to Top" button and footer year.
 */
utils.initCommonLayout()