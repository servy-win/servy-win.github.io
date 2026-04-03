import { jest, describe, beforeEach, test, expect } from '@jest/globals'
import { initGA } from '../src/js/ga.js'

describe('Google Analytics Initialization (ga.js)', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    delete window.dataLayer
    delete window.gtag
    jest.clearAllMocks()
  })

  test('requires an ID to initialize', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
    initGA()
    expect(consoleSpy).toHaveBeenCalledWith('Google Analytics ID is required')
    consoleSpy.mockRestore()
  })

  test('injects script and initializes dataLayer upon interaction', () => {
    initGA('G-TEST1234')
    
    // Script shouldn't exist before interaction
    expect(document.querySelector('script')).toBeNull()

    // Trigger scroll event to simulate interaction
    window.dispatchEvent(new Event('scroll'))

    const script = document.querySelector('script')
    expect(script).not.toBeNull()
    expect(script.src).toContain('https://www.googletagmanager.com/gtag/js?id=G-TEST1234')
    
    // Simulate script load
    script.onload()
    expect(window.dataLayer).toBeDefined()
    expect(typeof window.gtag).toBe('function')
  })
})
