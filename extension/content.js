console.log("GroupScout Extension injected");

// Helper to extract group ID from URL
function getGroupId() {
  const match = window.location.href.match(/facebook\.com\/groups\/([^\/\?]+)/);
  return match ? match[1] : null;
}

// Helper to extract group name
function getGroupName() {
  const h1 = document.querySelector('h1');
  return h1 ? h1.innerText.trim() : "Unknown Group";
}

// Helper to extract post text content
function getPostContent(postElement) {
  // Facebook changes its DOM structure often, this is a best-effort selector
  const contentElement = postElement.querySelector('[data-ad-preview="message"]');
  if (contentElement) return contentElement.innerText.trim();
  
  // Fallback for some group post structures
  const messageElement = postElement.querySelector('div[dir="auto"]');
  return messageElement ? messageElement.innerText.trim() : "";
}

// Process a single post element
function processPost(postElement, keywords) {
  const groupId = getGroupId();
  if (!groupId) return;

  const content = getPostContent(postElement).toLowerCase();
  if (!content || content.length < 10) return; // Ignore very short/empty posts

  // Check if we've already processed this post in this session
  if (postElement.dataset.scoutProcessed) return;
  postElement.dataset.scoutProcessed = "true";

  // Find matching keyword
  let matchedKeyword = null;
  for (const kw of keywords) {
    if (content.includes(kw.toLowerCase())) {
      matchedKeyword = kw;
      break;
    }
  }

  if (matchedKeyword) {
    console.log("Found match for keyword:", matchedKeyword);
    
    // Attempt to extract post ID (very complex on modern Facebook DOM)
    // Often it's in a link somewhere in the post header
    const postLinks = Array.from(postElement.querySelectorAll('a[href*="/groups/"]'));
    const postLink = postLinks.find(a => a.href.includes('/posts/'));
    
    let postId = null;
    let url = null;
    if (postLink) {
      const match = postLink.href.match(/\/posts\/(\d+)/);
      if (match) {
        postId = match[1];
        url = postLink.href.split('?')[0]; // clean url
      }
    }
    
    // Fallback if we can't find the exact ID - use a hash of the content as an ID
    if (!postId) {
      // Create a simple hash of the content text
      let hash = 0;
      for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      postId = "hash_" + Math.abs(hash).toString();
      url = window.location.href; // Just point to the group
    }

    const groupName = getGroupName();

    // Send to background script
    chrome.runtime.sendMessage({
      action: "ingestPost",
      data: {
        groupId,
        groupName,
        postId,
        content: getPostContent(postElement), // Original case
        url,
        keyword: matchedKeyword
      }
    });
  }
}

// Listen for scan commands
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scan" && request.keywords && request.keywords.length > 0) {
    console.log("Scanning page for keywords", request.keywords);
    // Facebook feed posts usually have role="article"
    const posts = document.querySelectorAll('[role="article"]');
    posts.forEach(post => processPost(post, request.keywords));
  }
});
