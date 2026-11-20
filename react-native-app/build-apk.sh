#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-eas}"

echo "=== Daymark Android APK Builder ($MODE mode) ==="

if [ ! -d "node_modules" ]; then
  echo "Installing React Native dependencies..."
  npm install --legacy-peer-deps
fi

if [ "$MODE" = "local" ]; then
  if ! command -v java >/dev/null 2>&1; then
    echo "Error: JDK 17 (java) is required for local APK builds. Install JDK 17 or run: ./build-apk.sh eas"
    exit 1
  fi
  if [ -z "${ANDROID_HOME:-}" ]; then
    echo "Error: ANDROID_HOME is not set. Install Android Studio SDK and export ANDROID_HOME."
    exit 1
  fi

  echo "Generating native Android project..."
  npx expo prebuild --platform android

  echo "Compiling release APK with Gradle..."
  cd android
  ./gradlew assembleRelease
  echo "APK ready at: react-native-app/android/app/build/outputs/apk/release/app-release.apk"
else
  if ! command -v eas >/dev/null 2>&1; then
    echo "Installing Expo EAS CLI..."
    npm install -g eas-cli
  fi
  echo "Building Android APK via Expo EAS (preview profile)..."
  eas build -p android --profile preview
fi
