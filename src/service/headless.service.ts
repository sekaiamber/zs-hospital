import puppeteer, { Browser, Page } from 'puppeteer'

export interface HeadlessBrowserOptions {
  /**
   * Timeout for waiting page load (milliseconds)
   */
  timeout?: number
  /**
   * Whether to show browser interface (for debugging)
   */
  headless?: boolean
  /**
   * Browser window size
   */
  viewport?: {
    width: number
    height: number
  }
  /**
   * User agent string
   */
  userAgent?: string
  /**
   * Wait until network is idle (milliseconds)
   */
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2'
  /**
   * CSS selector to wait for specific element
   */
  waitForSelector?: string
  /**
   * Wait for specific time in milliseconds
   */
  waitForTime?: number
  /**
   * Chrome executable path (use system Chrome)
   */
  executablePath?: string
  /**
   * Whether to use system Chrome
   */
  useSystemChrome?: boolean
}

export class HeadlessBrowserService {
  private browser: Browser | null = null

  /**
   * Launch browser instance
   */
  async launchBrowser(options: HeadlessBrowserOptions = {}): Promise<Browser> {
    // Check if browser exists and is still connected
    if (this.browser) {
      try {
        // Test if browser is still connected
        await this.browser.version()
        return this.browser
      } catch (error) {
        // Browser is disconnected, clear it and create new one
        console.log('Browser disconnected, creating new instance')
        this.browser = null
      }
    }

    const {
      headless = true,
      viewport = { width: 1920, height: 1080 },
      userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      executablePath,
      useSystemChrome = false,
    } = options

    // Get system Chrome path
    let chromePath = executablePath
    if (useSystemChrome && !executablePath) {
      chromePath = await this.findSystemChrome()
    }

    const launchOptions: any = {
      headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
      defaultViewport: viewport,
    }

    // If Chrome path is specified, use system Chrome
    if (chromePath) {
      launchOptions.executablePath = chromePath
      console.log(`Using system Chrome: ${chromePath}`)
    }

    this.browser = await puppeteer.launch(launchOptions)

    return this.browser
  }

  /**
   * Find system Chrome path
   */
  private async findSystemChrome(): Promise<string | undefined> {
    const { exec } = require('child_process')
    const { promisify } = require('util')
    const execAsync = promisify(exec)

    try {
      // Find Chrome on macOS
      const { stdout } = await execAsync('which google-chrome')
      if (stdout.trim()) {
        return stdout.trim()
      }
    } catch (error) {
      // Try other possible Chrome paths
      const possiblePaths = [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
      ]

      for (const path of possiblePaths) {
        try {
          const { execSync } = require('child_process')
          execSync(`test -f "${path}"`, { stdio: 'ignore' })
          return path
        } catch (error) {
          // Continue to next path
        }
      }
    }

    console.warn('System Chrome not found, will use Puppeteer built-in Chrome')
    return undefined
  }

  /**
   * Close browser instance
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      console.log('Browser instance closed')
    }
  }

  /**
   * Force clear cached browser instance
   * Call when not using for long time or memory is low
   */
  async clearBrowserCache(): Promise<void> {
    await this.closeBrowser()
    console.log('Browser cache cleared')
  }

  /**
   * Scrape page HTML
   * @param url Target URL
   * @param options Configuration options
   * @returns Page HTML content
   */
  async scrapePage(url: string, options: HeadlessBrowserOptions = {}): Promise<string> {
    const {
      timeout = 30000,
      waitUntil = 'networkidle2',
      waitForSelector,
      waitForTime,
      userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    } = options

    // Use cached browser instance
    const browser = await this.launchBrowser(options)
    const page = await browser.newPage()

    try {
      // Set user agent
      await page.setUserAgent(userAgent)

      // Set timeout
      page.setDefaultTimeout(timeout)

      // Set viewport size
      if (options.viewport) {
        await page.setViewport(options.viewport)
      }

      // Navigate to target URL
      console.log(`Accessing: ${url}`)
      await page.goto(url, {
        waitUntil,
        timeout,
      })

      // Wait for specific element to appear (if specified)
      if (waitForSelector) {
        console.log(`Waiting for element: ${waitForSelector}`)
        await page.waitForSelector(waitForSelector, { timeout })
      }

      // Wait for specific time (if specified)
      if (waitForTime) {
        console.log(`Waiting ${waitForTime}ms`)
        await new Promise((resolve) => setTimeout(resolve, waitForTime))
      }

      // Wait for page to fully load (including React and other frameworks)
      // await this.waitForPageLoad(page)

      // Get page HTML
      const html = await page.content()
      console.log(`Page scraping completed, HTML length: ${html.length} characters`)

      return html
    } finally {
      await page.close()
      // Don't close browser, keep cache
    }
  }

  /**
   * Wait for page to fully load
   * @param page Puppeteer page object
   */
  private async waitForPageLoad(page: Page): Promise<void> {
    // Wait for network to be idle
    await page.waitForFunction(
      () => {
        return new Promise((resolve) => {
          let idleCount = 0
          const checkIdle = () => {
            if (performance.now() - lastActivity > 1000) {
              idleCount++
              if (idleCount >= 3) {
                resolve(true)
                return
              }
            } else {
              idleCount = 0
            }
            setTimeout(checkIdle, 500)
          }

          let lastActivity = performance.now()
          const observer = new PerformanceObserver((list) => {
            lastActivity = performance.now()
          })
          // Fix: Only use valid entryTypes for PerformanceObserver
          observer.observe({ entryTypes: ['resource'] })

          checkIdle()
        })
      },
      { timeout: 10000 },
    )

    // Wait for React and other frameworks to render
    // await page.waitForFunction(
    //   () => {
    //     // Check if React is mounted
    //     const reactRoot = document.querySelector('[data-reactroot]') || document.querySelector('#root') || document.querySelector('#app')

    //     // Check if there are pending AJAX requests
    //     const pendingRequests = performance
    //       .getEntriesByType('resource')
    //       .filter((entry: any) => entry.initiatorType === 'xmlhttprequest').length

    //     return !!reactRoot && pendingRequests === 0
    //   },
    //   { timeout: 10000 },
    // )
  }

  /**
   * Batch scrape multiple pages in parallel, result order matches input URLs
   * @param urls URL array
   * @param options Configuration options
   * @returns Array of page HTML content
   */
  async scrapePages(urls: string[], options: HeadlessBrowserOptions = {}): Promise<string[]> {
    // Launch a browser instance for batch processing
    const browser = await this.launchBrowser(options)

    try {
      // Process all pages in parallel, ensure result order matches input
      const promises = urls.map(async (url) => {
        try {
          const page = await browser.newPage()
          try {
            const {
              timeout = 30000,
              waitUntil = 'networkidle2',
              waitForSelector,
              waitForTime,
              userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            } = options

            await page.setUserAgent(userAgent)
            page.setDefaultTimeout(timeout)
            if (options.viewport) {
              await page.setViewport(options.viewport)
            }
            console.log(`Accessing: ${url}`)
            await page.goto(url, { waitUntil, timeout })
            if (waitForSelector) {
              console.log(`Waiting for element: ${waitForSelector}`)
              await page.waitForSelector(waitForSelector, { timeout })
            }
            if (waitForTime) {
              console.log(`Waiting ${waitForTime}ms`)
              await new Promise((resolve) => setTimeout(resolve, waitForTime))
            }
            const html = await page.content()
            console.log(`Page scraping completed: ${url}, HTML length: ${html.length} characters`)
            return html
          } finally {
            await page.close()
          }
        } catch (error) {
          console.error(`Failed to scrape page: ${url}`, error)
          return '' // Return empty string on failure
        }
      })
      // Ensure result order matches input URLs
      return await Promise.all(promises)
    } finally {
      // Don't close browser, keep it cached for reuse
      // await browser.close()
    }
  }

  /**
   * Take page screenshot
   * @param url Target URL
   * @param options Configuration options
   * @returns Screenshot Buffer
   */
  async takeScreenshot(url: string, options: HeadlessBrowserOptions = {}): Promise<Buffer> {
    const browser = await this.launchBrowser(options)
    const page = await browser.newPage()

    try {
      await page.goto(url, { waitUntil: 'networkidle2' })
      await this.waitForPageLoad(page)

      const screenshot = await page.screenshot({
        fullPage: true,
        type: 'png',
      })

      return screenshot as Buffer
    } finally {
      await page.close()
    }
  }
}

// Export singleton instance
export const headlessBrowserService = new HeadlessBrowserService()
