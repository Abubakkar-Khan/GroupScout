import { chromium, BrowserContext, Page } from "playwright";
import fs from "fs";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const USER_DATA_DIR = path.join(process.cwd(), "chrome-data");

export interface FacebookPost {
  postId: string;
  url: string;
  author: string;
  content: string;
  timestamp: string;
  groupId: string;
}

// ─── Human-like helpers ───────────────────────────────────────────────

/** Random integer between min and max (inclusive) */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Sleep for a randomised duration to mimic human pace */
function humanDelay(minMs: number = 800, maxMs: number = 2500): Promise<void> {
  return new Promise((r) => setTimeout(r, randInt(minMs, maxMs)));
}

/** Smooth, human-like scroll: small increments with random pauses */
async function humanScroll(page: Page, totalPixels: number = 2000) {
  let scrolled = 0;
  while (scrolled < totalPixels) {
    // Humans scroll in bursts of 200–600px
    const chunk = randInt(200, 600);
    await page.evaluate((px) => window.scrollBy({ top: px, behavior: "smooth" }), chunk);
    scrolled += chunk;
    // Short pause between scroll bursts (like reading while scrolling)
    await humanDelay(600, 1800);
  }
}

/** Move the mouse to a random spot on the page (mimics idle cursor movement) */
async function randomMouseMove(page: Page) {
  const x = randInt(100, 900);
  const y = randInt(150, 550);
  await page.mouse.move(x, y, { steps: randInt(5, 15) });
}

// ─── Main Automator ───────────────────────────────────────────────────

export class FacebookAutomator {
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  async init() {
    // If already initialised, reuse the existing context
    if (this.context && this.page) {
      console.log("[FacebookAutomator] Reusing existing browser session.");
      return;
    }

    if (!fs.existsSync(CHROME_PATH)) {
      throw new Error(`Chrome not found at ${CHROME_PATH}. Please ensure Google Chrome is installed.`);
    }

    console.log("[FacebookAutomator] Launching Chrome...");
    this.context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      executablePath: CHROME_PATH,
      headless: process.env.HEADLESS === "true",
      // Realistic viewport that matches a common laptop resolution
      viewport: { width: 1366, height: 768 },
      // Realistic locale & timezone so Facebook serves local content
      locale: "en-US",
      timezoneId: "Asia/Karachi",
      args: [
        "--disable-notifications",
        "--disable-infobars",
        "--disable-blink-features=AutomationControlled", // hide webdriver flag
      ],
    });

    this.page = this.context.pages()[0] || await this.context.newPage();

    // Remove the tell-tale navigator.webdriver flag
    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });

    console.log("[FacebookAutomator] Chrome launched successfully.");
  }

  async checkLogin(): Promise<boolean> {
    if (!this.page) throw new Error("Not initialized");

    console.log("[FacebookAutomator] Navigating to Facebook...");
    try {
      await this.page.goto("https://www.facebook.com/", {
        waitUntil: "domcontentloaded",
        timeout: 20000,
      });
      // Give the SPA time to hydrate
      await humanDelay(3000, 5000);
    } catch {
      console.log("[FacebookAutomator] Slow network – proceeding anyway.");
    }

    const currentUrl = this.page.url();
    const isLoginPage = await this.page.evaluate(() => {
      return (
        document.querySelector('input[name="email"]') !== null ||
        document.location.pathname.includes("/login")
      );
    });

    if (isLoginPage) {
      console.log("[FacebookAutomator] ❌ Not logged in. Please log in manually in the Chrome window.");
      console.log("[FacebookAutomator] ⏳ Waiting up to 120 seconds for you to log in...");

      // Wait for navigation away from login page (user logs in manually)
      try {
        await this.page.waitForURL((url) => !url.toString().includes("/login"), {
          timeout: 120000,
        });
        await humanDelay(3000, 5000);
        console.log("[FacebookAutomator] ✅ Login detected! Continuing...");
        return true;
      } catch {
        console.log("[FacebookAutomator] ❌ Login timeout. Please try again.");
        return false;
      }
    }

    console.log("[FacebookAutomator] ✅ Already logged in. Current URL:", currentUrl);
    return true;
  }

  async scanGroup(groupId: string, maxPosts: number = 15): Promise<FacebookPost[]> {
    if (!this.page) throw new Error("Not initialized");

    const groupUrl = `https://www.facebook.com/groups/${groupId}?sorting_setting=CHRONOLOGICAL`;
    console.log(`[FacebookAutomator] Navigating to group: ${groupId}`);

    try {
      // Navigate like a human would – click a link, wait for it to load
      await this.page.goto(groupUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

      // Human pause: "looking at the page loading"
      await humanDelay(2000, 4000);

      // Move mouse as if orienting on the page
      await randomMouseMove(this.page);

      // Wait for at least one post to appear
      const feedLoaded = await this.page
        .waitForSelector('div[role="feed"], div[role="article"]', { timeout: 15000 })
        .catch(() => null);

      if (!feedLoaded) {
        console.log(`[FacebookAutomator] No feed found for group ${groupId}. Might be private or empty.`);
        return [];
      }

      // Scroll like a human browsing through the feed
      // Do 3–5 scroll sessions with pauses in between
      const scrollSessions = randInt(3, 5);
      for (let i = 0; i < scrollSessions; i++) {
        await humanScroll(this.page, randInt(1200, 2500));
        // Pause like reading content
        await humanDelay(1500, 3500);
        // Occasional mouse movement
        if (Math.random() > 0.5) {
          await randomMouseMove(this.page);
        }
      }

      // Small pause before extraction
      await humanDelay(1000, 2000);

      // ─── Extract posts from the DOM ─────────────────────────────
      const posts = await this.page.evaluate(({ groupId }: { groupId: string }) => {
        const articles = Array.from(document.querySelectorAll('div[role="article"]'));
        const results: any[] = [];
        const seenContent = new Set<string>();

        for (const el of articles) {
          try {
            // ── Content extraction ──
            let content = "";

            // Strategy 1: Facebook's ad preview message container
            const adPreview = el.querySelector('[data-ad-preview="message"]');
            if (adPreview) {
              content = (adPreview as HTMLElement).innerText.trim();
            }

            // Strategy 2: All dir="auto" divs (Facebook wraps text in these)
            if (!content || content.length < 10) {
              const autoDivs = Array.from(el.querySelectorAll('div[dir="auto"]'));
              const parts: string[] = [];
              for (const div of autoDivs) {
                const text = (div as HTMLElement).innerText.trim();
                // Skip very short strings (likely UI labels like "Like", "Comment")
                if (text.length > 3 && !parts.includes(text)) {
                  parts.push(text);
                }
              }
              content = parts.join(" ").trim();
            }

            // Strategy 3: Fallback to entire article text minus known UI noise
            if (!content || content.length < 10) {
              const fullText = (el as HTMLElement).innerText || "";
              // Take only first 500 chars to avoid grabbing comments
              content = fullText.substring(0, 500).trim();
            }

            // Skip posts with no real content
            if (!content || content.length < 10) continue;

            // Deduplicate by content fingerprint
            const fingerprint = content.substring(0, 80).toLowerCase();
            if (seenContent.has(fingerprint)) continue;
            seenContent.add(fingerprint);

            // ── URL & Timestamp extraction ──
            let url = "";
            let timestamp = new Date().toISOString();
            const allLinks = Array.from(el.querySelectorAll("a[href]"));

            // Look for permalink-style links
            const postLink = allLinks.find((a) => {
              const href = a.getAttribute("href") || "";
              return (
                (href.includes("/groups/") &&
                  (href.includes("/posts/") || href.includes("/permalink/"))) ||
                href.includes("/story.php")
              );
            });

            if (postLink) {
              const rawHref = postLink.getAttribute("href") || "";
              url = rawHref.startsWith("http") ? rawHref.split("?")[0] : `https://www.facebook.com${rawHref.split("?")[0]}`;
            }

            // ── Post ID extraction ──
            let postId = "";
            const idMatch = url.match(/\/(?:posts|permalink)\/(\d+)/);
            const storyMatch = url.match(/story_fbid=(\d+)/);
            if (idMatch) {
              postId = idMatch[1];
            } else if (storyMatch) {
              postId = storyMatch[1];
            } else {
              // Generate a deterministic hash from content
              let hash = 0;
              for (let i = 0; i < content.length; i++) {
                const char = content.charCodeAt(i);
                hash = ((hash << 5) - hash + char) | 0;
              }
              postId = `hash_${Math.abs(hash)}`;
            }

            // ── Author extraction ──
            let author = "Unknown";

            // Strategy 1: The first <strong> or heading inside the article (usually author name)
            const strongEl = el.querySelector("h2 strong, h3 strong, h4 strong, strong a");
            if (strongEl) {
              const name = (strongEl as HTMLElement).innerText.trim();
              if (name.length > 1 && name.length < 60) author = name;
            }

            // Strategy 2: First link that points to a user profile
            if (author === "Unknown") {
              const profileLink = allLinks.find((a) => {
                const href = a.getAttribute("href") || "";
                const text = (a as HTMLElement).innerText.trim();
                return (
                  text.length > 1 &&
                  text.length < 50 &&
                  !href.includes("/groups/") &&
                  !href.includes("/photo") &&
                  !href.includes("/video") &&
                  !href.includes("#") &&
                  (href.includes("facebook.com/") || href.startsWith("/"))
                );
              });
              if (profileLink) {
                author = (profileLink as HTMLElement).innerText.trim();
              }
            }

            results.push({
              postId,
              url: url || `https://www.facebook.com/groups/${groupId}`,
              author,
              content: content.substring(0, 2000), // Cap content length
              timestamp,
              groupId,
            });
          } catch {
            // Silently skip malformed articles
          }
        }

        return results;
      }, { groupId });

      console.log(`[FacebookAutomator] Extracted ${posts.length} posts from group ${groupId}`);
      return posts.slice(0, maxPosts);
    } catch (error) {
      console.error(`[FacebookAutomator] Error scanning group ${groupId}:`, error);
      return [];
    }
  }

  async close() {
    if (this.context) {
      console.log("[FacebookAutomator] Closing Chrome...");
      await this.context.close();
      this.context = null;
      this.page = null;
    }
  }
}
