import './style.css'

window.addEventListener('DOMContentLoaded', () => {
  // Set the current year in the footer
  const yearElement = document.getElementById('year')
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear()
  }
})
