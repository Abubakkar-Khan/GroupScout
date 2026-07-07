import { processElement } from "./observer";
import { extractPostData } from "./facebook-parser";
import { hasProcessed } from "./cache";

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runSmartScan(config: any) {
  if (!config.keywords || config.keywords.length === 0) return;
  
  const pages = config.autoScrollPages || 5;
  console.log(`GroupScout: Running Smart Scan (Max ${pages} pages)`);
  
  // Track what we've seen *during this current scan session*
  const sessionSeen = new Set<string>();

  for (let i = 0; i < pages; i++) {
    const posts = document.querySelectorAll('[role="article"]');
    let hitPreviousPost = false;
    
    for (const post of posts) {
      const data = extractPostData(post);
      if (!data) continue;

      // If it's the first time we see this post *in this session*
      if (!sessionSeen.has(data.postId)) {
        // But it WAS processed in a previous background interval / day
        if (hasProcessed(data.postId)) {
          hitPreviousPost = true;
        }
        sessionSeen.add(data.postId);
        processElement(post, config.keywords);
      }
    }
    
    if (hitPreviousPost) {
      console.log("GroupScout: Encountered historically processed posts. Stopping scroll early.");
      break;
    }
    
    // Scroll down to load more
    window.scrollTo(0, document.body.scrollHeight);
    console.log(`GroupScout: Scrolled page ${i + 1}/${pages}`);
    
    // Wait for Facebook to load new posts
    await sleep(2500);
  }
  
  console.log("GroupScout: Smart Scan complete.");
}
