import { fetchConfig } from "./api";
import { checkActiveHours, runBatchedPowerScan } from "./tabManager";
import { Config } from "./types";

let config: Config | null = null;

async function syncConfig() {
  const newConfig = await fetchConfig();
  if (newConfig) {
    config = newConfig;
    console.log("Config loaded", config);
    chrome.alarms.create("scanGroups", { 
      periodInMinutes: parseInt(config.scanInterval as any) || 5 
    });
    // We no longer immediately open tabs for Power Mode. 
    // They are opened in batches when the alarm triggers.
    return true;
  }
  return false;
}

// Initial load
syncConfig();

// Verify connection loop every 15 min just to be safe
chrome.alarms.create("syncConfig", { periodInMinutes: 15 });

// Alarm handler (Interval Verification)
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "syncConfig") {
    syncConfig();
  }

  if (alarm.name === "scanGroups" && config) {
    const isActive = checkActiveHours(config);
    // Manage Power Mode tabs
    if (config.monitoringMode === "power") {
      await runBatchedPowerScan(config);
    }
    
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
  if (request.action === "checkConnection") {
    syncConfig().then(success => {
      sendResponse({ success });
    });
    return true; // async response
  }
  
  if (request.action === "ingestPost") {
    chrome.cookies.get({ url: "http://localhost:3000", name: "sessionId" }, (cookie) => {
      if (cookie && cookie.value) {
        fetch("http://localhost:3000/api/extension/ingest", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${cookie.value}`
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
