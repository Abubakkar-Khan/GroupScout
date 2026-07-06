import { extractPostData } from "./facebook-parser";
import { getMatchedKeyword } from "./keywordMatcher";
import { hasProcessed, markProcessed } from "./cache";
import { sendToBackground } from "./api";

export function startObserver(keywords: string[]) {
  if (keywords.length === 0) return;
  
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;
            // Check if the added node itself is a post
            if (el.getAttribute('role') === 'article') {
              processElement(el, keywords);
            }
            // Or if it contains posts
            const posts = el.querySelectorAll('[role="article"]');
            posts.forEach(post => processElement(post, keywords));
          }
        });
      }
    }
  });

  // Start observing the body for injected nodes (infinite scroll)
  observer.observe(document.body, { childList: true, subtree: true });
  console.log("GroupScout: MutationObserver started");
}

export function processElement(el: Element, keywords: string[]) {
  const postData = extractPostData(el);
  if (!postData) return;
  
  if (hasProcessed(postData.postId)) return;
  
  // Immediately mark to prevent duplicates during async processing
  markProcessed(postData.postId);

  const matchedKeyword = getMatchedKeyword(postData, keywords);
  if (matchedKeyword) {
    console.log("GroupScout: Found match for keyword:", matchedKeyword);
    sendToBackground(postData, matchedKeyword);
  }
}
