
export const initHeaderHamburger = () => {
  const hamburger = document.getElementById('hamburger-menu')
  const navLinks = document.getElementById('nav-links')

  hamburger.addEventListener('click', () => {
    // Toggles the slide-in menu
    navLinks.classList.toggle('active')

    // Toggles the animation for the X button
    hamburger.classList.toggle('active')
  })

  // Optional: Close menu when clicking a link
  document.querySelectorAll('.header-link').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('active')
      hamburger.classList.remove('active')
    })
  })
}

export const initToggleDarkMode = () => {
  const toggleBtn = document.getElementById('dark-mode-toggle')
  const root = document.documentElement // html element
  // Initialize from localStorage
  if (localStorage.getItem('theme') === 'dark') {
    root.setAttribute('data-theme', 'dark')
  }

  toggleBtn.addEventListener('click', () => {
    if (root.getAttribute('data-theme') === 'dark') {
      root.removeAttribute('data-theme')
      localStorage.setItem('theme', 'light')
    } else {
      root.setAttribute('data-theme', 'dark')
      localStorage.setItem('theme', 'dark')
    }
  })
}

export const initBackToTop = () => {
  const backToTopBtn = document.getElementById('back-to-top')
  if (backToTopBtn) {
    let rAFId = null
    const SCROLL_THRESHOLD = 400

    function updateBackToTopButton() {
      // Read the scroll position *inside* rAF
      const currentScrollY = window.scrollY
      const show = currentScrollY > SCROLL_THRESHOLD

      // Visual Toggle: Adds/removes 'show' class based on scroll position
      backToTopBtn.classList.toggle('show', show)

      // Reset the rAFId when the update is complete, allowing a new rAF request
      rAFId = null
    }

    function handleScroll() {
      // Only request a new frame if one isn't pending
      if (!rAFId) {
        rAFId = window.requestAnimationFrame(updateBackToTopButton)
      }
    }

    // Check visibility immediately on load to handle deep links/refreshes
    updateBackToTopButton()

    // Attach the rAF handler
    window.addEventListener('scroll', handleScroll)

    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }
}

export const initCopyrightYear = () => {
  // Set the current year in the footer
  const yearElement = document.getElementById('year')
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear()
  }
}
