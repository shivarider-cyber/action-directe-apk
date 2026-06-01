# Audit — Action Directe V10 mobile calendar

## Ajouts V10
- Cycle glissant réel : le départ du cycle est la date réelle de création.
- Dates `plannedDate` sur chaque séance.
- 3 séances/semaine : J+0, J+2, J+5.
- 2 séances/semaine : J+0, J+3.
- Détection des séances manquées.
- Bouton de report intelligent.
- Décalage des séances suivantes sans compression.
- Minimum 48 h après la dernière séance faite lors d’un report.
- Page Réglages.
- Notifications locales simples jour J.
- Relance douce optionnelle.
- Manifest PWA.
- Service worker offline + notification click.

## Limite importante
Les notifications V10 fonctionnent quand la PWA est ouverte ou récemment active. Pour une vraie fiabilité système si l’app est fermée longtemps, il faudra une version APK avec alarmes Android ou une architecture Push API côté serveur.

## À auditer sur mobile réel
- Permission notification.
- Hitbox du bouton d’accueil.
- PWA installable.
- Service worker bien enregistré.
- Notification à l’heure prévue.
- Report après séance manquée.
- Scroll page Réglages.
