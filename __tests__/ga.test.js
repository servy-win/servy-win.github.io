import { jest, describe, beforeEach, afterEach, test, expect } from '@jest/globals'
import { initGA } from '../src/js/ga.js'

describe('Google Analytics Initialization (ga.js)', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    delete window.dataLayer
    delete window.gtag
    jest.clearAllMocks()
  })

  afterEach(() => {
    // Flush any unconsumed interaction listeners attached to global window
    window.dispatchEvent(new Event('mousemove'))
    document.head.innerHTML = ''
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

    // Trigger mousemove event to simulate interaction
    window.dispatchEvent(new Event('mousemove'))

    const script = document.querySelector('script')
    expect(script).not.toBeNull()
    expect(script.src).toContain('https://www.googletagmanager.com/gtag/js?id=G-TEST1234')

    // Simulate script load
    script.onload()
    expect(window.dataLayer).toBeDefined()
    expect(typeof window.gtag).toBe('function')
  })

  test('is idempotent and injects script only once across repeated events', () => {
    initGA('G-TEST1234')

    window.dispatchEvent(new Event('mousemove'))
    window.dispatchEvent(new Event('touchstart'))

    const scripts = document.querySelectorAll('script')
    expect(scripts.length).toBe(1)
  })

  test.each(['mousemove', 'touchstart'])(
    'triggers script injection on %s event',
    (eventType) => {
      initGA('G-TEST1234')

      expect(document.querySelector('script')).toBeNull()

      window.dispatchEvent(new Event(eventType))

      const script = document.querySelector('script')
      expect(script).not.toBeNull()
      expect(script.src).toContain('https://www.googletagmanager.com/gtag/js?id=G-TEST1234')
    }
  )

  test.each(['scroll', 'keydown'])(
    'does not trigger script injection on %s event',
    (eventType) => {
      initGA('G-TEST1234')

      window.dispatchEvent(new Event(eventType))

      expect(document.querySelector('script')).toBeNull()
    }
  )

  test('configures multiple IDs correctly on script load', () => {
    initGA('G-1', 'AW-2')

    window.dispatchEvent(new Event('mousemove'))

    const script = document.querySelector('script')
    expect(script).not.toBeNull()
    expect(script.src).toContain('https://www.googletagmanager.com/gtag/js?id=G-1')

    // Simulate script load
    script.onload()

    expect(window.dataLayer).toBeDefined()
    expect(typeof window.gtag).toBe('function')

    // Filter dataLayer entries for 'config' actions
    const configCalls = Array.from(window.dataLayer)
      .map(args => Array.from(args))
      .filter(args => args[0] === 'config')

    expect(configCalls).toEqual([
      ['config', 'G-1'],
      ['config', 'AW-2']
    ])
  })
})
