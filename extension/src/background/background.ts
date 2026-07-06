import { fetchConfig } from "./api";
import { checkActiveHours, managePowerModeTabs } from "./tabManager";
import { Config } from "./types";

let config: Config | null = null;

async function syncConfig(userId: string) {
  const newConfig = await fetchConfig(userId);
  if (newConfig) {
    config = newConfig;
    console.log("Config loaded", config);
    chrome.alarms.create("scanGroups", { 
      periodInMinutes: parseInt(config.scanInterval as any) || 5 
    });
    
    // Immediately check tab state for Power Mode
    const isActive = checkActiveHours(config);
    await managePowerModeTabs(config, isActive);
    return true;
  }
  return false;
}

// Initial load
chrome.storage.local.get(["userId"], (result) => {
  if (result.userId) {
    syncConfig(result.userId);
  }
});

// Alarm handler (Interval Verification)
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "scanGroups" && config) {
    const isActive = checkActiveHours(config);
    
    // Manage Power Mode tabs
    await managePowerModeTabs(config, isActive);
    
    if (!isActive) {
      console.log("Outside active hours, skipping scan");
      return;
    }
    
    // Trigger content script to scan open facebook tabs
    chrome.tabs.query({ url: "*://*.facebook.com/groups/*" }, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { action: "scan", keywords: config?.keywords || [] }).catch(() => {});
        }
      });
    });
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateUserId") {
    chrome.storage.local.set({ userId: request.userId });
    syncConfig(request.userId).then(success => {
      sendResponse({ success });
    });
    return true; // async response
  }
  
  if (request.action === "ingestPost") {
    chrome.storage.local.get(["userId"], (result) => {
      if (result.userId) {
        fetch("http://localhost:3000/api/extension/ingest", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": result.userId
          },
          body: JSON.stringify(request.data)
        }).then(res => res.json()).then(data => {
          console.log("Ingest response", data);
        }).catch(err => {
          console.error("Ingest error", err);
        });
      }
    });
  }

  if (request.action === "getConfig") {
    sendResponse({ config });
  }
});
