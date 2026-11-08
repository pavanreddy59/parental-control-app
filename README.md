# GuardianPulse — Parental Control Application

[![SRS Specification Compliance](https://img.shields.io/badge/SRS%20Compliance-10%2F10%20(100%25)-success?style=for-the-badge)](spec.md)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20Web-blue?style=for-the-badge)](#system-architecture)
[![Database](https://img.shields.io/badge/Database-SQLite%20(Room%20%2B%20Node%20Native)-indigo?style=for-the-badge)](#database-design)
[![Test Suite](https://img.shields.io/badge/Tests-All%20Passing-brightgreen?style=for-the-badge)](#automated-testing)

A full-stack, enterprise-grade **Parental Control System** built in strict compliance with the **Software Requirements Specification (`spec.md`)**.

GuardianPulse empowers parents to monitor and manage their children's smartphone usage responsibly through real-time activity monitoring, intelligent screen-time management, application restrictions, safe content filtering, GPS location tracking with geofences, and instant notification alerts.

---

## 📑 Table of Contents

- [Key Features & SRS Compliance](#key-features--srs-compliance)
- [System Architecture](#system-architecture)
- [Quick Start Guide (Running the Project)](#quick-start-guide-running-the-project)
- [Interactive Demonstration Modes](#interactive-demonstration-modes)
- [Android Studio Native Application (`android-app/`)](#android-studio-native-application)
- [Backend REST API & Server-Sent Events](#backend-rest-api--server-sent-events)
- [Database Schema (SQLite)](#database-schema-sqlite)
- [Automated Testing](#automated-testing)
- [Project Documentation Bundle](#project-documentation-bundle)

---

## 🎯 Key Features & SRS Compliance

Every requirement specified in `spec.md` is fully implemented and operational:

| Requirement ID | Specification Item | Implementation Detail | Status |
| :--- | :--- | :--- | :---: |
| **FR-01** | User Registration | Parent registration with email, phone, PBKDF2 password hashing + salt | **PASS** (100%) |
| **FR-02** | User Login | Secure credential authentication & session token validation | **PASS** (100%) |
| **FR-03** | App Usage Monitoring | Real-time foreground app tracking (`UsageStatsManager`), daily minutes & categories | **PASS** (100%) |
| **FR-04** | Screen-Time Management | Configurable daily limits, bedtime curfew hours, +15m bonus grants, remote instant lock | **PASS** (100%) |
| **FR-05** | Application Restriction | Searchable installed apps, one-click block toggles, per-app limits, lock screen overlay | **PASS** (100%) |
| **FR-06** | Content Filtering | Category filters (Adult, Violence, Gambling, Malware) + custom keyword/URL blacklist | **PASS** (100%) |
| **FR-07** | Location Tracking | Real-time GPS radar map, safe zone geofencing (Home, School, Park), breadcrumb trail | **PASS** (100%) |
| **FR-08** | Notification Alerts | Real-time Server-Sent Events (SSE) push, visual toasts, child SOS Panic trigger | **PASS** (100%) |
| **FR-09** | Data Storage | Relational SQLite database (`guardiansafe.db`) + Android Room local database | **PASS** (100%) |
| **FR-10** | Parent Dashboard | Web dashboard with live cards, quick toggles, charts, and device controls | **PASS** (100%) |

---

## 🏛️ System Architecture

GuardianPulse follows a clean 3-tier distributed architecture:

```
┌────────────────────────────────────────────────────────┐
│               GUARDIANPULSE ARCHITECTURE               │
└────────────────────────────────────────────────────────┘

    1. PARENT APPLICATION (Web Portal)
    ┌──────────────────────────────────────────────┐
    │  - Parent Dashboard (FR-10)                  │
    │  - Screen Time & Curfew Management (FR-04)   │
    │  - App Restrictions & Time Limits (FR-05)    │
    │  - Web Filtering & Safe Search Rules (FR-06) │
    │  - Interactive GPS Radar Map (FR-07)         │
    │  - Real-Time Alerts & Notification Log(FR-08)│
    └──────────────────────▲───────────────────────┘
                           │ HTTP / REST + Server-Sent Events (SSE)
                           ▼
    2. CLOUD BACKEND & DATABASE SERVER
    ┌──────────────────────────────────────────────┐
    │  - Node.js High-Performance REST Engine      │
    │  - Real-Time SSE Bi-directional Event Stream │
    │  - Haversine Geofence Proximity Engine       │
    │  - Safe Search & Keyword Evaluation Filter   │
    │  - Persistent SQLite Database (FR-09)        │
    │    (users, children, devices, rules, logs)   │
    └──────────────────────▲───────────────────────┘
                           │ HTTP / REST + Telemetry Sync
                           ▼
    3. CHILD DEVICE (Android Native + Phone Simulator)
    ┌──────────────────────────────────────────────┐
    │  - UsageStatsManager Foreground Service      │
    │  - AccessibilityService Blocker Overlay      │
    │  - FusedLocationProvider GPS Tracker         │
    │  - Safe Web Browser with Content Filter      │
    │  - Child Device Admin Policy Receiver        │
    │  - Emergency SOS Panic Button                │
    └──────────────────────────────────────────────┘
```

---

## 🚀 Quick Start Guide (Running the Project)

### Prerequisites
- Node.js (v18 or higher; v22 recommended)
- Modern web browser (Chrome, Edge, Firefox, Safari)
- *Optional:* Android Studio (for compiling the native Android project)

### Step 1: Start the Server
Open a terminal in the project directory (`c:\college project`) and run:

```bash
node server.js
```

The server initializes the SQLite database, seeds realistic college evaluation demo data, and begins listening on `http://127.0.0.1:3000`.

### Step 2: Open the Demonstration Hub
Open your browser and navigate to:

👉 **`http://127.0.0.1:3000/`**

---

## 🖥️ Interactive Demonstration Modes

The Demonstration Hub offers three live viewing modes:

1. **Dual Live View (Split-Screen) — Recommended for Project Viva & Evaluation**:
   - Left side: Full-featured **Parent Dashboard**
   - Right side: Interactive **Child Smartphone Simulator**
   - *Experience live synchronicity*: Click **"Lock Phone Now"** on the parent dashboard -> the child phone immediately displays the Android lock screen in real time! Tap a blocked app (like TikTok) on the child phone -> an overlay appears and the parent dashboard sounds an alert!
2. **Parent Portal Full Screen**:
   - Direct URL: `http://127.0.0.1:3000/parent/`
   - Complete parental control center.
3. **Child Phone Simulator Full Screen**:
   - Direct URL: `http://127.0.0.1:3000/child/`
   - Realistic Android smartphone frame with app launcher, safe browser, GPS simulator, and SOS trigger.

---

## 📱 Android Studio Native Application (`android-app/`)

The repository includes the complete native Android project located in `android-app/`:

### Android Project Structure
```
android-app/
├── build.gradle                   # Project-level Gradle build file
├── settings.gradle                # Module configuration
├── gradle.properties              # JVM arguments & AndroidX flags
└── app/
    ├── build.gradle               # App-level Gradle (Kotlin, Room, Retrofit, Location)
    └── src/main/
        ├── AndroidManifest.xml    # Permissions, Services, Receivers & Admin policies
        ├── java/com/guardiansafe/parentalcontrol/
        │   ├── MainActivity.kt                            # Setup, pairing & permission checks
        │   ├── service/UsageMonitoringService.kt          # UsageStatsManager foreground service
        │   ├── service/AppBlockerAccessibilityService.kt  # Real-time app window blocker
        │   ├── service/LocationTrackingService.kt         # FusedLocation background GPS tracker
        │   ├── service/ChildVpnService.kt                 # Safe DNS / Domain filtering VPN service
        │   ├── receiver/BootReceiver.kt                   # Auto-start on device reboot
        │   ├── receiver/DeviceAdminPolicyReceiver.kt      # Prevents uninstallation
        │   ├── data/AppDatabase.kt                        # Android Room SQLite database
        │   ├── data/UsageRecord.kt                        # Room usage entity
        │   ├── data/UsageDao.kt                           # Room Data Access Object
        │   ├── network/ApiClient.kt                       # Retrofit 2 HTTP client
        │   ├── network/ParentalControlApi.kt              # Cloud API endpoints
        │   └── ui/BlockOverlayActivity.kt                 # System lock screen activity
        └── res/
            ├── layout/activity_main.xml                   # Dashboard layout
            ├── layout/activity_block_overlay.xml          # Lock screen overlay layout
            ├── values/strings.xml, colors.xml, themes.xml
            └── xml/device_admin_sample.xml, accessibility_service_config.xml
```

---

## 🗄️ Database Schema (SQLite)

The backend uses a normalized SQLite database stored in `guardiansafe.db`:

- `users`: Parent accounts (id, name, email, password_hash, salt, phone, role)
- `children`: Monitored child profiles (id, parent_id, name, age, avatar)
- `devices`: Registered smartphones (id, child_id, device_name, model, pairing_code, battery_level, current_app, is_locked)
- `screen_time_rules`: Screen time controls (child_id, daily_limit_minutes, curfew_start, curfew_end, curfew_enabled, is_locked, bonus_minutes_today)
- `app_restrictions`: Per-app blocking rules (child_id, package_name, app_name, category, is_blocked, daily_limit_minutes, time_used_today)
- `content_filters`: Category blocking toggles (child_id, category, is_blocked)
- `custom_rules`: Custom keyword & domain patterns (child_id, rule_type, pattern)
- `geofences`: Safe zones (child_id, name, latitude, longitude, radius_meters, alert_on_exit, alert_on_enter)
- `location_logs`: GPS telemetry records (device_id, latitude, longitude, speed, address, timestamp)
- `app_usage_logs`: Foreground application sessions (device_id, package_name, app_name, category, duration_seconds, usage_date)
- `alerts`: Safety notifications (parent_id, child_id, device_id, alert_type, title, message, severity, is_read)

---

## 🧪 Automated Testing

GuardianPulse includes an automated verification test suite verifying all 10 requirements:

```bash
# Run automated verification suite
node -e "require('./server.js'); const { runTests } = require('./tests/test_suite.js'); setTimeout(async () => { await runTests(); process.exit(0); }, 500);"
```

**Results:**
```
======================================================================
GUARDIANPULSE - SRS SPECIFICATION VERIFICATION TEST RUNNER
Testing Functional Requirements (FR-01 to FR-10)
======================================================================

✅ [PASS] FR-01: User Registration
✅ [PASS] FR-02: User Login
✅ [PASS] FR-03: Application Usage Monitoring
✅ [PASS] FR-04: Screen-Time Management & Curfew Rules
✅ [PASS] FR-05: Application Restrictions & App-Block Check
✅ [PASS] FR-06: Content Filtering & Safe Search
✅ [PASS] FR-07: Location Tracking & Geofencing
✅ [PASS] FR-08: Real-Time Alerts & SOS Panic Trigger
✅ [PASS] FR-09: SQLite Persistent Data Storage
✅ [PASS] FR-10: Parent Dashboard Data Aggregation

======================================================================
TEST SUMMARY: 10 of 10 tests PASSED (100% SUCCESS)
All Functional Requirements FR-01 through FR-10 Verified!
======================================================================
```

---

## 📚 Project Documentation Bundle

For college submissions, presentations, and viva evaluations:
1. **[`spec.md`](spec.md)** — Original Software Requirements Specification.
2. **[`PROJECT_REPORT.md`](PROJECT_REPORT.md)** — Academic Project Report containing Problem Statement, System Analysis, SRS, Architecture Diagrams, DFDs, ER Model, Test Cases, and Conclusions.
3. **[`VIVA_QUESTIONS_AND_ANSWERS.md`](VIVA_QUESTIONS_AND_ANSWERS.md)** — Examination preparation guide with 25+ technical viva questions and model answers.

