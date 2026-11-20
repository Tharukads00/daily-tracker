# Daymark — Android APK Build Guide

This guide explains how to build an installable Android `.apk` file from the standalone React Native project located in `react-native-app/`.

Choose **Method 1 (EAS Cloud Build)** for the fastest setup without installing Android Studio, or **Method 2 (Local Gradle Build)** if you prefer compiling the APK completely offline on your own computer.

---

## Prerequisites

Install the following before building:

- **Node.js (LTS 18 or 20+)** — https://nodejs.org
- **npm** (bundled with Node.js)
- **Git** — https://git-scm.com

Verify your environment in a terminal:

```bash
node -v
npm -v
```

---

## Step 1: Install Project Dependencies

Navigate to the React Native Android project folder and install packages:

```bash
cd react-native-app
npm install
```

> **Tip:** If you want to test the app immediately on your Android phone before building an APK, install **Expo Go** from the Google Play Store and run:
>
> ```bash
> npx expo start
> ```
>
> Scan the QR code shown in your terminal with Expo Go.

---

## Method 1: Build APK with Expo EAS (Recommended — No Android Studio Required)

`react-native-app/eas.json` is already configured with a `preview` profile that outputs a direct-install `.apk` file (`"buildType": "apk"`).

### 1. Install EAS CLI and Log In

```bash
npm install -g eas-cli
eas login
```

*(Create a free Expo account at https://expo.dev if you don’t have one yet.)*

### 2. Initialize Your EAS Project (First Time Only)

Run inside `react-native-app/`:

```bash
eas init
```

Accept the prompt to link your Expo project ID in `app.json`.

### 3. Build the Android APK

```bash
eas build -p android --profile preview
```

- When asked **"Generate a new Android Keystore?"**, press **Y** (recommended for first-time builds).
- EAS will queue and compile the Android `.apk` in the cloud (typically 5–10 minutes).
- Once finished, EAS prints a **download link** and a **QR code** directly in your terminal.

### 4. Install on Your Android Phone

1. Scan the QR code with your Android camera (or download the `.apk` file and transfer it via USB).
2. Tap the downloaded `.apk` file on your phone.
3. If prompted, enable **Install unknown apps** for Chrome / Files in Android Settings.
4. Tap **Install** and open **Daymark**.

---

## Method 2: Build APK Locally on Your Computer (100% Offline via Gradle)

Use this method if you want to compile the `.apk` locally without an Expo account.

### Additional Local Prerequisites

1. **Java Development Kit (JDK 17)** — e.g., Adoptium Temurin 17
2. **Android Studio** with **Android SDK Platform 34/35** and **Android SDK Build-Tools** installed
3. Environment variables set:
   - `ANDROID_HOME` pointing to your Android SDK directory
   - `JAVA_HOME` pointing to your JDK 17 directory

### 1. Generate Native Android Project Folders

Inside `react-native-app/`, run Expo Prebuild to generate the native `android/` directory:

```bash
npx expo prebuild --platform android
```

### 2. Compile the Release APK with Gradle

**macOS / Linux:**

```bash
cd android
./gradlew assembleRelease
```

**Windows (PowerShell / Command Prompt):**

```powershell
cd android
.\gradlew.bat assembleRelease
```

### 3. Locate Your APK File

After Gradle finishes, your `.apk` file will be created at:

```text
react-native-app/android/app/build/outputs/apk/release/app-release.apk
```

### 4. Install Directly Over USB (Optional)

With **USB Debugging** enabled on your Android phone and connected via USB:

```bash
adb install app/build/outputs/apk/release/app-release.apk
```

Or copy `app-release.apk` to your phone’s Downloads folder and tap it to install.

---

## Alternative: Instant Offline Installation on Android (No Build Needed)

Because the web version of Daymark is also configured as an **Offline-First Progressive Web App (PWA)**:

1. Open the deployed Daymark URL in **Google Chrome** on your Android phone.
2. Tap **Install App** inside the **Alerts** tab (or Chrome menu `⋮` → **Install app** / **Add to Home screen**).
3. Daymark installs onto your home screen as a standalone full-screen app, caches assets offline via Service Worker, and syncs all profile, goal, work timer, and expense data locally in IndexedDB.

---

## Enabling Notifications on Android 13+

Daymark requests `POST_NOTIFICATIONS` and `SCHEDULE_EXACT_ALARM` in `react-native-app/app.json` for scheduled daily reminders, 100% milestone alerts, and daily budget warnings:

1. On first launch, tap **Allow** when Android prompts for notification permission.
2. To verify reminders are working offline, open the **Alerts** tab and tap **Send Test Android Notification**.
3. If reminders are delayed while the phone sleeps, go to **Android Settings → Apps → Daymark → Battery** and select **Unrestricted**.

---

## Troubleshooting

- **Dependency peer conflict during `npm install`**: Run `npm install --legacy-peer-deps`.
- **Gradle Java version error**: Ensure `java -version` reports **JDK 17** (`JAVA_HOME` set to JDK 17).
- **APK fails to install ("App not installed")**: Uninstall any previous debug build with package ID `com.daymark.tracker` before installing a newly signed release APK.
- **Need to regenerate native folders cleanly**: Run `npx expo prebuild --platform android --clean`.
