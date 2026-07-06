import { PostData } from "./types";

export function sendToBackground(post: PostData, keyword: string) {
  chrome.runtime.sendMessage({
    action: "ingestPost",
    data: {
      groupId: post.groupId,
      groupName: post.groupName,
      postId: post.postId,
      content: post.content,
      url: post.url,
      keyword
    }
  });
}

// Fetch keywords from background script to avoid querying local storage constantly
export function getKeywordsFromBackground(): Promise<string[]> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "getConfig" }, (response) => {
      if (response && response.config && response.config.keywords) {
        resolve(response.config.keywords);
      } else {
        resolve([]);
      }
    });
  });
}
