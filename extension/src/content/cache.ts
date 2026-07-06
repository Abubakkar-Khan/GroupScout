// In-memory cache
const processedPosts = new Set<string>();

// Initialize from local storage on load
chrome.storage.local.get(["processedPosts"], (result) => {
  if (result.processedPosts && Array.isArray(result.processedPosts)) {
    result.processedPosts.forEach((id: string) => processedPosts.add(id));
  }
});

export function hasProcessed(postId: string): boolean {
  return processedPosts.has(postId);
}

export function markProcessed(postId: string) {
  processedPosts.add(postId);
  
  // Persist to local storage (keep last 1000 to avoid hitting limits)
  const arr = Array.from(processedPosts).slice(-1000);
  chrome.storage.local.set({ processedPosts: arr });
}
