# Cameroon Project — code source complet

Ce dossier contient la version complète du site touristique Cameroon Project :

- le site bilingue français/anglais ;
- les destinations et les fiches détaillées ;
- le guide des hôtels, restaurants et activités ;
- la carte OpenStreetMap interactive ;
- les images locales avec leurs crédits ;
- les routes API ;
- les tests automatisés ;
- le socle backend FastAPI, PostgreSQL, RabbitMQ et Nginx.

## Démarrage rapide du site

Prérequis : Node.js 22.13 ou une version plus récente.

```bash
npm ci
npm run dev
```

Pour vérifier le projet :

```bash
npm run lint
npm test
```

## Organisation du dossier

| Dossier ou fichier | Contenu |
| --- | --- |
| `app/` | Pages du site et routes API |
| `components/` | Composants React réutilisables |
| `lib/` | Données des destinations et lieux touristiques |
| `public/` | Images, favicon et ressources publiques |
| `backend/` | Services FastAPI, bases PostgreSQL, RabbitMQ et Nginx |
| `db/` et `drizzle/` | Schémas et configuration de données |
| `docs/` | Architecture, sécurité et contrats API |
| `tests/` | Tests automatisés |
| `scripts/` | Scripts d’installation, de compilation et de validation |
| `package.json` | Dépendances et commandes du projet |
| `README.md` | Documentation technique complète |

## Démarrage du backend

Prérequis : Docker et Docker Compose.

```bash
cd backend
cp .env.example .env
docker compose up --build
```

Les dossiers générés automatiquement (`node_modules`, `dist`, `.next`) ne sont pas inclus dans l’archive. Ils sont recréés par les commandes d’installation et de compilation.
