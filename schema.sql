-- ======================================================================
-- GUARDIANPULSE: DATABASE SCHEMA DEFINITION (SQL DDL)
-- Target Engine: SQLite 3 / Android Room / Cloud RDBMS
-- Meets Specifications: FR-01, FR-02, FR-03, FR-04, FR-05, FR-06, FR-07, FR-08, FR-09
-- ======================================================================

PRAGMA foreign_keys = ON;

-- 1. Users (Parents & Guardians) Table (FR-01, FR-02, NFR-01)
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

-- 2. Children Profiles Table
CREATE TABLE IF NOT EXISTS children (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  avatar TEXT DEFAULT '👦',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Supervised Mobile Devices Table (FR-09)
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

-- 4. Screen-Time & Curfew Rules Table (FR-04)
CREATE TABLE IF NOT EXISTS screen_time_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER UNIQUE NOT NULL,
  daily_limit_minutes INTEGER DEFAULT 120, -- 2 hours default
  curfew_start TEXT DEFAULT '21:00',      -- 9:00 PM Bedtime
  curfew_end TEXT DEFAULT '06:30',        -- 6:30 AM Wakeup
  curfew_enabled INTEGER DEFAULT 1,
  is_locked INTEGER DEFAULT 0,
  bonus_minutes_today INTEGER DEFAULT 0,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- 5. Application Restrictions & Quotas Table (FR-05)
CREATE TABLE IF NOT EXISTS app_restrictions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  package_name TEXT NOT NULL,
  app_name TEXT NOT NULL,
  category TEXT NOT NULL,
  is_blocked INTEGER DEFAULT 0,
  daily_limit_minutes INTEGER DEFAULT 0, -- 0 indicates no per-app cap
  time_used_today INTEGER DEFAULT 0,
  icon TEXT,
  UNIQUE(child_id, package_name),
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- 6. Web Content Safety Filters Table (FR-06)
CREATE TABLE IF NOT EXISTS content_filters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  is_blocked INTEGER DEFAULT 1,
  UNIQUE(child_id, category),
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- 7. Custom Keyword & URL Blacklist Table (FR-06)
CREATE TABLE IF NOT EXISTS custom_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  rule_type TEXT NOT NULL CHECK(rule_type IN ('keyword', 'url')),
  pattern TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- 8. Geofences / Safe Zones Table (FR-07)
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

-- 9. GPS Location Telemetry Logs Table (FR-07, FR-09)
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

-- 10. Foreground Application Usage Logs Table (FR-03, FR-09)
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

-- 11. Security Alerts & Safety Logs Table (FR-08, FR-09)
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER NOT NULL,
  child_id INTEGER,
  device_id INTEGER,
  alert_type TEXT NOT NULL, -- 'LIMIT_REACHED', 'APP_BLOCKED_ATTEMPT', 'CONTENT_FILTERED', 'GEOFENCE_EXIT', 'SOS_EMERGENCY', 'BATTERY_LOW'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'warning' CHECK(severity IN ('info', 'warning', 'critical')),
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indices for Fast Performance (NFR-04)
CREATE INDEX IF NOT EXISTS idx_usage_date ON app_usage_logs(device_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_alerts_parent ON alerts(parent_id, is_read);
CREATE INDEX IF NOT EXISTS idx_location_device ON location_logs(device_id, timestamp);

