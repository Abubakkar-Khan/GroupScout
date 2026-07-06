document.addEventListener('DOMContentLoaded', () => {
  const userIdInput = document.getElementById('userId');
  const saveBtn = document.getElementById('saveBtn');
  const statusDiv = document.getElementById('status');

  // Load existing
  chrome.storage.local.get(['userId'], (result) => {
    if (result.userId) {
      userIdInput.value = result.userId;
      statusDiv.textContent = 'Connected';
      statusDiv.className = 'status success';
    }
  });

  saveBtn.addEventListener('click', () => {
    const userId = userIdInput.value.trim();
    if (!userId) {
      statusDiv.textContent = 'Please enter a valid User ID';
      statusDiv.className = 'status error';
      return;
    }

    statusDiv.textContent = 'Connecting...';
    statusDiv.className = 'status';

    chrome.runtime.sendMessage({ action: 'updateUserId', userId }, (response) => {
      if (response && response.success) {
        statusDiv.textContent = 'Connected successfully!';
        statusDiv.className = 'status success';
      } else {
        statusDiv.textContent = 'Failed to connect to server. Check ID or server status.';
        statusDiv.className = 'status error';
      }
    });
  });
});
