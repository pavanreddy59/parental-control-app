// server.js - Parental Control Application Server
// Built with native Node.js (v22+) and native SQLite (DatabaseSync)
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');
const { db, initDatabase, hashPassword, verifyPassword } = require('./database.js');

// Initialize database schema and initial data
initDatabase();

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Active Server-Sent Events (SSE) connections for real-time notification & remote control
const sseClients = new Set();

function broadcastEvent(eventType, data) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch (e) {
      sseClients.delete(res);
    }
  }
}

// In-memory token store for simplicity and security
const activeTokens = new Map();

function generateToken(userId) {
  const token = 'tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  activeTokens.set(token, { userId, created: Date.now() });
  return token;
}

function authenticateToken(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const session = activeTokens.get(token);
  if (!session) return null;
  return session.userId;
}

// Helper: Haversine distance formula to calculate distance between two GPS coordinates in meters
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const rad = Math.PI / 180;
  const φ1 = lat1 * rad;
  const φ2 = lat2 * rad;
  const Δφ = (lat2 - lat1) * rad;
  const Δλ = (lon2 - lon1) * rad;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Read body helper
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) { // 5MB guard
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

// MIME types lookup
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Main HTTP request router
const handleRequest = async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    });
    return res.end();
  }

  // --- Real-time SSE Stream (FR-08) ---
  if (pathname === '/api/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('event: connected\ndata: {"status":"connected"}\n\n');
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // ==================== REST API ENDPOINTS ====================

  try {
    // 1. Auth APIs (FR-01, FR-02)
    if (pathname === '/api/auth/register' && method === 'POST') {
      const { name, email, password, phone } = await parseBody(req);
      if (!name || !email || !password) {
        return sendJson(res, 400, { error: 'Name, email, and password are required' });
      }
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existing) {
        return sendJson(res, 409, { error: 'An account with this email already exists' });
      }
      const { salt, hash } = hashPassword(password);
      const result = db.prepare(`
        INSERT INTO users (name, email, password_hash, salt, phone, role)
        VALUES (?, ?, ?, ?, ?, 'parent')
      `).run(name, email, hash, salt, phone || null);

      const userId = Number(result.lastInsertRowid);
      const token = generateToken(userId);
      return sendJson(res, 201, {
        message: 'Registration successful',
        token,
        user: { id: userId, name, email, role: 'parent' }
      });
    }

    if (pathname === '/api/auth/login' && method === 'POST') {
      const { email, password } = await parseBody(req);
      if (!email || !password) {
        return sendJson(res, 400, { error: 'Email and password are required' });
      }
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user || !verifyPassword(password, user.salt, user.password_hash)) {
        return sendJson(res, 401, { error: 'Invalid email or password' });
      }
      const token = generateToken(user.id);
      return sendJson(res, 200, {
        message: 'Login successful',
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
      });
    }

    if (pathname === '/api/auth/me' && method === 'GET') {
      const userId = authenticateToken(req) || 1; // default to demo parent if not supplied
      const user = db.prepare('SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?').get(userId);
      if (!user) return sendJson(res, 404, { error: 'User not found' });
      return sendJson(res, 200, { user });
    }

    // 2. Children & Devices Management
    if (pathname === '/api/children' && method === 'GET') {
      const parentId = authenticateToken(req) || 1;
      const children = db.prepare(`
        SELECT c.*, d.id as device_id, d.device_name, d.model, d.battery_level, d.is_locked, d.current_app, d.last_heartbeat
        FROM children c
        LEFT JOIN devices d ON c.id = d.child_id
        WHERE c.parent_id = ?
      `).all(parentId);
      return sendJson(res, 200, { children });
    }

    if (pathname === '/api/children' && method === 'POST') {
      const parentId = authenticateToken(req) || 1;
      const { name, age, avatar } = await parseBody(req);
      if (!name || !age) {
        return sendJson(res, 400, { error: 'Name and age are required' });
      }
      const resChild = db.prepare(`
        INSERT INTO children (parent_id, name, age, avatar)
        VALUES (?, ?, ?, ?)
      `).run(parentId, name, Number(age), avatar || '🧒');
      const childId = Number(resChild.lastInsertRowid);

      // Auto-assign default screen time rules
      db.prepare(`
        INSERT INTO screen_time_rules (child_id, daily_limit_minutes, curfew_start, curfew_end)
        VALUES (?, 120, '21:00', '06:30')
      `).run(childId);

      // Auto-create a virtual device with a unique pairing code
      const pairingCode = Math.floor(100000 + Math.random() * 900000).toString();
      db.prepare(`
        INSERT INTO devices (child_id, device_name, pairing_code, is_paired)
        VALUES (?, ?, ?, 1)
      `).run(childId, `${name}'s Android Phone`, pairingCode);

      return sendJson(res, 201, { childId, message: 'Child profile created successfully' });
    }

    if (pathname === '/api/children/details' && method === 'GET') {
      const childId = Number(reqUrl.searchParams.get('childId') || 1);
      const child = db.prepare('SELECT * FROM children WHERE id = ?').get(childId);
      if (!child) return sendJson(res, 404, { error: 'Child not found' });

      const device = db.prepare('SELECT * FROM devices WHERE child_id = ?').get(childId);
      const rules = db.prepare('SELECT * FROM screen_time_rules WHERE child_id = ?').get(childId);
      const apps = db.prepare('SELECT * FROM app_restrictions WHERE child_id = ? ORDER BY time_used_today DESC').all(childId);
      const filters = db.prepare('SELECT * FROM content_filters WHERE child_id = ?').all(childId);
      const customRules = db.prepare('SELECT * FROM custom_rules WHERE child_id = ?').all(childId);
      const geofences = db.prepare('SELECT * FROM geofences WHERE child_id = ?').all(childId);
      const latestLocation = device ? db.prepare('SELECT * FROM location_logs WHERE device_id = ? ORDER BY id DESC LIMIT 1').get(device.id) : null;

      // Calculate total screen time used today (sum of app durations)
      const dateStr = new Date().toISOString().split('T')[0];
      const usageToday = device ? db.prepare(`
        SELECT SUM(duration_seconds) as total_seconds
        FROM app_usage_logs
        WHERE device_id = ? AND usage_date = ?
      `).get(device.id, dateStr) : { total_seconds: 0 };

      const totalMinutesUsed = Math.floor((usageToday?.total_seconds || 0) / 60);

      return sendJson(res, 200, {
        child,
        device,
        rules,
        apps,
        filters,
        customRules,
        geofences,
        latestLocation,
        totalMinutesUsed
      });
    }

    // 3. Screen Time Management (FR-04)
    if (pathname === '/api/screen-time' && method === 'POST') {
      const { childId, dailyLimitMinutes, curfewStart, curfewEnd, curfewEnabled } = await parseBody(req);
      if (!childId) return sendJson(res, 400, { error: 'childId is required' });

      db.prepare(`
        UPDATE screen_time_rules
        SET daily_limit_minutes = COALESCE(?, daily_limit_minutes),
            curfew_start = COALESCE(?, curfew_start),
            curfew_end = COALESCE(?, curfew_end),
            curfew_enabled = COALESCE(?, curfew_enabled)
        WHERE child_id = ?
      `).run(dailyLimitMinutes, curfewStart, curfewEnd, curfewEnabled !== undefined ? (curfewEnabled ? 1 : 0) : null, childId);

      broadcastEvent('screen_time_updated', { childId, dailyLimitMinutes, curfewStart, curfewEnd });
      return sendJson(res, 200, { message: 'Screen time rules updated' });
    }

    // Remote instant lock/unlock toggle
    if (pathname === '/api/screen-time/toggle-lock' && method === 'POST') {
      const { childId, lock } = await parseBody(req);
      if (!childId) return sendJson(res, 400, { error: 'childId is required' });

      const newLockState = lock ? 1 : 0;
      db.prepare('UPDATE screen_time_rules SET is_locked = ? WHERE child_id = ?').run(newLockState, childId);
      db.prepare('UPDATE devices SET is_locked = ? WHERE child_id = ?').run(newLockState, childId);

      // Create an alert record
      const child = db.prepare('SELECT name, parent_id FROM children WHERE id = ?').get(childId);
      const title = newLockState ? 'Device Remotely Locked' : 'Device Remotely Unlocked';
      const message = newLockState ? `Parent engaged remote lock on ${child.name}'s phone.` : `Parent released remote lock on ${child.name}'s phone.`;
      
      db.prepare(`
        INSERT INTO alerts (parent_id, child_id, alert_type, title, message, severity)
        VALUES (?, ?, 'REMOTE_LOCK', ?, ?, 'info')
      `).run(child.parent_id, childId, title, message);

      broadcastEvent('device_lock_state', { childId, isLocked: newLockState });
      broadcastEvent('new_alert', { title, message, severity: 'info' });

      return sendJson(res, 200, { message: `Device ${newLockState ? 'locked' : 'unlocked'} successfully`, isLocked: newLockState });
    }

    // Grant bonus screen time (+15, +30 min)
    if (pathname === '/api/screen-time/grant-bonus' && method === 'POST') {
      const { childId, minutes } = await parseBody(req);
      const bonus = Number(minutes) || 15;
      db.prepare('UPDATE screen_time_rules SET bonus_minutes_today = bonus_minutes_today + ? WHERE child_id = ?').run(bonus, childId);
      broadcastEvent('bonus_granted', { childId, bonusMinutes: bonus });
      return sendJson(res, 200, { message: `Granted ${bonus} minutes bonus time` });
    }

    // 4. Application Restrictions (FR-05)
    if (pathname === '/api/restrictions/toggle-block' && method === 'POST') {
      const { childId, packageName, isBlocked } = await parseBody(req);
      if (!childId || !packageName) return sendJson(res, 400, { error: 'childId and packageName are required' });

      db.prepare('UPDATE app_restrictions SET is_blocked = ? WHERE child_id = ? AND package_name = ?')
        .run(isBlocked ? 1 : 0, childId, packageName);

      broadcastEvent('app_restriction_updated', { childId, packageName, isBlocked });
      return sendJson(res, 200, { message: `App status updated` });
    }

    if (pathname === '/api/restrictions/set-limit' && method === 'POST') {
      const { childId, packageName, dailyLimitMinutes } = await parseBody(req);
      db.prepare('UPDATE app_restrictions SET daily_limit_minutes = ? WHERE child_id = ? AND package_name = ?')
        .run(Number(dailyLimitMinutes), childId, packageName);

      broadcastEvent('app_limit_updated', { childId, packageName, dailyLimitMinutes });
      return sendJson(res, 200, { message: 'App limit set' });
    }

    // Check if app is allowed (called when child launches an app)
    if (pathname === '/api/restrictions/check-allowed' && method === 'POST') {
      const { childId, packageName } = await parseBody(req);
      const app = db.prepare('SELECT * FROM app_restrictions WHERE child_id = ? AND package_name = ?').get(childId, packageName);
      const rules = db.prepare('SELECT * FROM screen_time_rules WHERE child_id = ?').get(childId);
      const child = db.prepare('SELECT name, parent_id FROM children WHERE id = ?').get(childId);

      // Check remote lock
      if (rules && rules.is_locked) {
        return sendJson(res, 200, { allowed: false, reason: 'Device is remotely locked by parent.' });
      }

      // Check curfew
      if (rules && rules.curfew_enabled) {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const isCurfew = (rules.curfew_start > rules.curfew_end)
          ? (currentTime >= rules.curfew_start || currentTime < rules.curfew_end)
          : (currentTime >= rules.curfew_start && currentTime < rules.curfew_end);

        if (isCurfew) {
          return sendJson(res, 200, { allowed: false, reason: `Curfew is active (${rules.curfew_start} - ${rules.curfew_end}). Device is restricted.` });
        }
      }

      // Check app blocked
      if (app && app.is_blocked) {
        // Raise alert to parent!
        const title = 'Blocked App Attempted';
        const message = `${child?.name || 'Child'} attempted to launch blocked app: ${app.app_name}`;
        db.prepare(`
          INSERT INTO alerts (parent_id, child_id, alert_type, title, message, severity)
          VALUES (?, ?, 'APP_BLOCKED_ATTEMPT', ?, ?, 'warning')
        `).run(child?.parent_id || 1, childId, title, message);

        broadcastEvent('new_alert', { title, message, severity: 'warning' });
        return sendJson(res, 200, { allowed: false, reason: `${app.app_name} is restricted by parental controls.` });
      }

      // Check per-app daily limit
      if (app && app.daily_limit_minutes > 0 && app.time_used_today >= app.daily_limit_minutes) {
        return sendJson(res, 200, { allowed: false, reason: `Daily limit of ${app.daily_limit_minutes} minutes reached for ${app.app_name}.` });
      }

      return sendJson(res, 200, { allowed: true });
    }

    // 5. Content Filtering (FR-06)
    if (pathname === '/api/filters/toggle-category' && method === 'POST') {
      const { childId, category, isBlocked } = await parseBody(req);
      db.prepare('UPDATE content_filters SET is_blocked = ? WHERE child_id = ? AND category = ?')
        .run(isBlocked ? 1 : 0, childId, category);

      broadcastEvent('content_filter_updated', { childId, category, isBlocked });
      return sendJson(res, 200, { message: 'Category filter updated' });
    }

    if (pathname === '/api/filters/custom-rule' && method === 'POST') {
      const { childId, ruleType, pattern } = await parseBody(req);
      if (!childId || !pattern) return sendJson(res, 400, { error: 'childId and pattern are required' });

      db.prepare('INSERT INTO custom_rules (child_id, rule_type, pattern) VALUES (?, ?, ?)')
        .run(childId, ruleType || 'keyword', pattern.toLowerCase().trim());

      broadcastEvent('content_filter_updated', { childId });
      return sendJson(res, 201, { message: 'Custom rule added' });
    }

    if (pathname.startsWith('/api/filters/custom-rule/') && method === 'DELETE') {
      const ruleId = pathname.split('/').pop();
      db.prepare('DELETE FROM custom_rules WHERE id = ?').run(ruleId);
      return sendJson(res, 200, { message: 'Custom rule deleted' });
    }

    // Real-time Content Filter Evaluation (called by child device Safe Browser)
    if (pathname === '/api/filters/evaluate' && method === 'POST') {
      const { childId, url, query } = await parseBody(req);
      const text = `${url || ''} ${query || ''}`.toLowerCase();

      // Check custom rules
      const customRules = db.prepare('SELECT * FROM custom_rules WHERE child_id = ?').all(childId || 1);
      for (const rule of customRules) {
        if (text.includes(rule.pattern.toLowerCase())) {
          // Log alert
          const child = db.prepare('SELECT name, parent_id FROM children WHERE id = ?').get(childId || 1);
          const title = 'Inappropriate Content Blocked';
          const message = `${child?.name || 'Child'} attempted to access prohibited keyword/site: "${rule.pattern}"`;
          db.prepare(`
            INSERT INTO alerts (parent_id, child_id, alert_type, title, message, severity)
            VALUES (?, ?, 'CONTENT_FILTERED', ?, ?, 'warning')
          `).run(child?.parent_id || 1, childId || 1, title, message);

          broadcastEvent('new_alert', { title, message, severity: 'warning' });
          return sendJson(res, 200, { allowed: false, reason: `Matched blocked keyword/domain: "${rule.pattern}"` });
        }
      }

      // Check category dictionaries
      const activeFilters = db.prepare('SELECT * FROM content_filters WHERE child_id = ? AND is_blocked = 1').all(childId || 1);
      const categoryKeywords = {
        'Adult & Explicit': ['porn', 'xxx', 'adult', 'nsfw', 'sex', 'nude', 'erotic'],
        'Violence & Weapons': ['guns', 'weapons', 'bomb', 'murder', 'gore', 'suicide', 'assault'],
        'Gambling & Betting': ['casino', 'betting', 'poker', 'slots', 'jackpot', 'lottery'],
        'Malware & Phishing': ['crack', 'keygen', 'warez', 'hack tool', 'free v-bucks', 'free robux generator']
      };

      for (const filter of activeFilters) {
        const words = categoryKeywords[filter.category] || [];
        for (const w of words) {
          if (text.includes(w)) {
            const child = db.prepare('SELECT name, parent_id FROM children WHERE id = ?').get(childId || 1);
            const title = 'Content Filter Violation';
            const message = `${child?.name || 'Child'} attempted to view prohibited content under category: ${filter.category}`;
            db.prepare(`
              INSERT INTO alerts (parent_id, child_id, alert_type, title, message, severity)
              VALUES (?, ?, 'CONTENT_FILTERED', ?, ?, 'warning')
            `).run(child?.parent_id || 1, childId || 1, title, message);

            broadcastEvent('new_alert', { title, message, severity: 'warning' });
            return sendJson(res, 200, { allowed: false, reason: `Blocked under category: ${filter.category} (matched "${w}")` });
          }
        }
      }

      return sendJson(res, 200, { allowed: true });
    }

    // 6. Location Tracking & Geofencing (FR-07)
    if (pathname === '/api/location/update' && method === 'POST') {
      const { deviceId, childId, latitude, longitude, speed, address } = await parseBody(req);
      if (!latitude || !longitude) return sendJson(res, 400, { error: 'Coordinates required' });

      const dId = deviceId || 1;
      const cId = childId || 1;

      // Log location
      db.prepare(`
        INSERT INTO location_logs (device_id, latitude, longitude, speed, address)
        VALUES (?, ?, ?, ?, ?)
      `).run(dId, latitude, longitude, speed || 0, address || 'Live GPS Track');

      // Check Geofences
      const geofences = db.prepare('SELECT * FROM geofences WHERE child_id = ?').all(cId);
      const child = db.prepare('SELECT name, parent_id FROM children WHERE id = ?').get(cId);

      for (const gf of geofences) {
        const dist = calculateDistanceMeters(latitude, longitude, gf.latitude, gf.longitude);
        const isInside = dist <= gf.radius_meters;

        // If newly exited
        if (!isInside && gf.alert_on_exit) {
          // (Can check previous position or raise alert if far)
        }
      }

      broadcastEvent('location_updated', { childId: cId, deviceId: dId, latitude, longitude, address });
      return sendJson(res, 200, { message: 'Location logged' });
    }

    if (pathname === '/api/location/history' && method === 'GET') {
      const childId = Number(reqUrl.searchParams.get('childId') || 1);
      const device = db.prepare('SELECT id FROM devices WHERE child_id = ?').get(childId);
      if (!device) return sendJson(res, 200, { logs: [] });

      const logs = db.prepare(`
        SELECT * FROM location_logs
        WHERE device_id = ?
        ORDER BY id DESC LIMIT 50
      `).all(device.id);

      return sendJson(res, 200, { logs });
    }

    if (pathname === '/api/geofences' && method === 'POST') {
      const { childId, name, latitude, longitude, radiusMeters } = await parseBody(req);
      const resGf = db.prepare(`
        INSERT INTO geofences (child_id, name, latitude, longitude, radius_meters)
        VALUES (?, ?, ?, ?, ?)
      `).run(childId, name, latitude, longitude, radiusMeters || 200);

      broadcastEvent('geofences_updated', { childId });
      return sendJson(res, 201, { id: Number(resGf.lastInsertRowid), message: 'Geofence created' });
    }

    if (pathname.startsWith('/api/geofences/') && method === 'DELETE') {
      const gfId = pathname.split('/').pop();
      db.prepare('DELETE FROM geofences WHERE id = ?').run(gfId);
      return sendJson(res, 200, { message: 'Geofence removed' });
    }

    // 7. App Usage Logging (FR-03)
    if (pathname === '/api/usage/log' && method === 'POST') {
      const { deviceId, childId, packageName, appName, category, durationSeconds } = await parseBody(req);
      const dateStr = new Date().toISOString().split('T')[0];

      db.prepare(`
        INSERT INTO app_usage_logs (device_id, package_name, app_name, category, duration_seconds, usage_date)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(deviceId || 1, packageName, appName, category || 'Apps', durationSeconds || 60, dateStr);

      // Increment time_used_today on restriction record
      const durationMins = Math.ceil((durationSeconds || 60) / 60);
      db.prepare(`
        UPDATE app_restrictions
        SET time_used_today = time_used_today + ?
        WHERE child_id = ? AND package_name = ?
      `).run(durationMins, childId || 1, packageName);

      broadcastEvent('usage_updated', { childId: childId || 1, packageName, durationMins });
      return sendJson(res, 200, { message: 'Usage recorded' });
    }

    // Device Heartbeat & Foreground App
    if (pathname === '/api/devices/heartbeat' && method === 'POST') {
      const { deviceId, batteryLevel, currentApp } = await parseBody(req);
      db.prepare(`
        UPDATE devices
        SET battery_level = COALESCE(?, battery_level),
            current_app = COALESCE(?, current_app),
            last_heartbeat = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(batteryLevel, currentApp, deviceId || 1);

      // Low battery alert
      if (batteryLevel && batteryLevel <= 15) {
        const device = db.prepare('SELECT child_id FROM devices WHERE id = ?').get(deviceId || 1);
        const child = db.prepare('SELECT name, parent_id FROM children WHERE id = ?').get(device?.child_id || 1);
        const title = 'Low Battery Warning';
        const message = `${child?.name || 'Child'}'s device battery has dropped to ${batteryLevel}%.`;
        db.prepare(`
          INSERT INTO alerts (parent_id, child_id, device_id, alert_type, title, message, severity)
          VALUES (?, ?, ?, 'BATTERY_LOW', ?, ?, 'warning')
        `).run(child?.parent_id || 1, child?.id || 1, deviceId || 1, title, message);

        broadcastEvent('new_alert', { title, message, severity: 'warning' });
      }

      broadcastEvent('heartbeat', { deviceId: deviceId || 1, batteryLevel, currentApp });
      return sendJson(res, 200, { status: 'ok' });
    }

    // 8. Alerts (FR-08)
    if (pathname === '/api/alerts' && method === 'GET') {
      const parentId = authenticateToken(req) || 1;
      const alerts = db.prepare(`
        SELECT * FROM alerts
        WHERE parent_id = ?
        ORDER BY id DESC LIMIT 50
      `).all(parentId);
      return sendJson(res, 200, { alerts });
    }

    if (pathname === '/api/alerts/mark-read' && method === 'POST') {
      const { alertId } = await parseBody(req);
      if (alertId) {
        db.prepare('UPDATE alerts SET is_read = 1 WHERE id = ?').run(alertId);
      } else {
        db.prepare('UPDATE alerts SET is_read = 1').run();
      }
      return sendJson(res, 200, { message: 'Alerts updated' });
    }

    // Child SOS Panic Button Trigger (FR-08)
    if (pathname === '/api/alerts/sos' && method === 'POST') {
      const { childId, latitude, longitude } = await parseBody(req);
      const child = db.prepare('SELECT name, parent_id FROM children WHERE id = ?').get(childId || 1);

      const title = 'EMERGENCY SOS TRIGGERED!';
      const message = `URGENT: ${child?.name || 'Child'} pressed the Panic / SOS button at (${latitude || '37.7749'}, ${longitude || '-122.4194'}).`;
      
      const resAlert = db.prepare(`
        INSERT INTO alerts (parent_id, child_id, alert_type, title, message, severity)
        VALUES (?, ?, 'SOS_EMERGENCY', ?, ?, 'critical')
      `).run(child?.parent_id || 1, childId || 1, title, message);

      const alertPayload = {
        id: Number(resAlert.lastInsertRowid),
        title,
        message,
        severity: 'critical',
        created_at: new Date().toISOString()
      };

      broadcastEvent('sos_alert', alertPayload);
      broadcastEvent('new_alert', alertPayload);

      return sendJson(res, 200, { message: 'SOS alert broadcasted to parents', alert: alertPayload });
    }

    // Demo reset API
    if (pathname === '/api/demo/reset' && method === 'POST') {
      // Clean and reseed
      db.exec(`
        DELETE FROM alerts;
        DELETE FROM app_usage_logs;
        DELETE FROM location_logs;
        DELETE FROM custom_rules;
        DELETE FROM content_filters;
        DELETE FROM app_restrictions;
        DELETE FROM screen_time_rules;
        DELETE FROM devices;
        DELETE FROM children;
        DELETE FROM users;
      `);
      // Re-init default demo seed
      const { initDatabase } = require('./database.js');
      initDatabase();
      broadcastEvent('demo_reset', { status: 'reset_complete' });
      return sendJson(res, 200, { message: 'Demo environment reset to pristine state' });
    }

  } catch (err) {
    console.error('API Error:', err);
    return sendJson(res, 500, { error: 'Internal server error', details: err.message });
  }

  // ==================== STATIC FILE SERVING ====================
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  const filePath = path.join(PUBLIC_DIR, safePath);

  // Check if file exists within public directory
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Access Denied');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // 404 Fallback
      res.writeHead(404, { 'Content-Type': 'text/html' });
      return res.end('<h1>404 Not Found</h1><p>The requested file does not exist.</p>');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
};

const server = http.createServer(handleRequest);

if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`GuardianPulse - Parental Control Application Server`);
    console.log(`Listening on http://localhost:${PORT} and http://127.0.0.1:${PORT}`);
    console.log(`====================================================`);
    console.log(`Access portals:`);
    console.log(`- Unified Split-Screen Demo: http://localhost:${PORT}/`);
    console.log(`- Parent Web Dashboard:      http://localhost:${PORT}/parent/`);
    console.log(`- Child Phone Simulator:     http://localhost:${PORT}/child/`);
    console.log(`====================================================`);
  });
}

module.exports = { server, handleRequest };
