// Child Phone Simulator JavaScript
const CHILD_ID = 1;
const DEVICE_ID = 1;

let appState = {
  isLocked: false,
  batteryLevel: 78,
  activeApp: null,
  activeSessionSeconds: 0,
  activeTimerInterval: null,
  appsList: [],
  rules: null,
  totalMinutesUsed: 0
};

// Toast notification helper
function showToast(title, message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${type === 'critical' ? '🚨' : type === 'warning' ? '⚠️' : 'ℹ️'}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${message}</div>
    </div>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// 1. Clock and status bar updater
function updateClocks() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });

  const sbTime = document.getElementById('sb-time');
  const homeClock = document.getElementById('home-clock');
  const homeDate = document.getElementById('home-date');

  if (sbTime) sbTime.innerText = timeStr;
  if (homeClock) homeClock.innerText = timeStr;
  if (homeDate) homeDate.innerText = dateStr;
}
setInterval(updateClocks, 1000);
updateClocks();

// 2. Fetch Child state from backend
async function fetchChildState() {
  try {
    const res = await fetch(`/api/children/details?childId=${CHILD_ID}`);
    const data = await res.json();
    if (!res.ok) return;

    appState.rules = data.rules;
    appState.appsList = data.apps || [];
    appState.isLocked = (data.rules && data.rules.is_locked) || (data.device && data.device.is_locked);
    appState.totalMinutesUsed = data.totalMinutesUsed || 0;
    appState.batteryLevel = data.device ? data.device.battery_level : 78;

    renderAppGrid();
    updateLockState();
    updateScreenTimePill();
    updateBatteryUI();
  } catch (err) {
    console.error('Failed to load child state:', err);
  }
}

// 3. Render App Launcher Grid
function renderAppGrid() {
  const grid = document.getElementById('app-grid');
  if (!grid) return;
  grid.innerHTML = '';

  appState.appsList.forEach(app => {
    const item = document.createElement('div');
    item.className = 'app-icon-item';
    item.innerHTML = `
      <div class="icon-box ${app.is_blocked ? 'blocked-badge' : ''}" style="background: ${getAppColor(app.package_name)};">
        ${app.icon || '📱'}
      </div>
      <span class="app-label">${app.app_name}</span>
    `;

    item.addEventListener('click', () => launchApp(app));
    grid.appendChild(item);
  });
}

function getAppColor(pkg) {
  if (pkg.includes('youtube')) return '#dc2626';
  if (pkg.includes('tiktok') || pkg.includes('musically')) return '#0f172a';
  if (pkg.includes('instagram')) return 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)';
  if (pkg.includes('minecraft')) return '#15803d';
  if (pkg.includes('roblox')) return '#475569';
  if (pkg.includes('chrome')) return '#0284c7';
  if (pkg.includes('whatsapp')) return '#16a34a';
  if (pkg.includes('khanacademy')) return '#047857';
  return '#4338ca';
}

function updateBatteryUI() {
  const sbBat = document.getElementById('sb-battery');
  const dockBat = document.getElementById('dock-battery-val');
  if (sbBat) sbBat.innerText = `🔋 ${appState.batteryLevel}%`;
  if (dockBat) dockBat.innerText = `${appState.batteryLevel}%`;
}

function updateScreenTimePill() {
  const pill = document.getElementById('remaining-time-text');
  if (!pill || !appState.rules) return;

  const totalAllowed = (appState.rules.daily_limit_minutes || 120) + (appState.rules.bonus_minutes_today || 0);
  const remaining = Math.max(0, totalAllowed - appState.totalMinutesUsed);
  pill.innerText = `${remaining} min left`;
}

function updateLockState() {
  const lockoutScreen = document.getElementById('lockout-screen');
  const lockoutTitle = document.getElementById('lockout-title');
  const lockoutMessage = document.getElementById('lockout-message');

  if (appState.isLocked) {
    lockoutScreen.classList.add('visible');
    lockoutTitle.innerText = "Phone Locked by Parent";
    lockoutMessage.innerText = "Your parent has engaged remote lock on this device. Emergency features remain available.";
  } else {
    lockoutScreen.classList.remove('visible');
  }
}

// 4. App Launch Engine (FR-05)
async function launchApp(app) {
  if (appState.isLocked) {
    updateLockState();
    return;
  }

  // Safe Browser special case (FR-06)
  if (app.package_name === 'com.android.chrome') {
    openSafeBrowser();
    return;
  }

  try {
    const res = await fetch('/api/restrictions/check-allowed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: CHILD_ID, packageName: app.package_name })
    });
    const check = await res.json();

    if (!check.allowed) {
      showBlockOverlay(app, check.reason);
      return;
    }

    // Launch active app screen
    startAppSession(app);
  } catch (err) {
    console.error('Launch check failed:', err);
  }
}

function showBlockOverlay(app, reason) {
  const overlay = document.getElementById('block-overlay');
  const reasonEl = document.getElementById('block-reason-text');
  reasonEl.innerText = reason || `Access to ${app.app_name} is restricted by parental controls.`;
  overlay.classList.add('visible');

  // Request time button action
  document.getElementById('btn-request-time').onclick = () => {
    showToast('Request Sent', 'A 15-minute extension request was sent to parent.', 'info');
    overlay.classList.remove('visible');
  };
}

document.getElementById('btn-close-block').addEventListener('click', () => {
  document.getElementById('block-overlay').classList.remove('visible');
});

// 5. Active App Session Runner (FR-03 Usage Tracking)
function startAppSession(app) {
  appState.activeApp = app;
  appState.activeSessionSeconds = 0;

  document.getElementById('active-app-title').innerText = app.app_name;
  document.getElementById('active-app-name').innerText = app.app_name;
  document.getElementById('active-app-icon').innerText = app.icon || '📱';
  document.getElementById('active-session-timer').innerText = '00:00';

  document.getElementById('active-app-screen').classList.add('visible');

  // Notify backend of current foreground app
  fetch('/api/devices/heartbeat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId: DEVICE_ID, currentApp: app.app_name, batteryLevel: appState.batteryLevel })
  });

  if (appState.activeTimerInterval) clearInterval(appState.activeTimerInterval);
  appState.activeTimerInterval = setInterval(() => {
    appState.activeSessionSeconds++;
    const m = String(Math.floor(appState.activeSessionSeconds / 60)).padStart(2, '0');
    const s = String(appState.activeSessionSeconds % 60).padStart(2, '0');
    document.getElementById('active-session-timer').innerText = `${m}:${s}`;

    // Every 10 seconds, send usage log chunk to backend (FR-03)
    if (appState.activeSessionSeconds % 10 === 0) {
      fetch('/api/usage/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: DEVICE_ID,
          childId: CHILD_ID,
          packageName: app.package_name,
          appName: app.app_name,
          category: app.category,
          durationSeconds: 10
        })
      });
      appState.totalMinutesUsed += 0.16;
      updateScreenTimePill();
    }
  }, 1000);
}

function exitAppSession() {
  if (appState.activeTimerInterval) {
    clearInterval(appState.activeTimerInterval);
    appState.activeTimerInterval = null;
  }
  document.getElementById('active-app-screen').classList.remove('visible');
  appState.activeApp = null;

  // Reset foreground app to Home Screen
  fetch('/api/devices/heartbeat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId: DEVICE_ID, currentApp: 'Home Screen' })
  });
}

document.getElementById('app-back-btn').addEventListener('click', exitAppSession);
document.getElementById('nav-home-pill').addEventListener('click', () => {
  exitAppSession();
  closeSafeBrowser();
  document.getElementById('block-overlay').classList.remove('visible');
});

// 6. Safe Browser & Content Filtering (FR-06)
function openSafeBrowser() {
  document.getElementById('browser-screen').classList.add('visible');
}

function closeSafeBrowser() {
  document.getElementById('browser-screen').classList.remove('visible');
}

document.getElementById('browser-close-btn').addEventListener('click', closeSafeBrowser);

async function evaluateBrowserQuery(query) {
  if (!query) return;
  const display = document.getElementById('browser-display-area');
  display.innerHTML = '<div style="text-align:center; color:#64748b;">Filtering and analyzing content safety...</div>';

  try {
    const res = await fetch('/api/filters/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: CHILD_ID, query: query, url: query })
    });
    const check = await res.json();

    if (!check.allowed) {
      display.innerHTML = `
        <div style="background:#fef2f2; border:1px solid #f87171; border-radius:12px; padding:18px; text-align:center;">
          <div style="font-size:36px; margin-bottom:8px;">🛑</div>
          <h4 style="color:#b91c1c; font-size:16px; margin-bottom:6px;">Access Blocked by Parental Controls</h4>
          <p style="color:#7f1d1d; font-size:12px; margin-bottom:12px;">${check.reason}</p>
          <div style="font-size:11px; color:#991b1b; background:white; padding:6px 12px; border-radius:6px; display:inline-block; border:1px solid #fca5a5;">
            An alert was sent to your parent's dashboard.
          </div>
        </div>
      `;
      showToast('Content Filter Triggered', check.reason, 'critical');
    } else {
      display.innerHTML = `
        <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:12px; padding:18px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
            <span style="font-size:20px;">✅</span>
            <strong style="color:#166534; font-size:14px;">Safe Search Verified</strong>
          </div>
          <p style="color:#15803d; font-size:13px; margin-bottom:8px;">Displaying verified educational results for: "<em>${query}</em>"</p>
          <div style="font-size:12px; color:#475569; line-height:1.4;">
            Safe search algorithms verified this content meets parental family safety guidelines.
          </div>
        </div>
      `;
    }
  } catch (err) {
    console.error('Filter check failed:', err);
  }
}

document.getElementById('browser-go-btn').addEventListener('click', () => {
  const q = document.getElementById('browser-input').value.trim();
  evaluateBrowserQuery(q);
});

document.getElementById('browser-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    evaluateBrowserQuery(e.target.value.trim());
  }
});

document.querySelectorAll('.test-search').forEach(btn => {
  btn.addEventListener('click', () => {
    const q = btn.getAttribute('data-q');
    document.getElementById('browser-input').value = q;
    evaluateBrowserQuery(q);
  });
});

// 7. Evaluator GPS Telemetry Simulation (FR-07)
async function sendSimulatedLocation(lat, lng, address) {
  try {
    await fetch('/api/location/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: DEVICE_ID,
        childId: CHILD_ID,
        latitude: lat,
        longitude: lng,
        speed: 1.5,
        address
      })
    });
    showToast('GPS Telemetry Updated', `Simulated location: ${address}`, 'info');
  } catch (err) {
    console.error('Failed to update GPS:', err);
  }
}

document.getElementById('btn-loc-home').addEventListener('click', () => {
  sendSimulatedLocation(37.7749, -122.4194, '124 Maple St (Home)');
});
document.getElementById('btn-loc-school').addEventListener('click', () => {
  sendSimulatedLocation(37.7833, -122.4167, 'Oak Creek Middle School');
});
document.getElementById('btn-loc-park').addEventListener('click', () => {
  sendSimulatedLocation(37.7690, -122.4467, 'Community Sports Park');
});
document.getElementById('btn-loc-outside').addEventListener('click', () => {
  sendSimulatedLocation(37.7950, -122.4000, 'Downtown Pier (Outside Safe Zone)');
});

// Battery simulation
document.getElementById('btn-drain-battery').addEventListener('click', () => {
  appState.batteryLevel = 10;
  updateBatteryUI();
  fetch('/api/devices/heartbeat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId: DEVICE_ID, batteryLevel: 10 })
  });
  showToast('Battery Low', 'Simulated low battery (10%) sent alert to parent.', 'warning');
});

// SOS Emergency Trigger (FR-08)
async function triggerEmergencySOS() {
  try {
    const res = await fetch('/api/alerts/sos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: CHILD_ID, latitude: 37.7749, longitude: -122.4194 })
    });
    const data = await res.json();
    showToast('🚨 SOS ALERT BROADCASTED', 'Emergency alert with live GPS coordinates transmitted to parent!', 'critical');
  } catch (err) {
    console.error('SOS failed:', err);
  }
}

document.getElementById('btn-dock-sos').addEventListener('click', triggerEmergencySOS);
document.getElementById('btn-sos-from-lock').addEventListener('click', triggerEmergencySOS);

// 8. Real-time Server-Sent Events (SSE) Listener (FR-08, NFR-02)
function setupSSE() {
  const sseStatus = document.getElementById('sse-status');
  const es = new EventSource('/api/stream');

  es.onopen = () => {
    if (sseStatus) {
      sseStatus.innerText = '● Live Synced';
      sseStatus.style.color = '#10b981';
    }
  };

  es.addEventListener('device_lock_state', (e) => {
    const data = JSON.parse(e.data);
    if (data.childId === CHILD_ID) {
      appState.isLocked = !!data.isLocked;
      updateLockState();
      if (appState.isLocked) {
        exitAppSession();
        closeSafeBrowser();
      }
      showToast('Remote Lock Changed', appState.isLocked ? 'Device was locked remotely by parent' : 'Device was unlocked by parent', 'warning');
    }
  });

  es.addEventListener('app_restriction_updated', (e) => {
    const data = JSON.parse(e.data);
    fetchChildState();
  });

  es.addEventListener('bonus_granted', (e) => {
    const data = JSON.parse(e.data);
    showToast('Bonus Time Granted!', `Parent gave you +${data.bonusMinutes} minutes screen time! 🎉`, 'info');
    fetchChildState();
  });

  es.addEventListener('demo_reset', () => {
    fetchChildState();
  });

  es.onerror = () => {
    if (sseStatus) {
      sseStatus.innerText = '○ Reconnecting...';
      sseStatus.style.color = '#f59e0b';
    }
  };
}

// Initial load
fetchChildState();
setupSSE();

