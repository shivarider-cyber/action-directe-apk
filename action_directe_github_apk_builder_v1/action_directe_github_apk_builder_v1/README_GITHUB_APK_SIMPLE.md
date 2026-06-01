# Action Directe — APK automatique avec GitHub Actions

Cette méthode évite les problèmes locaux avec Java, Gradle, Android Studio et SDK.

GitHub fabrique l’APK automatiquement dans le cloud.

## Étapes

### 1. Créer un compte GitHub

Va sur https://github.com/ et crée un compte si besoin.

### 2. Créer un dépôt

Clique sur `New repository`.

Nom conseillé :

```text
action-directe-apk
```

Tu peux choisir `Public` ou `Private`.

### 3. Envoyer les fichiers

Décompresse ce ZIP.

Sur GitHub, dans ton dépôt :

```text
Add file → Upload files
```

Glisse-dépose tout le contenu du dossier décompressé.

Tu dois voir notamment :

```text
www/
package.json
capacitor.config.ts
.github/workflows/build-apk.yml
```

Clique sur :

```text
Commit changes
```

### 4. Lancer la fabrication APK

Va dans l’onglet :

```text
Actions
```

Clique sur :

```text
Build Android APK
```

Puis :

```text
Run workflow
```

Attends quelques minutes.

### 5. Télécharger l’APK

Quand le workflow est vert, ouvre-le.

En bas, dans `Artifacts`, télécharge :

```text
action-directe-debug-apk
```

Dézippe-le.

Dedans, il y a :

```text
app-debug.apk
```

C’est ton APK de test.

### 6. Installer sur téléphone

Copie `app-debug.apk` sur ton téléphone, ouvre-le, puis accepte l’installation depuis cette source si Android le demande.

## Note

Cette APK est une version debug pour test. Pour le Play Store, il faudra plus tard une version signée.
