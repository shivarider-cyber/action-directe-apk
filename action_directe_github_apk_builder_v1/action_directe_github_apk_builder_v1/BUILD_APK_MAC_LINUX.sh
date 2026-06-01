#!/usr/bin/env bash
set -e

echo ""
echo "=========================================="
echo "  Action Directe - creation APK Android"
echo "=========================================="
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "ERREUR: Node.js n'est pas installe."
  exit 1
fi

echo "[1/5] Installation des dependances Capacitor + TypeScript..."
npm install

if [ ! -f "www/index.html" ]; then
  echo "ERREUR: dossier www incomplet."
  exit 1
fi

if [ -d "android" ]; then
  echo "[2/5] Ancien dossier Android detecte. Suppression pour repartir propre..."
  rm -rf android
fi

echo "[2/5] Creation du projet Android..."
npx cap add android

echo "[3/5] Synchronisation de l'app web vers Android..."
npx cap sync android

echo "[4/5] Tentative de build APK debug..."
cd android
chmod +x gradlew || true
if ./gradlew assembleDebug; then
  cd ..
  echo ""
  echo "APK cree avec succes:"
  echo "android/app/build/outputs/apk/debug/app-debug.apk"
else
  cd ..
  echo ""
  echo "Build automatique impossible."
  echo "J'ouvre Android Studio. Ensuite fais:"
  echo "Build > Build Bundle(s) / APK(s) > Build APK(s)"
  npx cap open android
fi
