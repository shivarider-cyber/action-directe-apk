# Action Directe — Mobile V1 Test

Version mobile de test sous forme de PWA.

## Ce que contient la V1

- Accueil plein écran avec bouton Démarrer.
- Évaluation + test guidé.
- Programmation avec cycle glissant réel.
- Dates réelles de séance.
- Timer avec échauffement intégré.
- P10 utilisée uniquement en asymétrique.
- Bilan.
- Fin de cycle avec décision pondérée.
- Réglages de rappels.
- Manifest PWA.
- Service worker.
- Cache offline de base.
- Notifications locales simples quand la PWA est ouverte ou récemment active.

## Important pour tester sur smartphone

Ne pas ouvrir `index.html` directement en fichier local pour tester les notifications.

Les service workers et les notifications demandent un contexte sécurisé :
- `https://...`
- ou `localhost` en développement

Pour un test réel sur téléphone, le plus simple est de déployer le dossier sur :
- Netlify
- Cloudflare Pages
- GitHub Pages

Puis ouvrir l’URL sur Android/Chrome et choisir :
- Ajouter à l’écran d’accueil
- Autoriser les notifications

## Test rapide sans notifications

Tu peux ouvrir `index.html` dans le navigateur pour tester :
- navigation
- accueil
- évaluation
- programmation
- timer
- bilan
- fin de cycle

Mais les notifications ne seront pas fiables en fichier local.

## Checklist mobile

1. Ouvrir l’URL déployée sur Android Chrome.
2. Ajouter à l’écran d’accueil.
3. Lancer depuis l’icône installée.
4. Cliquer Démarrer.
5. Créer une programmation.
6. Vérifier que les séances ont des dates.
7. Aller dans Réglages.
8. Activer les notifications.
9. Régler l’heure de rappel à quelques minutes plus tard.
10. Laisser la PWA ouverte ou récemment active.
11. Vérifier la notification.
12. Tester une séance manquée en changeant une date dans le code ou via simulation future.
13. Tester Reporter cette séance.
14. Vérifier que les séances suivantes se décalent.

## Limite connue

Cette V1 PWA ne garantit pas une notification exacte si l’app est fermée depuis longtemps.
Pour une fiabilité Android complète, il faudra ensuite une version APK avec notifications natives.

## Reset des données

Dans la console navigateur :

```js
resetActionDirecteTestData()
```

Ou supprimer les données du site dans les paramètres du navigateur.
