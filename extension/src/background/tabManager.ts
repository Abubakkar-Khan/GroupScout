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

export async function managePowerModeTabs(config: Config, isActive: boolean) {
  if (config.monitoringMode !== "power") {
    // If switched away from power mode, clean up managed tabs
    if (managedTabIds.size > 0) {
      closeManagedTabs();
    }
    return;
  }

  if (isActive && !isPowerModeActive) {
    console.log("Power Mode: Active hours started. Opening tabs...");
    isPowerModeActive = true;
    await openGroupTabs(config.groups);
  } else if (!isActive && isPowerModeActive) {
    console.log("Power Mode: Active hours ended. Closing tabs...");
    isPowerModeActive = false;
    closeManagedTabs();
  }
}

async function openGroupTabs(groups: string[]) {
  // First, see what facebook tabs are already open to avoid duplicating
  const tabs = await chrome.tabs.query({ url: "*://*.facebook.com/groups/*" });
  const openGroups = new Set(
    tabs.map(t => {
      const match = t.url?.match(/facebook\.com\/groups\/([^\/\?]+)/);
      return match ? match[1] : null;
    }).filter(Boolean)
  );

  for (const groupId of groups) {
    if (!openGroups.has(groupId)) {
      const tab = await chrome.tabs.create({
        url: `https://www.facebook.com/groups/${groupId}`,
        active: false // Open in background
      });
      if (tab.id) {
        managedTabIds.add(tab.id);
      }
    }
  }
}

function closeManagedTabs() {
  const tabsToClose = Array.from(managedTabIds);
  if (tabsToClose.length > 0) {
    chrome.tabs.remove(tabsToClose).catch(console.error);
    managedTabIds.clear();
  }
}
