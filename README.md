# Cameroon Project

> Nouvelle version communautaire : comptes, groupes, photos, vocaux, avis et itinéraires routiers. Pour la mise à jour du VPS existant, suivre [le guide de cette version](docs/COMMUNITY_VPS_RELEASE.md) avant toute commande de déploiement. Le site requiert les services Docker et HTTPS pour la caméra, le microphone et la géolocalisation.

Plateforme bilingue de découverte du Cameroun, conçue comme un projet scolaire complet : expérience éditoriale, recherche de destinations, recommandations, carnet de voyage et architecture évolutive.

## Ce qui est inclus

- Interface responsive en français et en anglais.
- Treize destinations éditoriales avec photographies créditées.
- Recherche et filtres par intérêt.
- Questionnaire de recommandations.
- Itinéraire local : ajout, ordre, suppression et lien de partage.
- Guide touristique avec hôtels, restaurants, sorties, filtres et carte OpenStreetMap interactive.
- Comptes obligatoires avec mot de passe haché, session révocable et rôles utilisateur/administrateur.
- Discussions de groupe séparées pour chaque destination.
- Tableau de bord administrateur : audience, activité des salons et édition du catalogue publié.
- Sélections pratiques intégrées aux fiches de destination.
- Routes JSON légères pour le prototype (`/api/health`, `/api/destinations`, `/api/recommendations`).
- Services dans `backend/` : passerelle Nginx, quatre services FastAPI, quatre bases PostgreSQL et RabbitMQ.
- Documentation d’architecture, sécurité et contrats API.

## Démarrer le site

Prérequis : Node.js 22.13 ou plus récent.

```bash
npm ci
npm run dev
```

Commandes de qualité :

```bash
npm run lint
npm test
```

## Démarrer la phase 2

Prérequis : Docker avec Docker Compose.

```bash
cd backend
test -e .env || cp .env.example .env
docker compose up --build
```

Services locaux :

| Surface | Adresse locale |
| --- | --- |
| Site et API Gateway | `http://localhost:3001` |
| User Service / OpenAPI (réseau Docker uniquement) | `user-service:8000/docs` |
| Itinerary Service / OpenAPI (réseau Docker uniquement) | `itinerary-service:8000/docs` |
| Discovery Service / OpenAPI (réseau Docker uniquement) | `discovery-service:8000/docs` |
| Community Service (réseau Docker uniquement) | `community-service:8000/docs` |
| RabbitMQ Management (boucle locale uniquement) | `http://localhost:15673` |

Les mots de passe fournis sont réservés au développement local. Ils doivent être remplacés par des secrets gérés dans tout environnement partagé.

## Organisation

```text
app/                 Pages et routes du prototype web
components/          Composants React réutilisables
lib/                 Catalogues éditoriaux et touristiques typés
backend/
  gateway/            Passerelle et limites de trafic
  services/           User, Itinerary, Discovery et Community services
  docker-compose.yml  Environnement distribué local
docs/                 Architecture, sécurité et contrats
tests/                Vérifications automatisées
```

## Phases du projet

La phase 1 a validé l’expérience avec un catalogue embarqué et un carnet local. La version communautaire utilise maintenant les services Docker pour les comptes, les messages, les médias et les parcours enregistrés. Le frontend seul ne suffit donc plus pour les fonctionnalités authentifiées. La passerelle centralise l’entrée et RabbitMQ transporte les événements d’itinéraire.

Consulter [l’architecture](docs/ARCHITECTURE.md), [les contrats API](docs/API_CONTRACTS.md) et [le dossier sécurité](docs/SECURITY.md).
Pour ce serveur existant, suivre [le guide Contabo et le bilan de vérification](docs/CONTABO_RELEASE.md), puis [les précautions de mise à jour](docs/COMMUNITY_VPS_RELEASE.md).

## Crédits

Les images proviennent de Wikimedia Commons et leurs auteurs/licences sont détaillés dans la page `/credits`. Les textes éditoriaux du projet sont originaux.
