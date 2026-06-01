# Action Directe — APK Builder V3 corrigé

Cette version corrige l’erreur :

```text
"." is not a valid value for webDir
```

L’app web est maintenant dans le dossier :

```text
www/
```

et Capacitor utilise :

```text
webDir: 'www'
```

## Utilisation Windows

1. Décompresse ce ZIP dans un nouveau dossier.
2. N’utilise plus les anciens dossiers V1/V2.
3. Ouvre le dossier `action_directe_apk_builder_v3_www_fixed`.
4. Double-clique :

```text
BUILD_APK_WINDOWS.bat
```

Le script supprime automatiquement un ancien dossier `android` s’il existe, pour repartir propre.

## APK générée

Si tout marche :

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Si Android Studio s’ouvre

Dans Android Studio :

```text
Build
→ Build Bundle(s) / APK(s)
→ Build APK(s)
```
