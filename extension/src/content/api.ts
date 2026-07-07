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

export function getConfigFromBackground(): Promise<any> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "getConfig" }, (response) => {
      if (response && response.config) {
        resolve(response.config);
      } else {
        resolve(null);
      }
    });
  });
}
