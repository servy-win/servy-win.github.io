
export const initHeaderHamburger = () => {
  const hamburger = document.getElementById('hamburger-menu')
  const navLinks = document.getElementById('nav-links')

  const closeMenu = () => {
    navLinks.classList.remove('active')
    hamburger.classList.remove('active')
    // Remove the scroll lock if you added it previously
    document.body.style.overflow = ''
  }

  hamburger.addEventListener('click', (e) => {
    // Prevent the document listener from immediately closing the menu we just opened
    e.stopPropagation()

    navLinks.classList.toggle('active')
    hamburger.classList.toggle('active')

    // Optional: Toggle scroll lock
    const isOpen = navLinks.classList.contains('active')
    document.body.style.overflow = isOpen ? 'hidden' : ''
  })

  // 1. Close when clicking outside
  document.addEventListener('click', (event) => {
    const isClickInsideMenu = navLinks.contains(event.target)
    const isClickOnHamburger = hamburger.contains(event.target)

    if (!isClickInsideMenu && !isClickOnHamburger && navLinks.classList.contains('active')) {
      closeMenu()
    }
  })

  // 2. Close when clicking a link
  document.querySelectorAll('.header-link').forEach(link => {
    link.addEventListener('click', closeMenu)
  })

  // 3. Optional: Close on 'Escape' key for accessibility
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu()
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
