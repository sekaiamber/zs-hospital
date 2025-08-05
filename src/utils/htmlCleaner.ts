/**
 * Clean up HTML by removing unwanted tags
 * @param html Raw HTML content
 * @returns Cleaned HTML content
 */
export function cleanupHTML(html: string): string {
  if (!html || typeof html !== 'string') {
    return html
  }

  let cleanedHTML = html

  // Remove script tags and their content
  cleanedHTML = cleanedHTML.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')

  // Remove style tags and their content
  cleanedHTML = cleanedHTML.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')

  // Remove link tags
  cleanedHTML = cleanedHTML.replace(/<link[^>]*>/gi, '')

  // Remove iframe tags and their content
  cleanedHTML = cleanedHTML.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')

  // Remove style attributes from all DOM elements
  cleanedHTML = cleanedHTML.replace(/\s+style\s*=\s*["'][^"']*["']/gi, '')

  // Remove empty lines and excessive whitespace
  cleanedHTML = cleanedHTML
    .replace(/\n\s*\n/g, '\n') // Remove empty lines
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim()

  return cleanedHTML
}

/**
 * Clean up HTML with additional options
 * @param html Raw HTML content
 * @param options Cleaning options
 * @returns Cleaned HTML content
 */
export function cleanupHTMLAdvanced(
  html: string,
  options: {
    removeScripts?: boolean
    removeStyles?: boolean
    removeLinks?: boolean
    removeIframes?: boolean
    removeComments?: boolean
    removeEmptyLines?: boolean
    removeExcessiveWhitespace?: boolean
    removeStyleAttributes?: boolean
  } = {},
): string {
  if (!html || typeof html !== 'string') {
    return html
  }

  const {
    removeScripts = true,
    removeStyles = true,
    removeLinks = true,
    removeIframes = true,
    removeComments = true,
    removeEmptyLines = true,
    removeExcessiveWhitespace = true,
    removeStyleAttributes = true,
  } = options

  let cleanedHTML = html

  // Remove script tags and their content
  if (removeScripts) {
    cleanedHTML = cleanedHTML.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  }

  // Remove style tags and their content
  if (removeStyles) {
    cleanedHTML = cleanedHTML.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  }

  // Remove link tags
  if (removeLinks) {
    cleanedHTML = cleanedHTML.replace(/<link[^>]*>/gi, '')
  }

  // Remove iframe tags and their content
  if (removeIframes) {
    cleanedHTML = cleanedHTML.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
  }

  // Remove style attributes from all DOM elements
  if (removeStyleAttributes) {
    cleanedHTML = cleanedHTML.replace(/\s+style\s*=\s*["'][^"']*["']/gi, '')
  }

  // Remove HTML comments
  if (removeComments) {
    cleanedHTML = cleanedHTML.replace(/<!--[\s\S]*?-->/g, '')
  }

  // Remove empty lines and excessive whitespace
  if (removeEmptyLines) {
    cleanedHTML = cleanedHTML.replace(/\n\s*\n/g, '\n')
  }

  if (removeExcessiveWhitespace) {
    cleanedHTML = cleanedHTML.replace(/\s+/g, ' ').trim()
  }

  return cleanedHTML
}

/**
 * Extract text content from HTML (removes all HTML tags)
 * @param html HTML content
 * @returns Plain text content
 */
export function extractTextFromHTML(html: string): string {
  if (!html || typeof html !== 'string') {
    return html
  }

  // First clean the HTML
  const cleanedHTML = cleanupHTML(html)

  // Remove all HTML tags
  const textContent = cleanedHTML.replace(/<[^>]*>/g, '')

  // Decode HTML entities
  const decodedText = textContent
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')

  // Clean up whitespace
  return decodedText.replace(/\s+/g, ' ').trim()
}

/**
 * Get a summary of HTML content (first N characters)
 * @param html HTML content
 * @param maxLength Maximum length of summary
 * @returns Text summary
 */
export function getHTMLSummary(html: string, maxLength: number = 200): string {
  const textContent = extractTextFromHTML(html)

  if (textContent.length <= maxLength) {
    return textContent
  }

  return textContent.substring(0, maxLength) + '...'
}
