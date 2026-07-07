import { startObserver } from "./observer";
import { runSmartScan } from "./scanner";
import { getConfigFromBackground } from "./api";

console.log("GroupScout Extension injected");

async function init() {
  const config = await getConfigFromBackground();
  
  if (config && config.keywords && config.keywords.length > 0) {
    // 1. Initial Smart Scan (Auto-Scroll)
    await runSmartScan(config);
    
    // 2. Start Real-time Detection
    startObserver(config.keywords);
  } else {
    console.log("GroupScout: No active keywords found. Monitoring idle.");
  }
}

// Start execution
init();

// Also listen for manual scan triggers from background (e.g. interval verification)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scan" && request.config) {
    runSmartScan(request.config).then(() => sendResponse({ status: "done" }));
    return true; // Keep message channel open for async response
  }
});
