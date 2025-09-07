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

  // contact form
  const form = document.getElementById('contact-form')

  form.addEventListener('submit', async (e) => {
    e.preventDefault()

    const formData = new FormData(form)
    const response = await fetch(form.action, {
      method: form.method,
      body: formData,
      headers: { 'Accept': 'application/json' }
    })

    if (response.ok) {
      form.reset() // clear all fields silently
    } else {
      alert('Oops! There was a problem submitting your form.')
    }
  })

  // Set the current year in the footer
  const yearElement = document.getElementById('year')
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear()
  }
})
