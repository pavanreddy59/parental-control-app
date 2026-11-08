# GUARDIANPULSE — VIVA VOCE & TECHNICAL EXAMINATION GUIDE

This guide prepares students to ace oral examinations, final year project defenses, and technical evaluations for the **Parental Control Application** project.

---

### Section 1: Project Overview & Architecture

#### Q1: What is GuardianPulse and what core problem does it solve?
**Answer:**
GuardianPulse is a distributed, multi-platform parental control system designed to help parents supervise and manage their children's smartphone activities. It addresses critical digital wellbeing and safety challenges: excessive screen time, access to inappropriate web content (violence, adult content, gambling), cyber-addiction to gaming/social media, and physical safety tracking via real-time GPS and geofences.

#### Q2: Explain the high-level architecture of your project.
**Answer:**
The system is built on a 3-tier distributed architecture:
1. **Client Tier (Parent Web Dashboard & Child Android App):**
   - The Parent Dashboard allows parents to configure rules, view live usage charts, monitor child location on an interactive radar map, and execute instant device locks.
   - The Child Application runs foreground monitoring services, intercepts restricted applications, filters web content, and sends telemetry.
2. **Application Server Tier (Node.js REST & SSE Engine):**
   - Handles authentication, rule validation, geofence boundary checks (using the Haversine formula), content safety evaluations, and real-time Server-Sent Events (SSE) push broadcasts.
3. **Database Tier (SQLite Engine):**
   - Normalized relational database (`guardiansafe.db`) storing user credentials, child profiles, device records, app usage logs, rules, and security alerts. On native Android devices, SQLite is complemented by Android Room for offline caching.

#### Q3: Why did you choose Server-Sent Events (SSE) instead of traditional HTTP polling?
**Answer:**
Traditional HTTP polling incurs high server overhead, battery consumption on mobile devices, and inevitable latency (a command to lock the phone might take 30 to 60 seconds to take effect). Server-Sent Events (SSE) provide a persistent, lightweight, unidirectional HTTP streaming connection from server to client. When a parent clicks "Lock Phone Now" or when a child attempts to open a blocked app, the event is pushed in under 50 milliseconds with minimal battery and network overhead.

---

### Section 2: Android Internals & Security Mechanisms

#### Q4: How does the application detect and block restricted apps in real time?
**Answer:**
In Android, the most reliable and non-intrusive method is leveraging the Android `AccessibilityService`:
- We created `AppBlockerAccessibilityService` which listens for `AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED`.
- Whenever the foreground application changes, the service retrieves the package name of the active window (`event.packageName`).
- If this package is in the active blocklist or exceeds its allocated daily limit, the service immediately launches `BlockOverlayActivity` with flags `FLAG_ACTIVITY_NEW_TASK | FLAG_ACTIVITY_CLEAR_TOP`.
- This brings up a full-screen lock screen over the restricted application before the child can interact with it, and simultaneously fires an alert to the parent.

#### Q5: How do you measure application usage duration?
**Answer:**
Application usage is measured via Android's `UsageStatsManager` API using the `PACKAGE_USAGE_STATS` permission:
- The `UsageMonitoringService` periodically inspects daily usage statistics using `queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startTime, endTime)`.
- It tracks foreground duration for each package, increments daily counters in the local SQLite database, and pushes incremental delta updates to the cloud backend.

#### Q6: How do you prevent a tech-savvy child from uninstalling the app?
**Answer:**
We implement an Android `DeviceAdminReceiver` (`DeviceAdminPolicyReceiver.kt`). When activated by the parent:
- The app registers as a Device Administrator.
- Android prevents the uninstallation or force-stopping of any active Device Administrator app unless the device admin privileges are explicitly revoked.
- Attempting to deactivate device administration requires the parent's secret security PIN or master password.

#### Q7: What Android permissions are required and why?
**Answer:**
1. `PACKAGE_USAGE_STATS`: Allows querying `UsageStatsManager` for foreground app duration.
2. `SYSTEM_ALERT_WINDOW`: Enables rendering a blocking overlay over other running apps.
3. `ACCESS_FINE_LOCATION` & `ACCESS_BACKGROUND_LOCATION`: Required for accurate GPS tracking even when the screen is turned off.
4. `FOREGROUND_SERVICE`: Prevents the Android OS from killing monitoring and GPS services under low-memory conditions.
5. `RECEIVE_BOOT_COMPLETED`: Automatically restarts the protection services whenever the phone reboots.
6. `BIND_DEVICE_ADMIN`: Protects against unauthorized uninstallation.

---

### Section 3: Geofencing, Location & Content Filtering

#### Q8: How does the Geofencing algorithm work?
**Answer:**
A Geofence defines a virtual circular perimeter around a geographic coordinate (e.g., Home at $37.7749^\circ\text{ N}, -122.4194^\circ\text{ W}$ with a 250m radius).
When the child device sends updated GPS coordinates $(\text{lat}_2, \text{lon}_2)$, the backend calculates the surface distance between the child and each safe zone using the **Haversine Formula**:
$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos\phi_1 \cdot \cos\phi_2 \cdot \sin^2\left(\frac{\Delta\lambda}{2}\right)$$
$$c = 2 \cdot \text{atan2}(\sqrt{a}, \sqrt{1-a})$$
$$d = R \cdot c \quad (R = 6,371,000 \text{ meters})$$
If the distance $d > \text{radius}$ and the child was previously inside, the system flags a `GEOFENCE_EXIT` violation and dispatches an immediate alert to the parent.

#### Q9: How is Content Filtering implemented for Safe Browsing?
**Answer:**
Content filtering operates on two tiers:
1. **Network/DNS Tier:** The Android `ChildVpnService` routes outgoing DNS queries through Family Safe DNS resolvers (such as Cloudflare Family `1.1.1.3` or CleanBrowsing), which filter malicious and explicit domain lookups at the socket layer.
2. **Application / URL Keyword Engine:** The Safe Browser engine screens both URLs and search query parameters against active category dictionaries (Adult/Explicit, Violence & Weapons, Gambling, Malware/Phishing) and custom keyword blacklists defined by the parent. If a match occurs, the request is intercepted, an "Access Blocked" overlay is displayed, and an alert is recorded.

---

### Section 4: Database Design & Backend Architecture

#### Q10: Describe your SQLite Database schema and entity relationships.
**Answer:**
The relational schema comprises:
- `users`: Master parent accounts.
- `children`: Associated with `parent_id` (1-to-Many).
- `devices`: Child hardware records associated with `child_id` (1-to-Many).
- `screen_time_rules`: Screen time allowances, curfews, and lock state associated with `child_id` (1-to-1).
- `app_restrictions`: Per-package blocking flags and daily time limits associated with `child_id`.
- `content_filters` & `custom_rules`: Categories and custom patterns linked to `child_id`.
- `geofences`: Safe zones linked to `child_id`.
- `location_logs` & `app_usage_logs`: Time-series telemetry linked to `device_id`.
- `alerts`: Safety notifications linked to `parent_id` and `child_id`.
Foreign key constraints with `ON DELETE CASCADE` ensure referential integrity.

#### Q11: How do you secure parent passwords?
**Answer:**
Passwords are never stored in plain text. We employ a cryptographically secure key derivation function: **PBKDF2** (Password-Based Key Derivation Function 2) with a unique, cryptographically random 16-byte salt per user and 1,000 iterations of HMAC-SHA-512. This safeguards against dictionary attacks and rainbow table compromises.

---

### Section 5: Testing, Compliance & Future Work

#### Q12: How did you test your system against the Software Requirements Specification?
**Answer:**
We built an automated test runner (`tests/test_suite.js`) that programmatically verifies each functional requirement (FR-01 through FR-10):
- Testing parent registration, credential authentication, and session tokens.
- Emulating usage log ingestion and verifying aggregation.
- Testing screen time updates, bonus minute allocations, and instant remote lock toggles.
- Simulating blocked app launch attempts and asserting that access is denied.
- Evaluating safe and prohibited search queries against the filtering engine.
- Simulating GPS telemetry and geofence boundary evaluations.
- Testing SOS Panic button triggers and alert propagation.
All 10 tests execute automatically with a 100% pass rate.

#### Q13: What regulations govern parental control apps, and how does your app address privacy?
**Answer:**
Parental control software must comply with **COPPA** (Children's Online Privacy Protection Act) and **GDPR-Kids**:
- **Parental Consent:** Parental supervision requires an explicit account pairing process (using pairing codes) ensuring only verified guardians have monitoring access.
- **Data Minimization:** We only capture metadata necessary for child safety (app name, duration, GPS coordinates) and do not inspect keystrokes, personal chats, or private file contents.
- **Local Storage:** Telemetry is stored in localized databases rather than shared with third-party tracking or advertising networks.

#### Q14: If an examiner asks you to demonstrate the project live, what will you show?
**Answer:**
We open the Unified Demonstration Portal at `http://127.0.0.1:3000/`:
1. Show the **Parent Dashboard** on the left and the **Child Android Simulator** on the right.
2. Click **"Lock Phone Now"** on the parent dashboard -> point out how the child smartphone instantly transitions to the locked screen via SSE in real time.
3. Unlock the device, then tap **TikTok** on the child smartphone -> show the Android restriction overlay and the immediate security alert appearing on the parent dashboard.
4. Open the **Safe Browser** on the child phone, click a prohibited query like *"online casino"* -> show the content filter blocking access and the alert toast sounding on the parent dashboard.
5. In the evaluator controls, click **"Outside Geofence"** -> show the live pin update on the interactive radar map and the geofence exit alert.
6. Click the **"Emergency SOS"** button -> show the high-priority panic notification with GPS coordinates transmitted to the parent.

