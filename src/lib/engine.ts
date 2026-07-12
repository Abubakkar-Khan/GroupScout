
import { PrismaClient } from "@prisma/client";
import { FacebookAutomator, FacebookPost } from "./facebook";
import { getGroqClient, classifyPost } from "./groq";

const prisma = new PrismaClient();
const automator = new FacebookAutomator();
let isRunning = false;

/** Random delay between min and max milliseconds */
function engineDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((r) => setTimeout(r, ms));
}

async function processPostsInBackground(
  posts: FacebookPost[],
  user: any,
  keywords: any[],
  settings: any,
  groups: any[]
) {
  const kwStrings = keywords.map((k) => k.keyword.toLowerCase());
  let matchCount = 0;
  let savedCount = 0;

  for (const post of posts) {
    // Skip duplicates
    const existing = await prisma.post.findFirst({
      where: { facebookPostId: post.postId, userId: user.id },
    });
    if (existing) continue;

    // Keyword matching
    const contentLower = post.content.toLowerCase();
    const matchedKeyword = kwStrings.find((kw) => contentLower.includes(kw));
    if (!matchedKeyword) continue;

    matchCount++;
    console.log(`[Engine] ⚡ Keyword "${matchedKeyword}" matched in post ${post.postId.substring(0, 12)}...`);

    // Groq classification
    let isRelevant = false;
    if (settings.useGroq && settings.groqApiKey) {
      try {
        const groq = getGroqClient(settings.groqApiKey);
        isRelevant = await classifyPost(groq, matchedKeyword, post.content, settings.groqSystemPrompt);
        // Small delay between API calls to respect rate limits
        await engineDelay(500, 1500);
      } catch (error) {
        console.error(`[Engine] Groq error:`, error);
        isRelevant = true; // If Groq fails, save as relevant anyway
      }
    } else {
      isRelevant = true; // No Groq = all keyword matches are leads
    }

    console.log(`[Engine] Post ${post.postId.substring(0, 12)}... → ${isRelevant ? "✅ LEAD" : "❌ Ignored"}`);

    // Save to database
    const groupDb = groups.find((g) => g.facebookGroupId === post.groupId);
    if (groupDb) {
      await prisma.post.create({
        data: {
          userId: user.id,
          facebookPostId: post.postId,
          groupId: groupDb.id,
          keyword: matchedKeyword,
          content: post.content,
          url: post.url,
          relevant: isRelevant,
          viewed: false,
        },
      });
      savedCount++;
    }
  }

  if (posts.length > 0) {
    console.log(`[Engine] Background processing complete for ${posts[0].groupId}. ${matchCount} matched, ${savedCount} saved.`);
  }
}

async function runScan() {
  if (isRunning) {
    console.log("[Engine] Scan already in progress. Skipping.");
    return;
  }

  isRunning = true;
  console.log(`\n━━━ [Engine] Starting scan at ${new Date().toLocaleTimeString()} ━━━`);

  try {
    // 1. Fetch user data
    const user = await prisma.user.findFirst({
      include: {
        settings: true,
        keywords: { where: { enabled: true } },
        groups: { where: { enabled: true } },
      },
    });

    if (!user || !user.settings) {
      console.log("[Engine] No user or settings found.");
      return;
    }

    const { settings, keywords, groups } = user;

    if (groups.length === 0) {
      console.log("[Engine] No enabled groups. Add groups in the dashboard.");
      return;
    }

    if (keywords.length === 0) {
      console.log("[Engine] No enabled keywords. Add keywords in the dashboard.");
      return;
    }

    // 2. Check active time window
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const parseTime = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    const startTime = parseTime(settings.activeFrom);
    const endTime = parseTime(settings.activeTo);

    if (currentMinutes < startTime || currentMinutes > endTime) {
      console.log(`[Engine] Outside active hours (${settings.activeFrom}–${settings.activeTo}). Sleeping.`);
      await automator.close();
      return;
    }

    // 3. Launch browser (reuses session if already open)
    await automator.init();

    // 4. Scan each group with human-like pauses between them
    let totalPostsScraped = 0;

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      console.log(`[Engine] Scanning group ${i + 1}/${groups.length}: ${group.name || group.facebookGroupId}`);

      const { posts, groupName, iconUrl } = await automator.scanGroup(group.facebookGroupId, 15);
      totalPostsScraped += posts.length;

      // Update group stats
      await prisma.monitoredGroup.update({
        where: { id: group.id },
        data: {
          lastScan: new Date(),
          postsScanned: { increment: posts.length },
          // Update name and icon if they were found (unless they are empty)
          ...(groupName ? { name: groupName } : {}),
          ...(iconUrl ? { iconUrl } : {})
        },
      });

      // ──🚀 START BACKGROUND PROCESSING FOR THIS GROUP ──
      // We don't await this so the browser can immediately pause or move to the next group!
      if (posts.length > 0) {
        processPostsInBackground(posts, user, keywords, settings, groups).catch((err) => 
          console.error(`[Engine] Background processing error for ${group.facebookGroupId}:`, err)
        );
      }

      // Human-like pause between groups (5s–12s) to avoid rapid navigation patterns, but fast enough
      if (i < groups.length - 1) {
        const pauseSec = Math.floor(Math.random() * 8) + 5;
        console.log(`[Engine] Pausing ${pauseSec}s before next group...`);
        await engineDelay(pauseSec * 1000, pauseSec * 1000 + 3000);
      }
    }

    console.log(`━━━ [Engine] Scraping complete. ${totalPostsScraped} total posts scraped. Chrome remains open. ━━━\n`);

  } catch (error) {
    console.error("[Engine] Fatal error during scan:", error);
    try { await automator.close(); } catch { /* ignore */ }
  } finally {
    isRunning = false;
  }
}

// ─── Engine Control (globalThis survives Next.js HMR) ─────────────────

const globalAny: any = global;

export function startEngine() {
  if (globalAny.engineInterval) {
    console.log("[Engine] Already running.");
    return { status: "running" };
  }

  console.log("[Engine] ▶ Started.");
  globalAny.lastRunTimestamp = Date.now();

  // Run the first scan immediately
  runScan();

  // Then check every 60 seconds if it's time for another scan
  globalAny.engineInterval = setInterval(async () => {
    try {
      const user = await prisma.user.findFirst({ include: { settings: true } });
      if (!user || !user.settings) return;

      const intervalMs = user.settings.scanInterval * 60 * 1000;
      const now = Date.now();
      const lastRun = globalAny.lastRunTimestamp || 0;

      if (now - lastRun >= intervalMs) {
        globalAny.lastRunTimestamp = now;
        await runScan();
      }
    } catch (e) {
      console.error("[Engine] Interval check error:", e);
    }
  }, 60000);

  return { status: "running" };
}

export function stopEngine() {
  if (globalAny.engineInterval) {
    clearInterval(globalAny.engineInterval);
    globalAny.engineInterval = null;
    console.log("[Engine] ⏹ Stopped.");
  }
  // Also close the browser if it's still open
  automator.close().catch(() => {});
  return { status: "stopped" };
}

export function getEngineStatus() {
  return globalAny.engineInterval ? "running" : "stopped";
}
