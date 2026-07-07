document.addEventListener('DOMContentLoaded', () => {
  const dashboardBtn = document.getElementById('dashboardBtn');
  const statusDiv = document.getElementById('status');

  dashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3000/dashboard' });
  });

  // Verify connection by fetching config
  chrome.runtime.sendMessage({ action: 'checkConnection' }, (response) => {
    if (response && response.success) {
      statusDiv.textContent = 'Active & Connected to Dashboard';
      statusDiv.className = 'status success';
      
      // Fetch the actual config to display stats
      chrome.runtime.sendMessage({ action: 'getConfig' }, (res) => {
        if (res && res.config) {
          document.getElementById('statsContainer').style.display = 'block';
          document.getElementById('keywordCount').textContent = res.config.keywords?.length || 0;
          document.getElementById('groupCount').textContent = res.config.groups?.length || 0;
        }
      });

    } else {
      statusDiv.textContent = 'Please log into the dashboard first.';
      statusDiv.className = 'status error';
    }
  });
});
