// Parent Dashboard Application Logic (GuardianPulse)
const CHILD_ID = 1;
const PARENT_ID = 1;

let dashboardState = {
  child: null,
  device: null,
  rules: null,
  apps: [],
  filters: [],
  customRules: [],
  geofences: [],
  alerts: [],
  locationLogs: [],
  totalMinutesUsed: 0,
  map: null
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
  }, 4500);
}

// 1. Navigation Tab Switching
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

    item.classList.add('active');
    const tabId = item.getAttribute('data-tab');
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');

    // Update page heading
    const tabName = item.innerText.trim();
    document.getElementById('page-heading').innerText = tabName.replace(/^[^\w]+/, '').trim();

    // Resize map when location tab opens
    if (tabId === 'tab-location' && dashboardState.map) {
      setTimeout(() => dashboardState.map.resize(), 100);
    }
  });
});

// 2. Fetch Full Child Data
async function loadChildData() {
  try {
    const res = await fetch(`/api/children/details?childId=${CHILD_ID}`);
    const data = await res.json();
    if (!res.ok) return;

    dashboardState.child = data.child;
    dashboardState.device = data.device;
    dashboardState.rules = data.rules;
    dashboardState.apps = data.apps || [];
    dashboardState.filters = data.filters || [];
    dashboardState.customRules = data.customRules || [];
    dashboardState.geofences = data.geofences || [];
    dashboardState.totalMinutesUsed = data.totalMinutesUsed || 0;

    renderOverview();
    renderUsageTable();
    renderScreenTimeControls();
    renderRestrictionsTable();
    renderFilters();
    initOrUpdateMap(data.latestLocation);
  } catch (err) {
    console.error('Failed to load child details:', err);
  }
}

// 3. Fetch Alerts
async function loadAlerts() {
  try {
    const res = await fetch(`/api/alerts?parentId=${PARENT_ID}`);
    const data = await res.json();
    if (!res.ok) return;

    dashboardState.alerts = data.alerts || [];
    renderAlerts();
  } catch (err) {
    console.error('Failed to load alerts:', err);
  }
}

// 4. Render Dashboard Overview (FR-10)
function renderOverview() {
  const { child, device, rules, apps, totalMinutesUsed } = dashboardState;
  if (!child) return;

  // Sidebar child info
  document.getElementById('sidebar-child-name').innerText = `${child.name} (${child.age}y)`;
  document.getElementById('sidebar-child-avatar').innerText = child.avatar || '👦';
  if (device) {
    document.getElementById('sidebar-child-device').innerHTML = `
      <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#10b981;"></span>
      ${device.model.split('(')[0]} • Online (${device.battery_level}%)
    `;
    document.getElementById('banner-active-app').innerText = device.current_app || 'Home Screen';
    document.getElementById('banner-battery').innerText = `${device.battery_level}%`;
    document.getElementById('card-active-app-val').innerText = device.current_app || 'Home Screen';
  }

  // Metric cards
  const limitMins = (rules?.daily_limit_minutes || 120) + (rules?.bonus_minutes_today || 0);
  const usedHours = Math.floor(totalMinutesUsed / 60);
  const usedRemMins = Math.floor(totalMinutesUsed % 60);
  document.getElementById('card-screentime-val').innerText = `${usedHours}h ${usedRemMins}m`;

  // Remote Lock banner state
  const isLocked = (rules && rules.is_locked) || (device && device.is_locked);
  const bannerStatus = document.getElementById('banner-lock-status');
  const bannerBtnText = document.getElementById('banner-btn-text');
  const bannerBtn = document.getElementById('btn-banner-toggle-lock');
  const topLockBtn = document.getElementById('btn-emergency-lock-top');

  if (isLocked) {
    bannerStatus.innerText = "Device Status: REMOTELY LOCKED BY PARENT";
    bannerStatus.style.color = "#ef4444";
    bannerBtnText.innerText = "Unlock Device Now";
    bannerBtn.className = "lock-btn unlocked";
    topLockBtn.innerText = "🔓 Unlock Phone";
    topLockBtn.className = "btn-header";
  } else {
    bannerStatus.innerText = "Device Status: Active & Protected";
    bannerStatus.style.color = "white";
    bannerBtnText.innerText = "Lock Device Immediately";
    bannerBtn.className = "lock-btn";
    topLockBtn.innerText = "🔒 Lock Phone Now";
    topLockBtn.className = "btn-header danger";
  }

  // Render top 4 apps usage progress bars
  const barsContainer = document.getElementById('overview-usage-bars');
  barsContainer.innerHTML = '';
  const topApps = [...apps].sort((a, b) => b.time_used_today - a.time_used_today).slice(0, 4);

  topApps.forEach(app => {
    const percent = Math.min(100, Math.round((app.time_used_today / 60) * 100));
    const row = document.createElement('div');
    row.innerHTML = `
      <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
        <span style="font-weight:600; color:#1e293b; display:flex; align-items:center; gap:6px;">
          <span>${app.icon || '📱'}</span> ${app.app_name}
          ${app.is_blocked ? '<span class="badge-pill badge-blocked" style="font-size:9px; padding:2px 6px;">BLOCKED</span>' : ''}
        </span>
        <span style="color:#64748b; font-weight:600;">${app.time_used_today} mins</span>
      </div>
      <div style="height:8px; background:#e2e8f0; border-radius:4px; overflow:hidden;">
        <div style="width:${percent}%; height:100%; background:${app.is_blocked ? '#ef4444' : '#4f46e5'}; border-radius:4px; transition:width 0.4s ease;"></div>
      </div>
    `;
    barsContainer.appendChild(row);
  });
}

// 5. Render App Usage Table (FR-03)
function renderUsageTable() {
  const tbody = document.getElementById('usage-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  dashboardState.apps.forEach(app => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:600; display:flex; align-items:center; gap:8px;">
        <span style="font-size:18px;">${app.icon || '📱'}</span>
        ${app.app_name}
      </td>
      <td><span class="badge-pill" style="background:#f1f5f9; color:#475569;">${app.category}</span></td>
      <td style="font-family:monospace; color:#64748b; font-size:12px;">${app.package_name}</td>
      <td><strong>${app.time_used_today} min</strong></td>
      <td>${app.daily_limit_minutes > 0 ? `${app.daily_limit_minutes} min` : 'No limit'}</td>
      <td>
        <span class="badge-pill ${app.is_blocked ? 'badge-blocked' : 'badge-allowed'}">
          ${app.is_blocked ? '🔒 Blocked' : '✓ Allowed'}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// 6. Render Screen Time Controls (FR-04)
function renderScreenTimeControls() {
  const rules = dashboardState.rules;
  if (!rules) return;

  const slider = document.getElementById('daily-limit-slider');
  const display = document.getElementById('daily-limit-display');
  const curfewToggle = document.getElementById('curfew-toggle');
  const startInput = document.getElementById('curfew-start-input');
  const endInput = document.getElementById('curfew-end-input');

  slider.value = rules.daily_limit_minutes || 120;
  display.innerText = `${slider.value} min (${Math.floor(slider.value / 60)}h ${slider.value % 60}m)`;
  curfewToggle.checked = !!rules.curfew_enabled;
  startInput.value = rules.curfew_start || '21:00';
  endInput.value = rules.curfew_end || '06:30';

  slider.oninput = () => {
    display.innerText = `${slider.value} min (${Math.floor(slider.value / 60)}h ${slider.value % 60}m)`;
  };
}

// Save Daily Allowance
document.getElementById('btn-save-screentime').addEventListener('click', async () => {
  const limit = Number(document.getElementById('daily-limit-slider').value);
  try {
    await fetch('/api/screen-time', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: CHILD_ID, dailyLimitMinutes: limit })
    });
    showToast('Screen Time Saved', `Daily allowance updated to ${limit} minutes.`, 'info');
  } catch (err) {
    console.error('Failed to save screen time:', err);
  }
});

// Save Curfew
document.getElementById('btn-save-curfew').addEventListener('click', async () => {
  const enabled = document.getElementById('curfew-toggle').checked;
  const start = document.getElementById('curfew-start-input').value;
  const end = document.getElementById('curfew-end-input').value;
  try {
    await fetch('/api/screen-time', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: CHILD_ID, curfewEnabled: enabled, curfewStart: start, curfewEnd: end })
    });
    showToast('Curfew Updated', `Bedtime schedule set: ${start} to ${end}.`, 'info');
  } catch (err) {
    console.error('Failed to save curfew:', err);
  }
});

// Bonus Time Handlers
async function grantBonus(minutes) {
  try {
    await fetch('/api/screen-time/grant-bonus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: CHILD_ID, minutes })
    });
    showToast('Bonus Time Granted', `Added +${minutes} minutes to Alex's device today.`, 'info');
    loadChildData();
  } catch (err) {
    console.error('Failed to grant bonus:', err);
  }
}

document.getElementById('btn-grant-bonus-top').addEventListener('click', () => grantBonus(15));
document.getElementById('btn-bonus-15').addEventListener('click', () => grantBonus(15));
document.getElementById('btn-bonus-30').addEventListener('click', () => grantBonus(30));

// Remote Instant Lock Handler (FR-04, FR-10)
async function toggleRemoteLock() {
  const isCurrentlyLocked = dashboardState.rules?.is_locked || dashboardState.device?.is_locked;
  const newLock = !isCurrentlyLocked;
  try {
    const res = await fetch('/api/screen-time/toggle-lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: CHILD_ID, lock: newLock })
    });
    const data = await res.json();
    showToast(newLock ? 'Device Remotely Locked' : 'Device Remotely Unlocked', data.message, newLock ? 'warning' : 'info');
    loadChildData();
  } catch (err) {
    console.error('Lock toggle failed:', err);
  }
}

document.getElementById('btn-banner-toggle-lock').addEventListener('click', toggleRemoteLock);
document.getElementById('btn-emergency-lock-top').addEventListener('click', toggleRemoteLock);

// 7. Render App Restrictions (FR-05)
function renderRestrictionsTable(filterQuery = '') {
  const tbody = document.getElementById('restrictions-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const filtered = dashboardState.apps.filter(a =>
    a.app_name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    a.package_name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  filtered.forEach(app => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:600; display:flex; align-items:center; gap:8px;">
        <span style="font-size:20px;">${app.icon || '📱'}</span>
        <div>
          <div>${app.app_name}</div>
          <div style="font-size:11px; color:#94a3b8; font-weight:normal;">${app.package_name}</div>
        </div>
      </td>
      <td><span class="badge-pill" style="background:#f1f5f9;">${app.category}</span></td>
      <td>
        <input type="number" min="0" max="300" step="5" value="${app.daily_limit_minutes || 0}" style="width:70px; padding:4px 8px; border-radius:6px; border:1px solid #cbd5e1; font-size:12px;" data-pkg="${app.package_name}" class="app-limit-input"> min
      </td>
      <td><strong>${app.time_used_today} min</strong></td>
      <td>
        <label class="switch-label">
          <input type="checkbox" class="app-block-toggle" data-pkg="${app.package_name}" ${app.is_blocked ? 'checked' : ''}>
          <span class="slider-toggle"></span>
        </label>
      </td>
      <td>
        <button class="btn-header save-limit-btn" data-pkg="${app.package_name}" style="padding:4px 10px; font-size:11px;">Save Limit</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Attach toggle listeners
  tbody.querySelectorAll('.app-block-toggle').forEach(input => {
    input.addEventListener('change', async (e) => {
      const pkg = e.target.getAttribute('data-pkg');
      const isBlocked = e.target.checked;
      try {
        await fetch('/api/restrictions/toggle-block', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ childId: CHILD_ID, packageName: pkg, isBlocked })
        });
        showToast('App Status Updated', `${isBlocked ? 'Blocked' : 'Unblocked'} access to application.`, isBlocked ? 'warning' : 'info');
        loadChildData();
      } catch (err) {
        console.error('App toggle failed:', err);
      }
    });
  });

  // Attach limit save listeners
  tbody.querySelectorAll('.save-limit-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const pkg = btn.getAttribute('data-pkg');
      const input = tbody.querySelector(`.app-limit-input[data-pkg="${pkg}"]`);
      const limit = Number(input.value);
      try {
        await fetch('/api/restrictions/set-limit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ childId: CHILD_ID, packageName: pkg, dailyLimitMinutes: limit })
        });
        showToast('App Limit Set', `Daily limit set to ${limit} minutes for this app.`, 'info');
        loadChildData();
      } catch (err) {
        console.error('Save limit failed:', err);
      }
    });
  });
}

document.getElementById('app-search-input').addEventListener('input', (e) => {
  renderRestrictionsTable(e.target.value);
});

// 8. Render Content Filtering (FR-06)
function renderFilters() {
  const catList = document.getElementById('category-filters-list');
  const customList = document.getElementById('custom-rules-list');
  if (!catList || !customList) return;

  catList.innerHTML = '';
  dashboardState.filters.forEach(filter => {
    const row = document.createElement('div');
    row.style = 'display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0;';
    row.innerHTML = `
      <span style="font-weight:600; font-size:13px; color:#1e293b;">${filter.category}</span>
      <label class="switch-label">
        <input type="checkbox" class="cat-filter-toggle" data-cat="${filter.category}" ${filter.is_blocked ? 'checked' : ''}>
        <span class="slider-toggle"></span>
      </label>
    `;
    catList.appendChild(row);
  });

  catList.querySelectorAll('.cat-filter-toggle').forEach(input => {
    input.addEventListener('change', async (e) => {
      const cat = e.target.getAttribute('data-cat');
      const isBlocked = e.target.checked;
      try {
        await fetch('/api/filters/toggle-category', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ childId: CHILD_ID, category: cat, isBlocked })
        });
        showToast('Filter Updated', `${cat} category filtering is now ${isBlocked ? 'Enabled' : 'Disabled'}.`, 'info');
      } catch (err) {
        console.error('Filter update failed:', err);
      }
    });
  });

  // Custom rules list
  customList.innerHTML = '';
  dashboardState.customRules.forEach(rule => {
    const item = document.createElement('div');
    item.style = 'display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:#f8fafc; border-radius:6px; border:1px solid #e2e8f0; font-size:12px;';
    item.innerHTML = `
      <span>
        <strong style="color:#ef4444;">[${rule.rule_type.toUpperCase()}]</strong>
        <span style="color:#1e293b; font-family:monospace; margin-left:6px;">${rule.pattern}</span>
      </span>
      <button class="delete-rule-btn" data-id="${rule.id}" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:14px;">✕</button>
    `;
    customList.appendChild(item);
  });

  customList.querySelectorAll('.delete-rule-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ruleId = btn.getAttribute('data-id');
      try {
        await fetch(`/api/filters/custom-rule/${ruleId}`, { method: 'DELETE' });
        showToast('Rule Deleted', 'Custom blocking rule removed.', 'info');
        loadChildData();
      } catch (err) {
        console.error('Delete rule failed:', err);
      }
    });
  });
}

document.getElementById('btn-add-custom-rule').addEventListener('click', async () => {
  const input = document.getElementById('custom-rule-input');
  const typeSelect = document.getElementById('custom-rule-type');
  const pattern = input.value.trim();
  if (!pattern) return;

  try {
    await fetch('/api/filters/custom-rule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: CHILD_ID, ruleType: typeSelect.value, pattern })
    });
    input.value = '';
    showToast('Rule Added', `Blocked pattern: ${pattern}`, 'info');
    loadChildData();
  } catch (err) {
    console.error('Add rule failed:', err);
  }
});

// 9. Interactive Map & Location (FR-07)
function initOrUpdateMap(latestLocation) {
  const curPos = latestLocation ? { lat: latestLocation.latitude, lng: latestLocation.longitude } : { lat: 37.7833, lng: -122.4167 };

  if (!dashboardState.map) {
    dashboardState.map = new GuardianMap('guardian-map-container', {
      centerLat: curPos.lat,
      centerLng: curPos.lng,
      currentPosition: curPos,
      geofences: dashboardState.geofences,
      history: []
    });
  } else {
    dashboardState.map.updateData({
      currentPosition: curPos,
      geofences: dashboardState.geofences
    });
  }

  // Update card location name
  if (latestLocation) {
    document.getElementById('card-location-val').innerText = latestLocation.address || 'Active GPS';
  }

  renderGeofencesList();
  loadLocationHistory();
}

function renderGeofencesList() {
  const list = document.getElementById('geofences-list');
  if (!list) return;
  list.innerHTML = '';

  dashboardState.geofences.forEach(gf => {
    const item = document.createElement('div');
    item.style = 'padding:10px 12px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;';
    item.innerHTML = `
      <div>
        <div style="font-weight:600; font-size:13px; color:#1e293b;">🛡️ ${gf.name}</div>
        <div style="font-size:11px; color:#64748b;">Radius: ${gf.radius_meters}m • Alerts: Enter & Exit</div>
      </div>
      <button class="del-gf-btn" data-id="${gf.id}" style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:14px;">✕</button>
    `;
    list.appendChild(item);
  });

  list.querySelectorAll('.del-gf-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const gfId = btn.getAttribute('data-id');
      try {
        await fetch(`/api/geofences/${gfId}`, { method: 'DELETE' });
        showToast('Safe Zone Removed', 'Geofence deleted.', 'info');
        loadChildData();
      } catch (err) {
        console.error('Delete geofence failed:', err);
      }
    });
  });
}

document.getElementById('btn-add-geofence').addEventListener('click', async () => {
  const name = document.getElementById('gf-name-input').value.trim();
  const lat = Number(document.getElementById('gf-lat-input').value);
  const lng = Number(document.getElementById('gf-lng-input').value);
  if (!name || isNaN(lat) || isNaN(lng)) {
    alert('Please enter zone name, latitude and longitude');
    return;
  }

  try {
    await fetch('/api/geofences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: CHILD_ID, name, latitude: lat, longitude: lng, radiusMeters: 250 })
    });
    document.getElementById('gf-name-input').value = '';
    document.getElementById('gf-lat-input').value = '';
    document.getElementById('gf-lng-input').value = '';
    showToast('Safe Zone Created', `Geofence "${name}" is now monitored.`, 'info');
    loadChildData();
  } catch (err) {
    console.error('Add geofence failed:', err);
  }
});

async function loadLocationHistory() {
  try {
    const res = await fetch(`/api/location/history?childId=${CHILD_ID}`);
    const data = await res.json();
    const list = document.getElementById('location-history-list');
    if (!list || !data.logs) return;

    list.innerHTML = '';
    data.logs.slice(0, 5).forEach(log => {
      const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const row = document.createElement('div');
      row.style = 'padding:6px 8px; border-bottom:1px solid #f1f5f9;';
      row.innerHTML = `<strong>${time}</strong> - ${log.address || 'GPS Coordinate'}`;
      list.appendChild(row);
    });

    if (dashboardState.map) {
      dashboardState.map.updateData({ history: data.logs.reverse() });
    }
  } catch (err) {
    console.error('History load failed:', err);
  }
}

document.getElementById('btn-refresh-location').addEventListener('click', () => {
  loadChildData();
  showToast('GPS Telemetry Refreshed', 'Latest satellite fixes loaded.', 'info');
});

// 10. Render Alerts (FR-08)
function renderAlerts() {
  const tbody = document.getElementById('alerts-table-body');
  const feed = document.getElementById('overview-recent-alerts');
  const unreadBadge = document.getElementById('unread-alert-badge');
  const cardAlertsVal = document.getElementById('card-alerts-val');

  const unreadCount = dashboardState.alerts.filter(a => !a.is_read).length;
  if (unreadBadge) unreadBadge.innerText = unreadCount;
  if (cardAlertsVal) cardAlertsVal.innerText = unreadCount;

  // Alerts tab table
  if (tbody) {
    tbody.innerHTML = '';
    dashboardState.alerts.forEach(alert => {
      const time = new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <span class="badge-pill" style="background:${alert.severity === 'critical' ? '#fee2e2' : alert.severity === 'warning' ? '#fef3c7' : '#e0f2fe'}; color:${alert.severity === 'critical' ? '#dc2626' : alert.severity === 'warning' ? '#d97706' : '#0284c7'};">
            ${alert.severity.toUpperCase()}
          </span>
        </td>
        <td style="font-weight:600;">${alert.title}</td>
        <td>${alert.message}</td>
        <td style="color:#64748b; font-size:12px;">${time}</td>
        <td>
          <span style="font-size:11px; color:${alert.is_read ? '#94a3b8' : '#10b981'}; font-weight:600;">
            ${alert.is_read ? 'Read' : '● New'}
          </span>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Dashboard Overview recent alerts list
  if (feed) {
    feed.innerHTML = '';
    dashboardState.alerts.slice(0, 4).forEach(alert => {
      const item = document.createElement('div');
      item.style = `padding:10px 12px; border-radius:8px; font-size:12px; border-left:4px solid ${alert.severity === 'critical' ? '#dc2626' : alert.severity === 'warning' ? '#f59e0b' : '#38bdf8'}; background:#f8fafc;`;
      item.innerHTML = `
        <div style="font-weight:600; color:#1e293b; margin-bottom:2px;">${alert.title}</div>
        <div style="color:#64748b; font-size:11px;">${alert.message}</div>
      `;
      feed.appendChild(item);
    });
  }
}

async function markAllAlertsRead() {
  try {
    await fetch('/api/alerts/mark-read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    showToast('Alerts Cleared', 'All alerts marked as read.', 'info');
    loadAlerts();
  } catch (err) {
    console.error('Mark read failed:', err);
  }
}

document.getElementById('btn-mark-all-read').addEventListener('click', markAllAlertsRead);
document.getElementById('btn-quick-mark-read').addEventListener('click', markAllAlertsRead);

// 11. Real-time Server-Sent Events (SSE) Listener (FR-08, NFR-02)
function setupSSE() {
  const es = new EventSource('/api/stream');

  es.addEventListener('new_alert', (e) => {
    const alert = JSON.parse(e.data);
    showToast(alert.title, alert.message, alert.severity || 'warning');
    loadAlerts();
  });

  es.addEventListener('sos_alert', (e) => {
    const alert = JSON.parse(e.data);
    showToast('🚨 SOS EMERGENCY RECEIVED!', alert.message, 'critical');
    loadAlerts();
    loadChildData();
  });

  es.addEventListener('heartbeat', (e) => {
    const data = JSON.parse(e.data);
    if (data.currentApp) {
      document.getElementById('banner-active-app').innerText = data.currentApp;
      document.getElementById('card-active-app-val').innerText = data.currentApp;
    }
    if (data.batteryLevel) {
      document.getElementById('banner-battery').innerText = `${data.batteryLevel}%`;
    }
  });

  es.addEventListener('location_updated', (e) => {
    const data = JSON.parse(e.data);
    if (dashboardState.map) {
      dashboardState.map.updateData({
        currentPosition: { lat: data.latitude, lng: data.longitude }
      });
      document.getElementById('card-location-val').innerText = data.address || 'Active GPS';
    }
  });

  es.addEventListener('usage_updated', () => {
    loadChildData();
  });

  es.addEventListener('device_lock_state', () => {
    loadChildData();
  });

  es.addEventListener('demo_reset', () => {
    loadChildData();
    loadAlerts();
  });
}

// Initial Data Initialization
loadChildData();
loadAlerts();
setupSSE();

