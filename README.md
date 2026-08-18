# Cameroon Project

Plateforme bilingue de découverte du Cameroun, conçue comme un projet scolaire complet : expérience éditoriale, recherche de destinations, recommandations, carnet de voyage et architecture évolutive.

## Ce qui est inclus

- Interface responsive en français et en anglais.
- Six destinations réelles avec photographies créditées.
- Recherche et filtres par intérêt.
- Questionnaire de recommandations.
- Itinéraire local : ajout, ordre, suppression et lien de partage.
- Guide touristique avec hôtels, restaurants, sorties, filtres et carte OpenStreetMap interactive.
- Sélections pratiques intégrées aux fiches de destination.
- Routes JSON légères pour le prototype (`/api/health`, `/api/destinations`, `/api/recommendations`).
- Socle phase 2 dans `backend/` : passerelle Nginx, trois services FastAPI, trois bases PostgreSQL et RabbitMQ.
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
cp .env.example .env
docker compose up --build
```

Services locaux :

| Surface | Adresse locale |
| --- | --- |
| API Gateway | `http://localhost:8080` |
| User Service / OpenAPI | `http://localhost:8001/docs` |
| Itinerary Service / OpenAPI | `http://localhost:8002/docs` |
| Discovery Service / OpenAPI | `http://localhost:8003/docs` |
| RabbitMQ Management | `http://localhost:15672` |

Les mots de passe fournis sont réservés au développement local. Ils doivent être remplacés par des secrets gérés dans tout environnement partagé.

## Organisation

```text
app/                 Pages et routes du prototype web
components/          Composants React réutilisables
lib/                 Catalogues éditoriaux et touristiques typés
backend/
  gateway/            Passerelle et limites de trafic
  services/           User, Itinerary et Discovery services
  docker-compose.yml  Environnement distribué local
docs/                 Architecture, sécurité et contrats
tests/                Vérifications automatisées
```

## Phases du projet

La phase 1 valide l’expérience avec un catalogue embarqué et un itinéraire conservé dans le navigateur. La phase 2 fournit le découpage cible : chaque domaine possède son service et sa base, la passerelle centralise l’entrée et RabbitMQ transporte les événements d’itinéraire. Le frontend hébergé reste utilisable seul ; le dossier `backend/` sert de socle exécutable pour la connexion serveur suivante.

Consulter [l’architecture](docs/ARCHITECTURE.md), [les contrats API](docs/API_CONTRACTS.md) et [le dossier sécurité](docs/SECURITY.md).

## Crédits

Les images proviennent de Wikimedia Commons et leurs auteurs/licences sont détaillés dans la page `/credits`. Les textes éditoriaux du projet sont originaux.
