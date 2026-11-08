# Software Requirements Specification (SRS)

## Parental Control Application

**Document basis:** *Parental Control Application* project report
(2023--2024)\
**Document type:** Project specification\
**Status:** Draft derived from the supplied project report

------------------------------------------------------------------------

## 1. Introduction

### 1.1 Purpose

The Parental Control Application is intended to help parents monitor and
manage their children's smartphone usage. It aims to support safer and
more responsible use of mobile devices through activity monitoring,
screen-time management, application restrictions, content filtering,
location tracking, and alerts.

### 1.2 Scope

The system is described as a mobile application with parent-facing and
child-device components connected to a cloud server/database. Parents
can remotely manage and monitor a child's device through a secure
interface.

The reported scope includes: - User registration and login. -
Application usage monitoring. - Screen-time tracking and management. -
Restricting selected applications. - Blocking or filtering inappropriate
content. - Child-device location tracking. - Real-time notification
alerts to parents. - Storage of user profiles, device activity logs, and
alerts.

### 1.3 Intended Users

-   **Parents:** Register, sign in, view child-device activity, manage
    restrictions, and receive alerts.
-   **Children:** Use a smartphone with the child-device application
    under parental supervision.

### 1.4 Definitions

-   **Parent application:** The interface used by a parent to monitor
    and manage a child's device.
-   **Child-device application:** The application component running on
    the child's smartphone.
-   **Cloud server/database:** The remote service used to store and
    process application data.
-   **Screen time:** The duration for which the child uses the device or
    applications.
-   **Activity log:** Stored information about device or application
    activity.

## 2. Overall Description

### 2.1 Product Perspective

The system consists of three principal components: 1. Parent Application
2. Child Device Application 3. Cloud Server / Database

The parent and child components communicate through the cloud service.
The report identifies Firebase as the backend/database technology and
Cloud Messaging for notifications.

### 2.2 Product Goals

The system is intended to: - Monitor children's smartphone activities. -
Block inappropriate applications. - Limit screen time. - Track device
location. - Provide real-time alerts to parents. - Encourage safer and
healthier device habits.

### 2.3 Operating Environment

The report identifies the following environment: - Android mobile
application. - Android SDK. - Android Studio development environment. -
Java and/or Kotlin programming language. - Firebase and/or SQLite
database technologies. - Windows 10 or Linux development operating
system.

The report does not specify a minimum supported Android version or a
complete list of supported device models.

### 2.4 Constraints and Assumptions

-   Internet connectivity is required for the described connected
    functionality.
-   Compatibility depends on the Android version.
-   Privacy regulations must be followed.
-   Older devices may have limited compatibility.
-   The project report does not specify detailed permission, consent, or
    data-retention policies.

## 3. Functional Requirements

### FR-01: User Registration

The system shall provide a user registration facility.

### FR-02: User Login

The system shall allow registered users to log in.

### FR-03: Application Usage Monitoring

The system shall monitor application usage on the child device and make
relevant activity information available to the parent.

### FR-04: Screen-Time Management

The system shall support tracking and management of the child's screen
time.

### FR-05: Application Restriction

The system shall allow parents to restrict or block selected
applications.

### FR-06: Content Filtering

The system shall support blocking or filtering inappropriate content.

### FR-07: Location Tracking

The system shall support tracking the child's device location and
presenting relevant information to the parent.

### FR-08: Notification Alerts

The system shall send notification alerts to parents. The report
describes these alerts as real-time.

### FR-09: Data Storage

The backend shall store: - User profiles. - Device activity logs. -
Notification alerts.

### FR-10: Parent Dashboard

The parent-facing application shall provide a dashboard and screens for
viewing monitored information and managing screen-time controls.

**Note:** The source report lists these capabilities but does not define
detailed workflows, screen layouts, alert triggers, or exact policy
rules.

## 4. Non-Functional Requirements

### NFR-01: Security

The system shall protect user and device information. The report
identifies secure authentication as a technique but does not define a
security protocol or threat model.

### NFR-02: Reliability

The application should operate reliably for its intended monitoring and
management functions.

### NFR-03: Usability

The interface shall be user-friendly and easy for parents to operate,
with minimal training.

### NFR-04: Performance

The application should provide fast performance.

### NFR-05: Compatibility

The application shall support compatible Android devices. Exact minimum
and maximum Android versions are not specified.

### NFR-06: Connectivity

Internet connectivity is required for connected application functions.

### NFR-07: Privacy

The system must comply with applicable privacy regulations.

## 5. External Interface Requirements

### 5.1 User Interface

The report identifies these front-end screens: - Login screen. -
Dashboard. - Application usage monitoring screen. - Screen-time control
panel.

The child-side interface details are not specified in the report.

### 5.2 Software Interfaces

The technologies named in the report are: - Android SDK for Android
application development. - Firebase Database for cloud data storage. -
Cloud Messaging for notifications. - Firebase and/or SQLite as database
options. - Java and/or Kotlin for application implementation.

### 5.3 Hardware Interfaces

The report does not define a dedicated hardware interface. The
application is intended to operate on Android smartphones.

## 6. Data Requirements

### 6.1 Main Data Entities

The report identifies the following entities: - Parent - Child -
Device - Application Usage - Alerts

### 6.2 Stored Data Categories

The backend is described as storing: - User profiles. - Device activity
logs. - Notification alerts.

### 6.3 Data Relationships

The report states that relationships define how the entities interact,
but it does not provide the detailed ER diagram, attributes, keys,
cardinalities, or retention requirements. These need to be specified
during detailed design.

## 7. System Architecture and Data Flow

### 7.1 High-Level Architecture

The system is organized into: 1. Parent application --- used by parents
to access monitoring and management features. 2. Child-device
application --- runs on the child's smartphone and provides device
activity information. 3. Cloud server/database --- stores and processes
application data and supports communication between the applications.

### 7.2 High-Level Data Flow

1.  A parent registers or logs in through the parent application.
2.  The child device provides relevant device and application activity
    information.
3.  The application communicates with the cloud backend.
4.  The backend stores user profiles, activity logs, and alerts.
5.  The parent accesses available monitoring information through the
    parent application.
6.  Notifications are delivered to parents through the notification
    service.

This is a high-level interpretation of the components and data
categories described in the report; detailed DFD processes and message
formats are not supplied.

## 8. Development and Deployment Requirements

### 8.1 Hardware Requirements

The project report specifies the following development-machine
requirements: - Processor: Intel i3 or above. - RAM: 4 GB or above. -
Storage: 500 GB HDD/SSD.

These are the report's stated development requirements, not verified
minimum requirements for running the mobile application.

### 8.2 Software Requirements

-   Operating system: Windows 10 / Linux.
-   IDE: Android Studio.
-   Programming language: Java / Kotlin.
-   Database: Firebase / SQLite.
-   Platform: Android SDK.

### 8.3 Techniques

-   Mobile application development.
-   Cloud database integration.
-   Secure authentication.
-   Notification services.

## 9. Testing Requirements

### 9.1 Unit Testing

Individual modules, including login and monitoring features, shall be
tested separately.

### 9.2 Integration Testing

Integrated modules shall be tested to verify communication between
components.

### 9.3 System Testing

The complete system shall be tested to verify that it meets its
functional and performance requirements.

### 9.4 Test Coverage Suggested by the Stated Requirements

The following test areas follow directly from the listed requirements: -
Registration and login. - Application usage monitoring. - Screen-time
management. - Application restrictions. - Content filtering. - Location
tracking. - Notification delivery. - Backend storage and retrieval. -
Parent/child application communication.

Specific test cases, acceptance thresholds, and test data are not
included in the source report and must be defined by the project team.

## 10. Feasibility

### 10.1 Technical Feasibility

The report considers the project technically feasible because Android
development tools and cloud databases are widely available and
supported.

### 10.2 Economic Feasibility

The report describes development cost as low because Android Studio and
Firebase offer free versions suitable for academic projects.

### 10.3 Operational Feasibility

The application is intended to be user-friendly and require minimal
training for parents.

### 10.4 Schedule Feasibility

The report states that the project can be completed within a semester,
including design, development, testing, and documentation.

## 11. Limitations

The source report identifies: - Internet connectivity is required. -
Compatibility with older devices is limited.

## 12. Future Enhancements

The report proposes the following future improvements: - AI-based
behavior analysis. - A web dashboard for parents. - Advanced content
filtering. - Multi-device monitoring.

These are future enhancements and are not treated as confirmed features
of the current implementation.

## 13. Acceptance Criteria

The source report does not provide formal acceptance criteria. At a
minimum, project acceptance should be assessed against the stated
requirements by verifying that: - A user can register and log in. -
Application usage information can be monitored. - Screen-time management
is available. - Application restrictions and content filtering are
supported. - Device location tracking is available. - Alerts can be
delivered to parents. - The backend stores the stated data categories. -
The application components communicate as intended. - Unit, integration,
and system testing have been performed.

Exact pass/fail thresholds and supported-device conditions remain to be
agreed by the project team.

## 14. Open Questions / Details to Finalize

The project report does not specify the following implementation
details. They should be resolved before development or final
deployment: 1. Minimum Android version and supported device list. 2.
Parent-child account linking and device-pairing process. 3. Exact
permissions required on the child device and how consent is obtained. 4.
Which applications and content categories can be blocked. 5. Screen-time
limit rules, schedules, and override behavior. 6. Location update
frequency and location-data retention. 7. Events that trigger
notifications. 8. Authentication, authorization, encryption, and
access-control design. 9. Database schema, entity attributes, and
relationships. 10. Offline behavior and synchronization after
connectivity returns. 11. Backup, deletion, and data-retention policies.
12. Measurable performance and reliability targets.

## 15. References

The project report lists the following references: 1. Parent Control
Application -- Research Paper:
https://journal.ijresm.com/index.php/ijresm/article/view/672 2. Design
of a Mobile Application for Monitoring Children Smartphones:
https://ijisae.org/index.php/IJISAE/article/view/5905 3. Parental
Control Application (IJARCCE Paper PDF):
https://ijarcce.com/wp-content/uploads/2021/05/IJARCCE.2021.10453.pdf 4.
Android Based Parental Monitoring Apps -- Research Article:
https://sciencepubco.com/index.php/IJET/article/view/21967 5. Mobile
Parental Control Application Using SMS:
https://ir.uitm.edu.my/id/eprint/21369/ 6. Location Based Parental
Control Child Tracking App:
https://www.amrita.edu/publication/location-based-parental-control-child-tracking-app-using-android-mobile-operating-system/
7. Angel or Devil? Privacy Study of Mobile Parental Control Apps:
https://www.researchgate.net/publication/341659203_Angel_or_Devil_A_Privacy_Study_of_Mobile_Parental_Control_Apps
8. Beyond Parental Control -- Online Safety App Design Study:
https://doi.org/10.1177/0743558419884692 9. Betrayed by the Guardian:
Security Risks of Parental Control Solutions:
https://arxiv.org/abs/2012.06502 10. Protection or Punishment? Design
Space of Parental Control Apps: https://arxiv.org/abs/2109.05347

------------------------------------------------------------------------

**Source fidelity note:** This specification is derived from the
supplied 10-page project report. It organizes the report's stated
features and requirements into an SRS format. Where the report lacks
implementation detail, the specification explicitly marks it as
unspecified rather than assuming a design.
