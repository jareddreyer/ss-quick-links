const setting = { 'initialValue': false };
const onError = (e) => console.error(`Error: ${e}`);

/**
 * Updates the Status Bar UI based on the current URL.
 * Matches the class ".status-bar" and uses case-insensitive regex.
 */
function updateStatusUI(url) {
  const statusBar = document.querySelector('.status-bar');
  if (!statusBar) return;

  // Case-insensitive check for stage=stage or stage=Stage
  const isDraft = /stage=stage/i.test(url.search);

  if (isDraft) {
    statusBar.textContent = 'DRAFT';
    statusBar.style.backgroundColor = '#ffc107'; // Yellow for Draft
    statusBar.style.color = '#212529';
  } else {
    statusBar.textContent = 'LIVE';
    statusBar.style.backgroundColor = '#28a745'; // Green for Live
    statusBar.style.color = '#ffffff';
  }
}

function saveOptions() {
  const settings = {
    initialValue: document.getElementById('tabOption').checked
  };
  browser.storage.sync.set(settings).then(null, onError);
}

function restoreOptions() {
  browser.storage.sync.get(setting).then((data) => {
    document.getElementById('tabOption').checked = data.initialValue;
  });
}

function getCurrentWindowTab() {
  return browser.tabs.query({ active: true, currentWindow: true });
}

function tabDestination(url, hostname, path) {
  const targetUrl = `${url.protocol}//${hostname}${path}`;
  const openInNewTab = document.getElementById('tabOption').checked;

  if (openInNewTab) {
    browser.tabs.create({ url: targetUrl });
  } else {
    browser.tabs.update({ url: targetUrl });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  restoreOptions();

  // Check the current tab status immediately on popup open
  getCurrentWindowTab().then(([tab]) => {
    if (tab?.url) {
      updateStatusUI(new URL(tab.url));
    }
  }).catch(onError);
});

document.addEventListener("click", async (e) => {
  // 1. Handle Toggle Switch (Keep menu open so user can change settings)
  if (e.target.id === "tabOption") {
    saveOptions();
    return;
  }

  // 2. Ensure we are clicking an actual action button
  if (!e.target.classList.contains('admin-btn')) return;

  e.preventDefault();

  const [currentTab] = await getCurrentWindowTab();
  if (!currentTab?.url) return;

  const url = new URL(currentTab.url);
  const hostname = url.hostname;

  const STAGE_DRAFT = 'stage=Stage';
  const STAGE_LIVE = 'stage=Live';
  const ENV_UAT = '-uat.';
  const ENV_PROD = '-prod.';

  // Map simple IDs to paths
  const simplePaths = {
    "admin-run-devbuild": '/dev/build',
    "admin-goto-devtasks": '/dev/tasks',
    "admin-goto-dev": '/dev/',
    "admin-goto-admin": '/admin',
    "admin-logout": '/Security/logout',
    "admin-goto-home": '/', // Redirects to the root domain
  };

  // Execute logic based on ID
  if (simplePaths[e.target.id]) {
    tabDestination(url, hostname, simplePaths[e.target.id]);
  } else {
    switch (e.target.id) {
      case "admin-change-stage":
        let newQuery = '';
        const hasDraft = /stage=stage/i.test(url.search);
        const hasLive = /stage=live/i.test(url.search);

        if (!url.search || (!hasDraft && !hasLive)) {
          newQuery = url.search ? `${url.search}&${STAGE_DRAFT}` : `?${STAGE_DRAFT}`;
        } else if (hasDraft) {
          newQuery = url.search.replace(/stage=stage/i, STAGE_LIVE);
        } else {
          newQuery = url.search.replace(/stage=live/i, STAGE_DRAFT);
        }
        tabDestination(url, hostname, url.pathname + newQuery);
        break;

      case "admin-change-environment":
        if (!hostname.includes(ENV_PROD) && !hostname.includes(ENV_UAT)) {
          browser.notifications.create({
            "type": "basic",
            "title": "Environment Swap",
            "message": "Please use only SSP URLs to swap environments."
          });
        } else {
          const newHost = hostname.includes(ENV_UAT)
            ? hostname.replace(ENV_UAT, ENV_PROD)
            : hostname.replace(ENV_PROD, ENV_UAT);
          tabDestination(url, newHost, url.pathname + url.search);
        }
        break;

      case "admin-flush-cache-page":
        const flushQuery = /flush=1/i.test(url.search)
          ? url.search
          : (url.search ? `${url.search}&flush=1` : '?flush=1');
        tabDestination(url, hostname, url.pathname + flushQuery);
        break;
    }
  }

  // 3. Close the popup window after the action is triggered
  window.close();
});
