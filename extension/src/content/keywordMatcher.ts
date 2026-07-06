import { PostData } from "./types";

export function getMatchedKeyword(post: PostData, keywords: string[]): string | null {
  const text = post.content.toLowerCase();
  
  for (const kw of keywords) {
    if (text.includes(kw.toLowerCase())) {
      return kw;
    }
  }
  
  return null;
}
