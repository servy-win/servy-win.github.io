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
})
