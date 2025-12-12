import puppeteer, { Browser } from "puppeteer";
import { parseString } from "xml2js";

// ============================================
// TYPES
// ============================================

export interface SitemapEntry {
  url: string;
  date?: Date;
}

export interface ScrapedPage {
  url: string;
  title: string;
  content: string;
  description?: string;
  images?: string[];
  ogImage?: string;
}

export interface ScrapeResult {
  url: string;
  success: boolean;
  data?: ScrapedPage;
  error?: {
    message: string;
    type: string;
    attempt: number;
  };
}

// ============================================
// SITEMAP DISCOVERY
// ============================================

/**
 * Find sitemap URL for a website
 * Checks standard paths and falls back to robots.txt
 */
export async function findSitemapUrl(baseUrl: string): Promise<string | null> {
  const possiblePaths = [
    "/sitemap.xml",
    "/sitemap_index.xml",
    "/sitemap1.xml",
    "/post-sitemap.xml",
    "/page-sitemap.xml",
  ];

  // Try standard paths
  for (const path of possiblePaths) {
    try {
      const sitemapUrl = new URL(path, baseUrl).href;
      const response = await fetch(sitemapUrl, { method: "HEAD" });
      if (response.ok) {
        return sitemapUrl;
      }
    } catch {
      // Continue to next path
    }
  }

  // Fallback: robots.txt
  try {
    const robotsUrl = new URL("/robots.txt", baseUrl).href;
    const response = await fetch(robotsUrl);
    if (response.ok) {
      const text = await response.text();
      const sitemapMatch = text.match(/Sitemap:\s*(.+)/i);
      if (sitemapMatch) {
        return sitemapMatch[1].trim();
      }
    }
  } catch {
    // No sitemap found
  }

  return null;
}

// ============================================
// SITEMAP PARSING
// ============================================

/**
 * Parse a sitemap XML and extract URLs with dates
 */
export async function parseSitemapWithDates(
  sitemapUrl: string
): Promise<SitemapEntry[]> {
  const response = await fetch(sitemapUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; SitemapBot/1.0)",
      Accept: "application/xml, text/xml, */*",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const xml = await response.text();

  return new Promise((resolve, reject) => {
    parseString(xml, (err, result) => {
      if (err) {
        reject(err);
        return;
      }

      const urlsWithDates: SitemapEntry[] = [];

      // Sitemap Index (child sitemaps)
      if (result.sitemapindex) {
        const sitemaps = result.sitemapindex.sitemap || [];
        for (const sitemap of sitemaps) {
          if (sitemap.loc?.[0]) {
            urlsWithDates.push({ url: sitemap.loc[0] });
          }
        }
      }

      // URL Set (page URLs)
      if (result.urlset) {
        const urlElements = result.urlset.url || [];
        for (const urlElement of urlElements) {
          if (urlElement.loc?.[0]) {
            const url = urlElement.loc[0];
            let date: Date | undefined;

            // Extract date (lastmod or pubDate)
            if (urlElement.lastmod?.[0]) {
              date = new Date(urlElement.lastmod[0]);
            } else if (urlElement.pubDate?.[0]) {
              date = new Date(urlElement.pubDate[0]);
            }

            urlsWithDates.push({ url, date });
          }
        }
      }

      resolve(urlsWithDates);
    });
  });
}

/**
 * Check if URL looks like a sitemap
 */
function isSitemapUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.includes("sitemap");
  } catch {
    return false;
  }
}

/**
 * Recursively parse sitemap and child sitemaps
 */
export async function parseSitemapRecursive(
  sitemapUrl: string,
  maxDepth = 3
): Promise<SitemapEntry[]> {
  const urlsWithDates = await parseSitemapWithDates(sitemapUrl);

  if (urlsWithDates.length === 0) return [];

  // Check if first URL is a child sitemap
  const firstUrl = urlsWithDates[0].url;
  const looksLikeSitemap = isSitemapUrl(firstUrl);

  if (!looksLikeSitemap || maxDepth <= 0) {
    // Content URLs found
    return urlsWithDates;
  }

  // Recursively parse child sitemaps
  const allUrls: SitemapEntry[] = [];
  for (const child of urlsWithDates) {
    try {
      const childUrls = await parseSitemapRecursive(child.url, maxDepth - 1);
      allUrls.push(...childUrls);
    } catch (error) {
      console.error(`Error parsing child sitemap ${child.url}:`, error);
    }
  }

  return allUrls;
}

// ============================================
// PUPPETEER BROWSER
// ============================================

/**
 * Launch Puppeteer browser with optimized settings
 */
export async function launchBrowser(): Promise<Browser> {
  return await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
      "--dns-prefetch-disable",
      "--disable-features=NetworkService",
      "--disable-background-networking",
    ],
  });
}

// ============================================
// PAGE SCRAPING
// ============================================

/**
 * Scrape a single page
 */
export async function scrapePage(
  url: string,
  browser: Browser
): Promise<ScrapedPage | null> {
  let page = null;

  try {
    page = await browser.newPage();

    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    );

    // Navigation with fallback strategy
    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      // Wait for network idle (optional, max 10s)
      try {
        await page.waitForNetworkIdle({ timeout: 10000 });
      } catch {
        // Continue even if network is still active
      }
    } catch {
      // Fallback: 'load' instead of 'domcontentloaded'
      await page.goto(url, {
        waitUntil: "load",
        timeout: 60000,
      });
    }

    // Short wait for dynamic content
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Extract content in browser context
    const data = await page.evaluate(() => {
      // Remove unwanted elements
      const unwantedSelectors = [
        "script",
        "style",
        "noscript",
        "iframe",
        "nav",
        "header",
        "footer",
        ".navigation",
        ".sidebar",
        ".cookie-banner",
        ".advertisement",
        '[role="navigation"]',
      ];

      unwantedSelectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => el.remove());
      });

      // Title
      const title = document.title || "";

      // Meta Description
      const metaDesc = document.querySelector('meta[name="description"]');
      const description = metaDesc?.getAttribute("content") || "";

      // OG-Image
      const ogImageMeta = document.querySelector('meta[property="og:image"]')
        || document.querySelector('meta[name="og:image"]');
      const ogImageRaw = ogImageMeta?.getAttribute("content") || "";

      // Find main content
      const mainSelectors = [
        "main",
        "article",
        '[role="main"]',
        ".main-content",
        ".content",
        "#content",
      ];

      let contentElement: Element | null = null;
      for (const selector of mainSelectors) {
        contentElement = document.querySelector(selector);
        if (contentElement) break;
      }

      // Fallback: body
      if (!contentElement) {
        contentElement = document.body;
      }

      // Extract text and clean up
      const content = (contentElement as HTMLElement)?.innerText || "";

      // Extract images (min. 200x200px)
      const images: string[] = [];
      if (contentElement) {
        contentElement.querySelectorAll("img").forEach((img) => {
          const src = img.src || img.getAttribute("data-src");
          if (src && !src.startsWith("data:")) {
            const width = img.naturalWidth || img.width || 0;
            const height = img.naturalHeight || img.height || 0;
            if (
              (width === 0 && height === 0) ||
              (width >= 200 && height >= 200)
            ) {
              try {
                const absoluteUrl = new URL(src, window.location.href).href;
                if (!images.includes(absoluteUrl)) {
                  images.push(absoluteUrl);
                }
              } catch {
                // Invalid URL
              }
            }
          }
        });
      }

      // Convert OG-Image to absolute URL
      let ogImage: string | undefined;
      if (ogImageRaw) {
        try {
          ogImage = new URL(ogImageRaw, window.location.href).href;
        } catch {
          ogImage = undefined;
        }
      }

      return {
        title,
        description,
        content: content
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .join("\n"),
        images: images.slice(0, 10),
        ogImage,
      };
    });

    await page.close();

    return {
      url,
      title: data.title,
      content: data.content,
      description: data.description,
      images: data.images,
      ogImage: data.ogImage,
    };
  } catch (error) {
    if (page) await page.close().catch(() => {});
    return null;
  }
}

// ============================================
// BATCH PROCESSING WITH RETRY
// ============================================

/**
 * Scrape page with retry logic
 */
export async function scrapePageWithRetry(
  url: string,
  browser: Browser,
  maxRetries = 3
): Promise<ScrapeResult> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await scrapePage(url, browser);

      if (result !== null) {
        return { url, success: true, data: result };
      }

      if (attempt < maxRetries) {
        // Exponential backoff
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    } catch (error: unknown) {
      if (attempt === maxRetries) {
        const err = error as Error;
        return {
          url,
          success: false,
          error: {
            message: err.message || "Unknown error",
            type: err.name || "Error",
            attempt: maxRetries,
          },
        };
      }
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }

  return {
    url,
    success: false,
    error: {
      message: "Max retries exceeded",
      type: "RetryError",
      attempt: maxRetries,
    },
  };
}

/**
 * Scrape multiple pages with batch processing
 */
export async function scrapeMultiplePagesWithRetry(
  urls: string[],
  maxConcurrent = 3,
  delayMs = 1000,
  maxRetries = 3,
  onProgress?: (current: number, total: number, result: ScrapeResult) => void
): Promise<ScrapeResult[]> {
  let browser = await launchBrowser();
  const results: ScrapeResult[] = [];
  const batchesBeforeRestart = 50;

  try {
    for (let i = 0; i < urls.length; i += maxConcurrent) {
      const batch = urls.slice(i, i + maxConcurrent);
      const batchIndex = Math.floor(i / maxConcurrent);

      // Restart browser for memory management
      if (batchIndex > 0 && batchIndex % batchesBeforeRestart === 0) {
        await browser.close();
        browser = await launchBrowser();
      }

      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map((url) => scrapePageWithRetry(url, browser, maxRetries))
      );

      results.push(...batchResults);

      // Progress callback
      if (onProgress) {
        batchResults.forEach((result, idx) => {
          onProgress(i + idx + 1, urls.length, result);
        });
      }

      // Pause between batches
      if (i + maxConcurrent < urls.length) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  } finally {
    await browser.close();
  }

  return results;
}

/**
 * Convert scraped content to a text document for RAG
 */
export function formatScrapedPageAsDocument(page: ScrapedPage): string {
  let document = "";

  if (page.title) {
    document += `# ${page.title}\n\n`;
  }

  if (page.description) {
    document += `> ${page.description}\n\n`;
  }

  document += `URL: ${page.url}\n\n`;
  document += "---\n\n";
  document += page.content;

  return document;
}
