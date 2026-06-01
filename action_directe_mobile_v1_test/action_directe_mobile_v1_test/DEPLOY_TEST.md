# Déploiement test rapide

## Option recommandée : Netlify Drop

1. Va sur Netlify Drop.
2. Glisse-dépose le dossier `action_directe_mobile_v1_test`.
3. Ouvre l’URL générée sur ton téléphone.
4. Installe la PWA depuis Chrome.

## Option GitHub Pages

1. Crée un repo.
2. Envoie les fichiers du dossier.
3. Active GitHub Pages.
4. Ouvre l’URL sur téléphone.

## Option locale pour UI uniquement

Depuis le dossier :

```bash
python3 -m http.server 8080
```

Puis ouvre `http://localhost:8080` sur l’ordinateur.

Pour téléphone sur le même réseau, l’URL IP peut tester l’UI, mais les notifications/service worker peuvent être limitées car ce n’est pas HTTPS.
