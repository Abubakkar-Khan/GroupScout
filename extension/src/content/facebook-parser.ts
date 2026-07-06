import { PostData } from "./types";

export function extractPostData(postElement: Element): PostData | null {
  const content = extractContent(postElement);
  if (!content || content.length < 10) return null; // Ignore empty

  const groupId = extractGroupId();
  if (!groupId) return null;

  const url = extractUrl(postElement, groupId);
  const postId = extractPostId(url) || generateHash(content);

  return {
    groupId,
    groupName: extractGroupName(),
    postId,
    url: url || window.location.href,
    content,
    timestamp: extractTimestamp(postElement),
    author: extractAuthor(postElement)
  };
}

function extractGroupId(): string | null {
  const match = window.location.href.match(/facebook\.com\/groups\/([^\/\?]+)/);
  return match ? match[1] : null;
}

function extractGroupName(): string {
  const h1 = document.querySelector('h1');
  return h1 ? h1.innerText.trim() : "Unknown Group";
}

function extractContent(postElement: Element): string {
  const contentElement = postElement.querySelector('[data-ad-preview="message"]');
  if (contentElement) return (contentElement as HTMLElement).innerText.trim();
  
  const messageElement = postElement.querySelector('div[dir="auto"]');
  return messageElement ? (messageElement as HTMLElement).innerText.trim() : "";
}

function extractUrl(postElement: Element, groupId: string): string | null {
  const links = Array.from(postElement.querySelectorAll('a[href*="/groups/"]')) as HTMLAnchorElement[];
  const postLink = links.find(a => a.href.includes('/posts/'));
  return postLink ? postLink.href.split('?')[0] : null;
}

function extractPostId(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/\/posts\/(\d+)/);
  return match ? match[1] : null;
}

function extractTimestamp(postElement: Element): string {
  // Try to find the timestamp link
  const links = Array.from(postElement.querySelectorAll('a[href*="/groups/"]')) as HTMLAnchorElement[];
  const postLink = links.find(a => a.href.includes('/posts/'));
  if (postLink && postLink.innerText) {
    return postLink.innerText.trim();
  }
  return new Date().toISOString();
}

function extractAuthor(postElement: Element): string {
  // Author is usually in an h3 or a strong tag near the top
  const authorEl = postElement.querySelector('h2, h3, h4, strong');
  return authorEl ? (authorEl as HTMLElement).innerText.trim() : "Unknown Author";
}

function generateHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) - hash) + content.charCodeAt(i);
    hash = hash & hash;
  }
  return "hash_" + Math.abs(hash).toString();
}
