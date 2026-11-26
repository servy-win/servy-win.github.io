import { jest, describe, beforeEach, afterEach, test, expect } from '@jest/globals'

const i18n = await import('../src/js/i18n.js')

const SAMPLE_EN = {
  'home.title': 'Servy - Enterprise-Grade Windows Service Wrapper',
  'home.description': 'English description',
  'nav.home': 'Home',
  'home.features.shutdown.desc': 'Stops cleanly with <code>Ctrl+C</code> &amp; graceful shutdown.',
  'contact.form.namePlaceholder': 'Name',
  'nav.toggleDarkMode': 'Toggle dark mode',
  'nav.docsTitle': 'View Servy documentation',
}

const SAMPLE_ZH = {
  'home.title': 'Servy - 企业级 Windows 服务包装器',
  'home.description': '中文描述',
  'nav.home': '首页',
  'home.features.shutdown.desc': '通过 <code>Ctrl+C</code> 平滑停止进程。',
  'contact.form.namePlaceholder': '姓名',
  'nav.toggleDarkMode': '切换深色模式',
  'nav.docsTitle': '查看 Servy 文档',
}

let assignMock

const buildDOM = () => {
  document.head.innerHTML = `
    <title data-i18n="home.title">Servy - Enterprise-Grade Windows Service Wrapper</title>
    <meta name="description" data-i18n-content="home.description" content="English description">
    <meta property="og:locale" content="en_US">
    <link rel="canonical" href="https://servy-win.github.io/">
  `
  document.body.innerHTML = `
    <div class="lang-dropdown" id="lang-dropdown">
      <button id="lang-toggle" type="button" aria-expanded="false">
        <span id="lang-current">English</span>
      </button>
      <div class="lang-menu" id="lang-menu">
        <button type="button" data-lang="en" data-selected="true" aria-current="true">English</button>
        <button type="button" data-lang="zh" aria-current="false">简体中文</button>
      </div>
    </div>
    <a href="/" data-i18n="nav.home" data-i18n-title="nav.docsTitle" title="View Servy documentation">Home</a>
    <a href="#support" id="anchor-support">Support</a>
    <a href="#" id="anchor-empty">Top</a>
    <a href="#nonexistent" id="anchor-missing">Missing</a>
    <p id="html-target" data-i18n="home.features.shutdown.desc">Initial</p>
    <p id="missing-key" data-i18n="nonexistent.key">Fallback</p>
    <input id="input-target" data-i18n-placeholder="contact.form.namePlaceholder" placeholder="Name">
    <button id="aria-target" type="button" data-i18n-aria-label="nav.toggleDarkMode" aria-label="Toggle dark mode"></button>
    <section id="support"></section>
  `
}

const mockFetchSuccess = (map = { en: SAMPLE_EN, zh: SAMPLE_ZH }) => {
  globalThis.fetch = jest.fn(async (url) => {
    const lang = url.includes('zh.json') ? 'zh' : 'en'
    // eslint-disable-next-line security/detect-object-injection
    const payload = map[lang]
    if (!payload) {
      return { ok: false, status: 404 }
    }
    return {
      ok: true,
      status: 200,
      json: async () => payload,
    }
  })
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  assignMock = jest.spyOn(i18n.navigation, 'assign').mockImplementation(() => {})
  window.currentLang = 'en'
  delete window.translations
  window.history.replaceState({}, '', 'http://localhost/')
  buildDOM()
  mockFetchSuccess()
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('supportedLangs', () => {
  test('exposes English and Simplified Chinese', () => {
    expect(i18n.supportedLangs).toEqual(['en', 'zh'])
  })
})

describe('applyTranslations', () => {
  test('applies plain text, HTML, placeholders, aria-labels, titles, and meta content', () => {
    i18n.applyTranslations(SAMPLE_ZH)

    expect(document.querySelector('[data-i18n="nav.home"]').textContent).toBe('首页')
    expect(document.querySelector('[data-i18n="nav.home"]').getAttribute('title')).toBe('查看 Servy 文档')
    expect(document.getElementById('html-target').innerHTML).toBe('通过 <code>Ctrl+C</code> 平滑停止进程。')
    expect(document.getElementById('missing-key').textContent).toBe('Fallback')
    expect(document.getElementById('input-target').getAttribute('placeholder')).toBe('姓名')
    expect(document.getElementById('aria-target').getAttribute('aria-label')).toBe('切换深色模式')
    expect(document.querySelector('meta[name="description"]').getAttribute('content')).toBe('中文描述')
  })
})

describe('setLang', () => {
  test('fetches translations, updates DOM, SEO tags, URL, and dispatches langchange', async () => {
    const listener = jest.fn()
    window.addEventListener('langchange', listener)

    await i18n.setLang('zh', true)

    expect(globalThis.fetch).toHaveBeenCalledWith('/locales/zh.json')
    expect(document.documentElement.lang).toBe('zh')
    expect(window.currentLang).toBe('zh')
    expect(localStorage.getItem('lang')).toBe('zh')
    expect(document.title).toBe('Servy - 企业级 Windows 服务包装器')
    expect(document.querySelector('meta[name="description"]').getAttribute('content')).toBe('中文描述')
    expect(document.querySelector('meta[property="og:locale"]').getAttribute('content')).toBe('zh_CN')
    expect(document.querySelector('link[rel="canonical"]').getAttribute('href')).toBe('https://servy-win.github.io/?lang=zh')
    expect(window.location.search).toBe('?lang=zh')
    expect(document.getElementById('lang-current').textContent).toBe('中文')
    expect(document.querySelector('[data-lang="zh"]').getAttribute('data-selected')).toBe('true')
    expect(document.querySelector('[data-lang="en"]').getAttribute('aria-current')).toBe('false')
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0].detail.lang).toBe('zh')

    window.removeEventListener('langchange', listener)
  })

  test('removes ?lang query param and sets clean canonical when keepQueryParam is false', async () => {
    window.history.replaceState({}, '', 'http://localhost/downloads?lang=zh#top')

    await i18n.setLang('en', false)

    expect(window.location.search).toBe('')
    expect(window.location.hash).toBe('')
    expect(document.querySelector('meta[property="og:locale"]').getAttribute('content')).toBe('en_US')
    expect(document.querySelector('link[rel="canonical"]').getAttribute('href')).toBe('https://servy-win.github.io/downloads/')
  })

  test('falls back to English for unsupported language codes', async () => {
    await i18n.setLang('fr', true)

    expect(window.currentLang).toBe('en')
    expect(globalThis.fetch).toHaveBeenCalledWith('/locales/en.json')
  })

  test('uses valid sessionStorage cache without re-fetching and refreshes expired cache', async () => {
    await i18n.setLang('zh', true)
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)

    // Second call uses cache
    await i18n.setLang('zh', true)
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)

    // Expire cache entry
    const cached = JSON.parse(sessionStorage.getItem('i18n-cache'))
    cached.zh.timestamp = Date.now() - 20 * 60 * 1000
    sessionStorage.setItem('i18n-cache', JSON.stringify(cached))

    await i18n.setLang('zh', true)
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
  })

  test('handles title without data-i18n and handles storage/fetch errors gracefully', async () => {
    document.querySelector('title').removeAttribute('data-i18n')
    await i18n.setLang('zh', false)
    expect(document.title).toBe('Servy - 企业级 Windows 服务包装器')

    // Simulate storage errors
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Denied') })
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota') })
    await expect(i18n.setLang('en', false)).resolves.toBeUndefined()

    // Simulate HTTP 404 failure
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockFetchSuccess({ en: SAMPLE_EN })
    await i18n.setLang('zh', true)
    expect(errorSpy).toHaveBeenCalledWith('Failed to load zh translations:', expect.any(Error))
  })
})

describe('switchLang', () => {
  test('stores language, strips hash, and navigates via navigation.assign', () => {
    window.history.replaceState({}, '', 'http://localhost/downloads/#support')

    i18n.switchLang('zh')

    expect(localStorage.getItem('lang')).toBe('zh')
    expect(assignMock).toHaveBeenCalledTimes(1)
    expect(assignMock).toHaveBeenCalledWith('http://localhost/downloads/?lang=zh')
  })

  test('falls back to English for unsupported language codes', () => {
    i18n.switchLang('fr')

    expect(localStorage.getItem('lang')).toBe('en')
    expect(assignMock).toHaveBeenCalledWith('http://localhost/?lang=en')
  })
})

describe('initLanguageMenu', () => {
  test('returns early when required DOM elements are missing', () => {
    document.body.innerHTML = ''
    expect(() => i18n.initLanguageMenu()).not.toThrow()
  })

  test('toggles dropdown, reloads on language change, closes on outside click and Escape, and scrolls anchors', () => {
    i18n.initLanguageMenu()
    // Calling twice should be idempotent
    i18n.initLanguageMenu()

    const dropdown = document.getElementById('lang-dropdown')
    const toggle = document.getElementById('lang-toggle')
    const enBtn = document.querySelector('[data-lang="en"]')
    const zhBtn = document.querySelector('[data-lang="zh"]')

    toggle.click()
    expect(dropdown.classList.contains('open')).toBe(true)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')

    // Clicking outside closes menu
    document.body.click()
    expect(dropdown.classList.contains('open')).toBe(false)

    // Open again and press Escape
    toggle.click()
    const focusSpy = jest.spyOn(toggle, 'focus')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(dropdown.classList.contains('open')).toBe(true)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(dropdown.classList.contains('open')).toBe(false)
    expect(focusSpy).toHaveBeenCalled()

    // Selecting the already-active language closes menu without reloading
    toggle.click()
    enBtn.click()
    expect(dropdown.classList.contains('open')).toBe(false)
    expect(assignMock).not.toHaveBeenCalled()

    // Selecting a different language closes menu and triggers reload via switchLang
    toggle.click()
    zhBtn.click()
    expect(dropdown.classList.contains('open')).toBe(false)
    expect(localStorage.getItem('lang')).toBe('zh')
    expect(assignMock).toHaveBeenCalledWith('http://localhost/?lang=zh')

    // Anchor link smooth scroll preserves ?lang=zh
    window.history.replaceState({}, '', 'http://localhost/?lang=zh')
    const supportSection = document.getElementById('support')
    supportSection.scrollIntoView = jest.fn()
    document.getElementById('anchor-support').click()
    expect(supportSection.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' })
    expect(window.location.search).toBe('?lang=zh')
    expect(window.location.hash).toBe('#support')

    // Empty and nonexistent anchors are no-ops
    document.getElementById('anchor-empty').click()
    document.getElementById('anchor-missing').click()
  })
})

describe('loadInitialLanguage & window events', () => {
  test('loads from ?lang query parameter first, then localStorage, then defaults to en', async () => {
    window.history.replaceState({}, '', 'http://localhost/?lang=zh')
    await i18n.loadInitialLanguage()
    expect(window.currentLang).toBe('zh')
    expect(document.documentElement.hasAttribute('data-loading')).toBe(false)

    // Clear query param; load from localStorage
    window.history.replaceState({}, '', 'http://localhost/')
    localStorage.setItem('lang', 'zh')
    await i18n.loadInitialLanguage()
    expect(window.currentLang).toBe('zh')
    expect(window.location.search).toBe('')

    // Clear both; default to en
    localStorage.clear()
    await i18n.loadInitialLanguage()
    expect(window.currentLang).toBe('en')
  })

test('handles popstate event and preserves sessionStorage cache on beforeunload', async () => {
    window.history.replaceState({}, '', 'http://localhost/?lang=zh')
    window.dispatchEvent(new PopStateEvent('popstate'))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(window.currentLang).toBe('zh')

    sessionStorage.setItem('i18n-cache', '{}')
    window.dispatchEvent(new Event('beforeunload'))
    expect(sessionStorage.getItem('i18n-cache')).toBe('{}')
  })
})
