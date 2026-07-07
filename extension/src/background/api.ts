import { Config } from "./types";

export async function fetchConfig(): Promise<Config | null> {
  try {
    const cookie = await chrome.cookies.get({ url: "http://localhost:3000", name: "sessionId" });
    if (!cookie?.value) return null;

    const res = await fetch("http://localhost:3000/api/extension/config", {
      headers: { "Authorization": `Bearer ${cookie.value}` }
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.error("Failed to fetch config", e);
  }
  return null;
}
