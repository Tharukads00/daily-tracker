# Daymark

**Offline-first personal daily target goals, work-timer, and daily expense tracker for Android.**

Daymark helps you plan daily target goals, measure focused work completed, and monitor daily spending against a configurable budget cap—all stored privately offline on your device with full dark mode support, Ant Design UI components, and push notification reminders.

---

## Core Features

- **Initial Welcome & Profile Setup**
  - First-launch multi-step setup to create your personal profile (name, role, primary focus pillar, custom avatar art / monogram initials / local photo upload), calibrate your daily focus goal and budget cap, choose Light/Dark/System mode, and start with either guided 7-day sample data or a clean blank slate.
- **Daily Target Goals Dashboard (`Today`)**
  - Interactive 7-day date scroller, circular daily target progress ring, and a side-by-side **Daily Budget Cap vs. Dual-Win Streak** summary card.
  - Supports four progress-logging modes per goal:
    - **Percentage Sliders** (0–100%)
    - **Unit Counters** (`+` / `-` steppers with custom unit labels)
    - **Weighted Sub-task Checklists** (completion % weighted by task effort)
    - **Timer-Tracked Goals** (linked directly to focus sessions)
- **Work Completed & Focus Timer (`Focus`)**
  - Drift-free **Pomodoro (25/5)**, **Deep Work (50/10)**, and **Custom** countdown timer bound to any daily goal.
  - Quick offline work logging (`+15m`, `+30m`, `+45m`) and a daily chronological work-completed history log.
- **Financial Management & Budget vs. Streak (`Budget`)**
  - Configurable daily budget cap and currency selector (`$`, `Rs`, `€`, `£`, `₹`, `A$`).
  - Fast expense logger with live remaining-cap preview, category spending breakdown, and a **7-day Spend vs. Goal Completion** comparison chart highlighting **Dual-Win** streak days (goals met + spending under cap).
- **Push Notifications & Reminders (`Alerts`)**
  - Scheduled morning check-ins and evening unfinished-goal alerts.
  - Instant 100% milestone celebration notifications.
  - Daily budget limit warning alerts (configurable early-warning threshold + cap-exceeded alert).
- **Offline Local Sync & Dark Mode**
  - **Web / Android PWA**: IndexedDB primary store + `localStorage` mirror, Workbox Service Worker offline caching, JSON backup export/import, and synchronized Ant Design + Tailwind dark/light/system themes.
  - **React Native Android (`react-native-app/`)**: `@ant-design/react-native` UI, `@react-native-async-storage/async-storage` offline local sync, `expo-notifications` local Android push notifications, and automatic/manual dark mode.

---

## Project Structure

- **Web & Installable Android Offline PWA (Root)**: Built with React, TypeScript, Vite, Ant Design (`antd`), Tailwind CSS, Recharts, and `vite-plugin-pwa`.
- **Standalone React Native Android App (`react-native-app/`)**: Built with React Native, Expo, `@ant-design/react-native`, `AsyncStorage`, and `expo-notifications`, pre-configured with `app.json` and `eas.json` for Android APK builds.
- **Detailed APK Build Instructions**: See [`BUILD_ANDROID_APK.md`](./BUILD_ANDROID_APK.md).

---

## Quick Start

### 1. Run the Live Web / Offline Android PWA Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` (or open the deployed URL in Chrome on your Android phone and tap **Install App** inside the **Alerts** tab to install it offline on your home screen).

### 2. Run the React Native Android App

```bash
cd react-native-app
npm install
npx expo start --android
```

### 3. Build an Installable Android `.apk` File

#### Option A — Expo EAS Cloud Build (No Android Studio Required)

```bash
cd react-native-app
npm install
npm install -g eas-cli
eas login
eas init
eas build -p android --profile preview
```

EAS outputs a direct download link and QR code for the signed `.apk` file.

#### Option B — Local Offline Gradle Build (Requires JDK 17 + Android Studio SDK)

```bash
cd react-native-app
npm install
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```

The compiled APK will be generated at:

```text
react-native-app/android/app/build/outputs/apk/release/app-release.apk
```

See [`BUILD_ANDROID_APK.md`](./BUILD_ANDROID_APK.md) for Windows commands, sideloading instructions, Android 13+ notification permissions, and troubleshooting.
