// database.js - SQLite Database Manager for Parental Control System
// Built using Node 22 native SQLite (DatabaseSync)
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const crypto = require('node:crypto');

const DB_PATH = path.join(__dirname, 'guardiansafe.db');
const db = new DatabaseSync(DB_PATH);

// Helper for hashing passwords
function hashPassword(password, salt = null) {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, storedHash) {
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === storedHash;
}

// Initialize tables according to SRS entity specifications
function initDatabase() {
  db.exec(`
    PRAGMA foreign_keys = ON;

    -- Users (Parents) Table (FR-01, FR-02)
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      phone TEXT,
      role TEXT DEFAULT 'parent',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Children Table
    CREATE TABLE IF NOT EXISTS children (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Devices Table (FR-09)
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL,
      device_name TEXT NOT NULL,
      model TEXT DEFAULT 'Pixel 7a (Android 14)',
      pairing_code TEXT UNIQUE,
      is_paired INTEGER DEFAULT 1,
      is_locked INTEGER DEFAULT 0,
      battery_level INTEGER DEFAULT 85,
      current_app TEXT DEFAULT 'Home Screen',
      last_heartbeat DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
    );

    -- Screen Time Rules (FR-04)
    CREATE TABLE IF NOT EXISTS screen_time_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER UNIQUE NOT NULL,
      daily_limit_minutes INTEGER DEFAULT 120, -- default 2 hours
      curfew_start TEXT DEFAULT '21:00',      -- 9:00 PM
      curfew_end TEXT DEFAULT '06:30',        -- 6:30 AM
      curfew_enabled INTEGER DEFAULT 1,
      is_locked INTEGER DEFAULT 0,
      bonus_minutes_today INTEGER DEFAULT 0,
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
    );

    -- Application Restrictions (FR-05)
    CREATE TABLE IF NOT EXISTS app_restrictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL,
      package_name TEXT NOT NULL,
      app_name TEXT NOT NULL,
      category TEXT NOT NULL,
      is_blocked INTEGER DEFAULT 0,
      daily_limit_minutes INTEGER DEFAULT 0, -- 0 means no per-app limit
      time_used_today INTEGER DEFAULT 0,
      icon TEXT,
      UNIQUE(child_id, package_name),
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
    );

    -- Content Filter Categories & Custom Keywords (FR-06)
    CREATE TABLE IF NOT EXISTS content_filters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      is_blocked INTEGER DEFAULT 1,
      UNIQUE(child_id, category),
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS custom_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL,
      rule_type TEXT NOT NULL, -- 'keyword' or 'url'
      pattern TEXT NOT NULL,
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
    );

    -- Location Logs & Geofences (FR-07)
    CREATE TABLE IF NOT EXISTS location_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      accuracy REAL DEFAULT 5.0,
      speed REAL DEFAULT 0.0,
      address TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS geofences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      radius_meters REAL DEFAULT 200,
      alert_on_exit INTEGER DEFAULT 1,
      alert_on_enter INTEGER DEFAULT 1,
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
    );

    -- Application Usage Logs (FR-03, FR-09)
    CREATE TABLE IF NOT EXISTS app_usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL,
      package_name TEXT NOT NULL,
      app_name TEXT NOT NULL,
      category TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL,
      usage_date TEXT NOT NULL, -- YYYY-MM-DD
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
    );

    -- Notification Alerts (FR-08, FR-09)
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER NOT NULL,
      child_id INTEGER,
      device_id INTEGER,
      alert_type TEXT NOT NULL, -- 'LIMIT_REACHED', 'APP_BLOCKED_ATTEMPT', 'CONTENT_FILTERED', 'GEOFENCE_EXIT', 'SOS_EMERGENCY', 'BATTERY_LOW'
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT DEFAULT 'warning', -- 'info', 'warning', 'critical'
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  seedDefaultData();
}

// Seed realistic demo data for college evaluation demonstration
function seedDefaultData() {
  const userCheck = db.prepare('SELECT count(*) as count FROM users').get();
  if (userCheck.count > 0) return; // already seeded

  console.log('Seeding initial college demo data into SQLite...');

  // 1. Create default demo parent
  const { salt, hash } = hashPassword('parent123');
  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password_hash, salt, phone, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const parentRes = insertUser.run('Sarah Jenkins', 'parent@example.com', hash, salt, '+1 (555) 234-5678', 'parent');
  const parentId = Number(parentRes.lastInsertRowid);

  // 2. Create child profile (Alex Jenkins, 12 years old)
  const insertChild = db.prepare(`
    INSERT INTO children (parent_id, name, age, avatar)
    VALUES (?, ?, ?, ?)
  `);
  const childRes = insertChild.run(parentId, 'Alex Jenkins', 12, '👦');
  const childId = Number(childRes.lastInsertRowid);

  // 3. Create child device
  const insertDevice = db.prepare(`
    INSERT INTO devices (child_id, device_name, model, pairing_code, is_paired, is_locked, battery_level, current_app)
    VALUES (?, ?, ?, ?, 1, 0, 78, 'YouTube')
  `);
  const deviceRes = insertDevice.run(childId, "Alex's Pixel 7a", 'Google Pixel 7a (Android 14)', '123456');
  const deviceId = Number(deviceRes.lastInsertRowid);

  // 4. Screen time rules: 2 hours (120 mins) daily limit, curfew 21:00 to 06:30
  db.prepare(`
    INSERT INTO screen_time_rules (child_id, daily_limit_minutes, curfew_start, curfew_end, curfew_enabled, is_locked, bonus_minutes_today)
    VALUES (?, 120, '21:00', '06:30', 1, 0, 0)
  `).run(childId);

  // 5. App Restrictions list (installed apps on child's phone)
  const apps = [
    { pkg: 'com.google.android.youtube', name: 'YouTube', category: 'Entertainment', blocked: 0, limit: 45, used: 25, icon: '▶️' },
    { pkg: 'com.zhiliaoapp.musically', name: 'TikTok', category: 'Social Media', blocked: 1, limit: 0, used: 0, icon: '🎵' },
    { pkg: 'com.instagram.android', name: 'Instagram', category: 'Social Media', blocked: 1, limit: 0, used: 0, icon: '📸' },
    { pkg: 'com.mojang.minecraftpe', name: 'Minecraft', category: 'Games', blocked: 0, limit: 60, used: 35, icon: '⛏️' },
    { pkg: 'com.roblox.client', name: 'Roblox', category: 'Games', blocked: 0, limit: 40, used: 15, icon: '🎮' },
    { pkg: 'com.android.chrome', name: 'Google Chrome', category: 'Browser', blocked: 0, limit: 0, used: 12, icon: '🌐' },
    { pkg: 'com.whatsapp', name: 'WhatsApp', category: 'Communication', blocked: 0, limit: 0, used: 18, icon: '💬' },
    { pkg: 'org.khanacademy.android', name: 'Khan Academy', category: 'Education', blocked: 0, limit: 0, used: 30, icon: '📚' }
  ];

  const insertApp = db.prepare(`
    INSERT INTO app_restrictions (child_id, package_name, app_name, category, is_blocked, daily_limit_minutes, time_used_today, icon)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const app of apps) {
    insertApp.run(childId, app.pkg, app.name, app.category, app.blocked, app.limit, app.used, app.icon);
  }

  // 6. Content Filtering Categories
  const categories = [
    { cat: 'Adult & Explicit', blocked: 1 },
    { cat: 'Violence & Weapons', blocked: 1 },
    { cat: 'Gambling & Betting', blocked: 1 },
    { cat: 'Malware & Phishing', blocked: 1 },
    { cat: 'Social Media Web', blocked: 0 }
  ];
  const insertFilter = db.prepare(`
    INSERT INTO content_filters (child_id, category, is_blocked)
    VALUES (?, ?, ?)
  `);
  for (const c of categories) {
    insertFilter.run(childId, c.cat, c.blocked);
  }

  // Custom keywords/domains
  const insertCustom = db.prepare(`
    INSERT INTO custom_rules (child_id, rule_type, pattern)
    VALUES (?, ?, ?)
  `);
  insertCustom.run(childId, 'keyword', 'casino');
  insertCustom.run(childId, 'keyword', 'free robux hack');
  insertCustom.run(childId, 'url', 'omegle.com');
  insertCustom.run(childId, 'url', 'discord.gg');

  // 7. Geofences
  const insertGeofence = db.prepare(`
    INSERT INTO geofences (child_id, name, latitude, longitude, radius_meters, alert_on_exit, alert_on_enter)
    VALUES (?, ?, ?, ?, ?, 1, 1)
  `);
  insertGeofence.run(childId, 'Home', 37.7749, -122.4194, 250);
  insertGeofence.run(childId, 'Oak Creek Middle School', 37.7833, -122.4167, 300);
  insertGeofence.run(childId, 'Community Sports Park', 37.7690, -122.4467, 200);

  // 8. Location history logs
  const today = new Date().toISOString();
  const insertLoc = db.prepare(`
    INSERT INTO location_logs (device_id, latitude, longitude, accuracy, speed, address, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertLoc.run(deviceId, 37.7749, -122.4194, 4.2, 0.0, '124 Maple St (Home)', today);
  insertLoc.run(deviceId, 37.7785, -122.4180, 5.0, 3.2, 'Transit on 5th Ave', today);
  insertLoc.run(deviceId, 37.7833, -122.4167, 3.8, 0.0, 'Oak Creek Middle School', today);

  // 9. Initial Usage logs for analytics
  const dateStr = new Date().toISOString().split('T')[0];
  const insertUsage = db.prepare(`
    INSERT INTO app_usage_logs (device_id, package_name, app_name, category, duration_seconds, usage_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertUsage.run(deviceId, 'org.khanacademy.android', 'Khan Academy', 'Education', 1800, dateStr);
  insertUsage.run(deviceId, 'com.mojang.minecraftpe', 'Minecraft', 'Games', 2100, dateStr);
  insertUsage.run(deviceId, 'com.google.android.youtube', 'YouTube', 'Entertainment', 1500, dateStr);
  insertUsage.run(deviceId, 'com.whatsapp', 'WhatsApp', 'Communication', 1080, dateStr);
  insertUsage.run(deviceId, 'com.roblox.client', 'Roblox', 'Games', 900, dateStr);

  // 10. Initial Alerts
  const insertAlert = db.prepare(`
    INSERT INTO alerts (parent_id, child_id, device_id, alert_type, title, message, severity, is_read)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertAlert.run(parentId, childId, deviceId, 'APP_BLOCKED_ATTEMPT', 'Blocked App Attempted', 'Alex attempted to open restricted app: TikTok.', 'warning', 0);
  insertAlert.run(parentId, childId, deviceId, 'GEOFENCE_ENTER', 'Geofence Arrival', 'Alex has safely arrived at Oak Creek Middle School.', 'info', 0);
  insertAlert.run(parentId, childId, deviceId, 'CONTENT_FILTERED', 'Inappropriate Content Blocked', 'Safe Search blocked a search query containing restricted keywords.', 'warning', 0);

  console.log('Database initialized and demo data ready!');
}

// Export database and helper operations
module.exports = {
  db,
  initDatabase,
  hashPassword,
  verifyPassword
};

