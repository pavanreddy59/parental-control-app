# GUARDIANPULSE — PRESENTATION SLIDES & TALKING POINTS

A ready-to-use slide outline for final-year / semester college project presentations and seminars.

---

### Slide 1: Title Slide
- **Title:** GuardianPulse: An Integrated Mobile and Cloud-Based Parental Control System
- **Subtitle:** Smartphone Activity Monitoring, Intelligent Screen-Time Management, and Safety Enforcement
- **Domain:** Mobile Computing, Cloud Systems & Cyber Safety
- **Presenter:** [Student Name]
- **Supervisor/Guide:** [Professor/Guide Name]
- **Date & Academic Year:** 2023–2024 / 2026

*Speaker Notes:*
> "Good morning respected evaluators and professors. Today I am presenting GuardianPulse, an integrated mobile and cloud-based parental control system engineered in accordance with rigorous software requirements specifications to foster digital wellbeing and child safety."

---

### Slide 2: Problem Statement & Motivation
- **Exponential Rise in Youth Screen Time:** Children aged 8–15 spend an average of 5+ hours daily on smartphones.
- **Key Perils:**
  - Exposure to inappropriate web content (violence, adult content, gambling, predatory forums).
  - Screen addiction disrupting sleep schedules and academic focus.
  - Physical safety concerns when children are traveling or away from home.
- **Shortcomings of Existing Tools:** High monthly subscriptions, battery-draining polling mechanisms, lack of real-time responsiveness, and missing emergency triggers.

*Speaker Notes:*
> "While smartphones are essential for education and staying connected, unchecked mobile usage presents severe risks ranging from cyber addiction to inappropriate exposure. Most existing market apps rely on periodic polling, which drains phone battery and causes minutes of delay before a block takes effect. GuardianPulse solves this through an instant, event-driven architecture."

---

### Slide 3: Objectives & Scope
- Design an intuitive **Parent Web Dashboard** for real-time monitoring and controls.
- Implement an **Android Native Application** capable of intercepting restricted apps and logging usage.
- Enforce **Screen-Time Limits & Bedtime Curfews** that automatically lock the device during study/sleep hours.
- Implement **Content Filtering & Safe Search** for web queries and domain lookups.
- Provide **Real-Time GPS Location Tracking & Geofencing** with automated Entry/Exit alerts.
- Incorporate a 1-click **Emergency SOS Panic Trigger** transmitting live coordinates.

---

### Slide 4: System Architecture
- **Distributed 3-Tier Model:**
  1. **Presentation Tier:** Responsive Parent Web Console + Realistic Android Smartphone Simulator.
  2. **Application Tier:** Node.js REST Engine + Server-Sent Events (SSE) Bi-Directional Event Dispatcher.
  3. **Data Tier:** Relational SQLite Engine (`guardiansafe.db`) + Android Room Local SQLite Database.
- **Key Architectural Advantage:** Sub-50 millisecond synchronization between parent and child devices via SSE push streams.

---

### Slide 5: Core Functional Requirements (SRS Compliance)
- **FR-01 & FR-02:** User Registration & Secure Authentication (PBKDF2 Salted Hashes).
- **FR-03:** Application Usage Monitoring (`UsageStatsManager` session aggregation).
- **FR-04:** Screen-Time Management (Daily limits, Curfews, Remote Instant Lock, +15m Bonus grants).
- **FR-05:** Application Restrictions (Per-app blocking toggles & daily time caps).
- **FR-06:** Content Filtering (Category toggles & custom keyword/URL pattern blacklist).
- **FR-07:** Location Tracking & Geofencing (Interactive GPS radar map, Safe Zones: Home, School, Park).
- **FR-08:** Real-Time Alerts & Notification Logs (SSE push notifications + SOS Emergency Trigger).
- **FR-09:** Data Storage (Normalized SQLite schema with referential integrity).
- **FR-10:** Parent Dashboard (Unified console with live charts, toggles, and metrics).

---

### Slide 6: Android System Internals & Interception Engine
- **How Restricted Apps are Blocked in Real Time:**
  - Modern Android restricts background tasks from terminating other apps directly.
  - We leverage Android's `AccessibilityService` (`AppBlockerAccessibilityService.kt`), listening to `TYPE_WINDOW_STATE_CHANGED`.
  - When a restricted package (e.g., TikTok) opens, the service immediately launches `BlockOverlayActivity` with `FLAG_ACTIVITY_NEW_TASK`, displaying a full-screen block overlay before user interaction.
- **Tamper Protection:**
  - Android `DeviceAdminReceiver` (`DeviceAdminPolicyReceiver.kt`) prevents unauthorized uninstallation or force-stopping by the child.

---

### Slide 7: Geofencing & Mathematical Formulation
- **Boundary Detection Algorithm:**
  - Evaluates distance between child GPS coordinates and safe zone centers using the **Haversine Great-Circle Formula**:
    $$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos\phi_1 \cos\phi_2 \sin^2\left(\frac{\Delta\lambda}{2}\right)$$
    $$d = 2R \cdot \text{atan2}(\sqrt{a}, \sqrt{1-a})$$
  - If $d > \text{radius}$, the system detects an unauthorized boundary crossing and dispatches a `GEOFENCE_EXIT` alert to the parent.

---

### Slide 8: Content Filtering & Safe Browsing
- **Two-Tier Filtering Approach:**
  - **Tier 1 (Network/DNS):** Android `ChildVpnService` routes DNS queries through Family Safe DNS resolvers.
  - **Tier 2 (Keyword & Category Engine):** Inspects query strings and URLs against active categories (Adult, Violence, Gambling, Malware) and parent-defined custom keyword rules.
  - Generates instant security alerts and blocks rendering when violations occur.

---

### Slide 9: Database Design (Entity-Relationship Model)
- **11 Normalized Relational Tables:**
  - `users` ➔ `children` ➔ `devices`
  - `screen_time_rules`, `app_restrictions`, `content_filters`, `custom_rules`
  - `geofences`, `location_logs`, `app_usage_logs`, `alerts`
- **Features:** Foreign key cascade deletion, optimized compound indexes on date and device ID for sub-millisecond query execution.

---

### Slide 10: Live Demonstration Highlights
- **Dual-Screen Live Synchronized Portal:**
  - Left: Parent Dashboard | Right: Child Android Smartphone Simulator.
  - **Demo Scenario 1:** Parent clicks "Lock Phone Now" ➔ Child phone immediately displays lock screen in real time.
  - **Demo Scenario 2:** Child attempts to launch TikTok ➔ System block overlay appears, and security alert sounds on parent dashboard.
  - **Demo Scenario 3:** Child enters "online casino" in Safe Browser ➔ Blocked page appears with alert notification.
  - **Demo Scenario 4:** Child clicks "Emergency SOS" ➔ High-priority red panic alert with GPS coordinates pops up on parent console.

---

### Slide 11: Testing & Verification
- **Automated Verification Test Suite:**
  - 10 automated test suites verifying FR-01 through FR-10.
  - **Result: 10 of 10 Passed (100% Success Rate).**
  - Robustness against network latency, corrupted inputs, and edge boundary coordinates.

---

### Slide 12: Conclusion & Future Scope
- **Conclusion:** GuardianPulse provides an academic, production-grade parental control solution that fulfills all 10 requirements of the SRS with real-time responsiveness and battery-conscious design.
- **Future Enhancements:**
  - On-device Machine Learning for sentiment analysis in messaging apps to detect cyberbullying.
  - Multi-child and secondary guardian role delegation.
  - Automated weekly digital wellbeing PDF summaries.
- **Thank You! Questions & Discussion.**

