import { processElement } from "./observer";

export function runFullScan(keywords: string[]) {
  if (keywords.length === 0) return;
  
  console.log("GroupScout: Running full DOM verification scan");
  const posts = document.querySelectorAll('[role="article"]');
  posts.forEach(post => processElement(post, keywords));
}
