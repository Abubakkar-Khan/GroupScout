let config = null;

// Fetch config from backend
async function fetchConfig(userId) {
  try {
    const res = await fetch("http://localhost:3000/api/extension/config", {
      headers: { "x-user-id": userId }
    });
    if (res.ok) {
      config = await res.json();
      console.log("Config loaded", config);
      
      // Update alarm based on scan interval
      chrome.alarms.create("scanGroups", { 
        periodInMinutes: parseInt(config.scanInterval) || 5 
      });
      return true;
    }
  } catch (e) {
    console.error("Failed to fetch config", e);
  }
  return false;
}

// Initial load
chrome.storage.local.get(["userId"], (result) => {
  if (result.userId) {
    fetchConfig(result.userId);
  }
});

// Alarm handler
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "scanGroups") {
    // Check if within active hours
    if (config) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      const [fromH, fromM] = config.activeFrom.split(':').map(Number);
      const [toH, toM] = config.activeTo.split(':').map(Number);
      
      const fromMinutes = fromH * 60 + fromM;
      const toMinutes = toH * 60 + toM;
      
      let isActive = false;
      if (toMinutes >= fromMinutes) {
        isActive = currentMinutes >= fromMinutes && currentMinutes <= toMinutes;
      } else {
        isActive = currentMinutes >= fromMinutes || currentMinutes <= toMinutes;
      }
      
      if (!isActive) {
        console.log("Outside active hours, skipping scan");
        return;
      }
    }
    
    // Trigger content script to scan open facebook tabs
    chrome.tabs.query({ url: "*://*.facebook.com/groups/*" }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { action: "scan", keywords: config?.keywords || [] });
      });
    });
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateUserId") {
    chrome.storage.local.set({ userId: request.userId });
    fetchConfig(request.userId).then(success => {
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
});
