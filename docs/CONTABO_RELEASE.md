# Mise en ligne Contabo — 8 septembre 2026

Site : **https://cameroon-169-58-83-56.sslip.io**. Dépôt VPS : `/opt/cameroon-project`, branche `main`, projet Docker `cameroon-project`. Version applicative actuelle vérifiée : `0914ed2` (messagerie v3) ; les mises à jour documentaires suivantes ne changent pas son fonctionnement.

## Mise à jour messagerie v3

La messagerie approuvée est publiée : groupes privés sur invitation, réponses
par glissement ou bouton, citations, barre à icônes, photos et vocaux.
Le [rapport de messagerie](MESSAGING_V3.md) distingue les tests automatisés,
les 20 identités simulées en base isolée et les 24 contrôles réussis sur le
site public avec deux comptes temporaires. Aucun essai avec 20 personnes
réelles n'est revendiqué.

Sauvegarde avant publication : `/opt/cameroon-backups/release-doR9qFqW`.
Cette mise à jour a reconstruit et redémarré seulement `web` et
`community-service`, puis recréé `gateway`. Les autres projets du VPS
n'ont pas été redémarrés.

## Administrateur

Le compte demandé a été créé. Ses identifiants initiaux sont dans `/root/cameroon-admin-initial.txt`, lisible uniquement par root sur le VPS. Consultez ce fichier dans votre propre console SSH, sans publier son contenu. Connectez-vous sur `/account`, puis ouvrez `/admin`.

## Bilan de vérification de la version initiale (53a8b1f)

Le parcours testé va du navigateur à la passerelle, aux services et aux bases PostgreSQL, puis revient à l’affichage. Deux comptes temporaires et des médias synthétiques ont servi aux essais ; aucune caméra ni aucun microphone personnel n’ont été utilisés.

| Fonction | Résultat |
| --- | --- |
| Comptes | Inscription, connexion, cookie sécurisé, déconnexion et redirection HTTPS validés |
| Administration | Compte normal refusé ; statistiques, création, modification, publication et masquage d’une fiche validés dans Edge |
| Groupes | Adhésion, refus du non-membre et échange entre deux comptes validés |
| Photos | Capture simulée, aperçu, envoi, conversion JPEG, affichage et persistance validés |
| Vocaux | Enregistrement simulé WebM et fichier WAV, conversion Opus, stockage et lecture validés |
| Suppression | La pièce jointe disparaît avec son message ; l’ancienne URL retourne 404 |
| Avis | Création, modification sans doublon et suppression validées |
| Carte | Géolocalisation simulée, calcul routier réel, distance/durée, sauvegarde isolée par compte et affichage mobile validés |
| Lieux proches | À Yaoundé : 8 salles de sport et 13 monuments trouvés ; la requête des ministères a rencontré une surcharge Overpass (504) |
| HTTPS | Certificat public valide et simulation de renouvellement Certbot réussie |

La vérification a permis de corriger les droits des fichiers des conteneurs, l’initialisation PostgreSQL du catalogue, les redirections derrière HTTPS et le cache de navigation au changement de session. Les derniers essais navigateur n’ont signalé aucune erreur JavaScript. Les autres projets du VPS n’ont pas été modifiés par ce déploiement.

La sauvegarde préalable du projet Cameroon (bases, configuration, révision et références d’images) se trouve dans `/opt/cameroon-backups/release-0WH3CeEn`.

## Prochaines mises à jour

Pousser sur GitHub ne déploie pas automatiquement le VPS. Dans votre console SSH, vérifier d’abord que le dépôt est propre et que la version voulue est publiée :

```bash
cd /opt/cameroon-project
git status --short
bash scripts/vps-backup.sh
git pull --ff-only origin main
cd backend
docker compose config --quiet
docker compose build
docker compose up -d --wait --wait-timeout 180 web user-service itinerary-service discovery-service community-service
docker compose up -d --no-deps --force-recreate gateway
docker compose exec -T gateway nginx -t
docker compose ps
```

Arrêter si une commande échoue ou si des modifications locales apparaissent. Conserver `backend/.env` et les volumes ; ne jamais lancer `docker compose down -v`. Le script de sauvegarde inclut désormais aussi les données communautaires et leurs médias.

Ce VPS utilise déjà Nginx et Certbot : **ne pas activer le profil Caddy `https`**, car les ports 80/443 servent aussi d’autres sites. La passerelle Cameroon écoute en local sur 3001 ; l’ancien accès public par ce port et les ports internes d’API sont fermés.

## Limites

- L’adresse sslip.io dépend d’un service DNS tiers, sans domaine personnel.
- Les anciens groupes restent publics ; les nouveaux peuvent être privés sur invitation. Il n'y a pas de chiffrement de bout en bout. Les messages signalés sont accessibles à la modération.
- OpenStreetMap/OSRM fournissent cartes et trajets, sans trafic en temps réel. Certaines coordonnées de l’ancien catalogue sont indicatives.
- La recherche de salles de sport, monuments et ministères dépend d’Overpass : couverture non exhaustive et indisponibilités possibles, signalées dans l’interface.
- Photos : 12 Mo maximum ; vocaux : 90 secondes. Les autorisations du navigateur sont nécessaires. Les appareils mobiles réels et toutes les versions de Safari n’ont pas été testés.
- La récupération du mot de passe par e-mail et la vérification d’adresse e-mail ne sont pas encore implémentées.

Voir aussi [les précautions détaillées de cette version](COMMUNITY_VPS_RELEASE.md).
