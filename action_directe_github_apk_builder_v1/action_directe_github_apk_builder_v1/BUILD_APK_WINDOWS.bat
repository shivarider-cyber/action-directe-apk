@echo off
title Action Directe - Build APK
echo.
echo ==========================================
echo   Action Directe - creation APK Android
echo ==========================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo ERREUR: Node.js n'est pas installe.
  echo Installe Node.js LTS depuis https://nodejs.org/
  pause
  exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
  echo ERREUR: npm introuvable.
  echo Reinstalle Node.js LTS.
  pause
  exit /b 1
)

echo [1/5] Installation des dependances Capacitor + TypeScript...
call npm install
if %errorlevel% neq 0 (
  echo ERREUR pendant npm install.
  pause
  exit /b 1
)

if not exist www\index.html (
  echo ERREUR: dossier www introuvable ou incomplet.
  echo Le fichier www\index.html doit exister.
  pause
  exit /b 1
)

if exist android (
  echo [2/5] Ancien dossier Android detecte.
  echo Si une tentative precedente a echoue, il peut etre casse.
  echo Suppression du dossier android pour repartir propre...
  rmdir /s /q android
)

echo [2/5] Creation du projet Android...
call npx cap add android
if %errorlevel% neq 0 (
  echo ERREUR pendant la creation Android.
  pause
  exit /b 1
)

echo [3/5] Synchronisation de l'app web vers Android...
call npx cap sync android
if %errorlevel% neq 0 (
  echo ERREUR pendant cap sync.
  pause
  exit /b 1
)

echo [4/5] Tentative de build APK debug...
cd android
call gradlew.bat assembleDebug
if %errorlevel% neq 0 (
  cd ..
  echo.
  echo Build automatique impossible.
  echo Ce n'est pas grave: Android Studio doit finir l'installation Gradle/SDK.
  echo J'ouvre Android Studio. Ensuite fais:
  echo Build ^> Build Bundle(s) / APK(s) ^> Build APK(s)
  echo.
  call npx cap open android
  pause
  exit /b 0
)
cd ..

echo.
echo ==========================================
echo APK cree avec succes:
echo android\app\build\outputs\apk\debug\app-debug.apk
echo ==========================================
echo.
pause
