import { Config } from "./types";

export async function fetchConfig(userId: string): Promise<Config | null> {
  try {
    const res = await fetch("http://localhost:3000/api/extension/config", {
      headers: { "x-user-id": userId }
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.error("Failed to fetch config", e);
  }
  return null;
}
