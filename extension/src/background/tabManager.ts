import { Config } from "./types";

// Track tabs created by the extension in Power Mode
let managedTabIds: Set<number> = new Set();
let isPowerModeActive = false;

export function checkActiveHours(config: Config): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const [fromH, fromM] = config.activeFrom.split(':').map(Number);
  const [toH, toM] = config.activeTo.split(':').map(Number);
  
  const fromMinutes = fromH * 60 + fromM;
  const toMinutes = toH * 60 + toM;
  
  if (toMinutes >= fromMinutes) {
    return currentMinutes >= fromMinutes && currentMinutes <= toMinutes;
  } else {
    // Crosses midnight
    return currentMinutes >= fromMinutes || currentMinutes <= toMinutes;
  }
}

export async function runBatchedPowerScan(config: Config) {
  if (config.monitoringMode !== "power" || !config.groups || config.groups.length === 0) return;
  
  const BATCH_SIZE = 5;
  console.log(`Power Mode: Starting batched scan of ${config.groups.length} groups`);

  for (let i = 0; i < config.groups.length; i += BATCH_SIZE) {
    const batch = config.groups.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${i/BATCH_SIZE + 1}:`, batch);

    // Get currently active tab so we can restore focus
    const [originalActiveTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Find already open facebook group tabs
    const existingTabs = await chrome.tabs.query({ url: "*://*.facebook.com/groups/*" });
    const openGroupMap = new Map<string, number>();
    existingTabs.forEach(t => {
      const match = t.url?.match(/facebook\.com\/groups\/([^\/\?]+)/);
      if (match && t.id) openGroupMap.set(match[1], t.id);
    });

    const batchTabIdsToScan: number[] = [];
    const batchTabIdsToClose: number[] = [];

    // Open missing tabs
    for (const groupId of batch) {
      if (openGroupMap.has(groupId)) {
        batchTabIdsToScan.push(openGroupMap.get(groupId)!);
      } else {
        // Open as active to prevent Chrome from throttling React rendering
        const tab = await chrome.tabs.create({
          url: `https://www.facebook.com/groups/${groupId}`,
          active: true 
        });
        if (tab.id) {
          batchTabIdsToScan.push(tab.id);
          batchTabIdsToClose.push(tab.id);
        }
      }
    }

    // Restore focus to user's original tab immediately so we don't interrupt them
    if (originalActiveTab?.id) {
      await chrome.tabs.update(originalActiveTab.id, { active: true });
    }

    // Wait for Facebook DOM to initialize before sending scan
    await new Promise(r => setTimeout(r, 7000));

    // Trigger scan on all tabs in the batch concurrently
    const scanPromises = batchTabIdsToScan.map(tabId => {
      return new Promise<void>((resolve) => {
        chrome.tabs.sendMessage(tabId, { action: "scan", config }, (response) => {
          if (chrome.runtime.lastError) {
             console.error(`Tab ${tabId} error:`, chrome.runtime.lastError);
          }
          resolve();
        });
      });
    });

    await Promise.all(scanPromises);
    console.log(`Batch ${i/BATCH_SIZE + 1} scan complete. Closing opened tabs.`);

    // Scan for this batch is complete. Close ONLY the tabs we opened.
    if (batchTabIdsToClose.length > 0) {
      chrome.tabs.remove(batchTabIdsToClose).catch(console.error);
    }

    // Wait a bit before starting the next batch
    if (i + BATCH_SIZE < config.groups.length) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log("Power Mode: All batched scans complete.");
}
