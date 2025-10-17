import { initGA } from './ga.js'
import 'lite-youtube-embed/src/lite-yt-embed.css'
import 'lite-youtube-embed'
import '../css/style.css'

window.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('dark-mode-toggle')
  const root = document.documentElement // html element

  // Initialize Google Analytics
  initGA('G-VQ7924LC4H')

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

  // Set the current year in the footer
  const yearElement = document.getElementById('year')
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear()
  }

  // Back to top button
  const backToTopBtn = document.getElementById('back-to-top')

  let scrollTimer = null
  let lastScrollY = 0

  function updateBackToTopButton() {
    // If the user has scrolled down past the threshold (400px)
    if (lastScrollY > 400) {
      // Check if the 'show' class is NOT present before adding it
      if (!backToTopBtn.classList.contains('show')) {
        backToTopBtn.classList.add('show')
      }
    }
    // If the user is near the top of the page
    else {
      // Check if the 'show' class IS present before removing it
      if (backToTopBtn.classList.contains('show')) {
        backToTopBtn.classList.remove('show')
      }
    }

    // Reset the timer when the update is complete
    scrollTimer = null
  }

  function handleScroll() {
    // Store the current scroll position outside of rAF
    lastScrollY = window.scrollY

    // Only request a new frame if one isn't pending
    if (!scrollTimer) {
      scrollTimer = window.requestAnimationFrame(updateBackToTopButton)
    }
  }

  // Attach the rAF handler
  window.addEventListener('scroll', handleScroll)

  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })

})
