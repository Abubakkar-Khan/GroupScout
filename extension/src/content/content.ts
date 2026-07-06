import { startObserver } from "./observer";
import { runFullScan } from "./scanner";
import { getKeywordsFromBackground } from "./api";

console.log("GroupScout Extension injected");

async function init() {
  const keywords = await getKeywordsFromBackground();
  
  if (keywords.length > 0) {
    // 1. Initial Scan
    runFullScan(keywords);
    
    // 2. Start Real-time Detection
    startObserver(keywords);
  } else {
    console.log("GroupScout: No active keywords found. Monitoring idle.");
  }
}

// Start execution
init();

// Also listen for manual scan triggers from background (e.g. interval verification)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scan" && request.keywords) {
    runFullScan(request.keywords);
  }
});
