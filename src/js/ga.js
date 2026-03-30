/**
 * @file ga.js
 * @description Provides a performance-optimized loader for Google Analytics (GA4) 
 * and Google Ads. It uses an interaction-based lazy loading strategy to avoid 
 * blocking the main thread during initial page render.
 */

/**
 * Initializes Google Analytics and other Google tracking IDs using a lazy-loading strategy.
 * The scripts are only injected once the user performs an interaction (scroll, touch, or mouse move).
 * * @param {...string} ids - One or more Google tracking IDs (e.g., 'G-XXXXX', 'AW-XXXXX').
 * @returns {void}
 */
export function initGA(...ids) {
  if (ids.length === 0) {
    console.warn('Google Analytics ID is required')
    return
  }

  let loaded = false

  /**
   * Injects the Global Site Tag (gtag.js) into the document head and 
   * configures all provided tracking IDs.
   */
  const loadAnalytics = () => {
    // Safety check for empty ID or multiple triggers
    if (loaded || !ids[0]) return
    loaded = true

    // Initialize the dataLayer and the gtag function
    window.dataLayer = window.dataLayer || []
    window.gtag = function gtag() {
      window.dataLayer.push(arguments)
    }

    const script = document.createElement('script')
    script.src = `https://www.googletagmanager.com/gtag/js?id=${ids[0]}`
    script.async = true
    
    script.onload = () => {
      window.gtag('js', new Date())
      // Configure every ID passed to the function
      ids.forEach((id) => {
        window.gtag('config', id)
      })
    }
    
    document.head.appendChild(script)
  }

  /**
   * Event listener callback that triggers the analytics load.
   * Removes all interaction listeners immediately to prevent redundant calls.
   */
  const startAnalytics = () => {
    window.removeEventListener('mousemove', startAnalytics)
    window.removeEventListener('touchstart', startAnalytics)
    window.removeEventListener('scroll', startAnalytics)

    loadAnalytics()
  }

  // Use { once: true } as a secondary safety measure, though listeners are manually removed.
  // Passive listeners are used to improve scroll performance.
  window.addEventListener('mousemove', startAnalytics, { once: true, passive: true })
  window.addEventListener('touchstart', startAnalytics, { once: true, passive: true })
  window.addEventListener('scroll', startAnalytics, { once: true, passive: true })
}
