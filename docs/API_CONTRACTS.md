# Contrats API — phase 2

Préfixe de la passerelle : `/api/v1`. Chaque réponse d’erreur suit le format FastAPI `{"detail": "message"}`.

## User Service

| Méthode | Route passerelle | Rôle |
| --- | --- | --- |
| `POST` | `/api/v1/users` | Créer un profil |
| `GET` | `/api/v1/users/{id}` | Lire son profil, ou tout profil pour un administrateur |
| `GET` | `/api/v1/users` | Liste paginée réservée à l’administrateur |

Exemple de création :

```json
{
  "email": "visiteur@example.com",
  "display_name": "Visiteur"
}
```

## Itinerary Service

Les routes privées attendent `X-User-ID`, injecté par une passerelle ayant déjà validé l’identité.

| Méthode | Route passerelle | Rôle |
| --- | --- | --- |
| `POST` | `/api/v1/itineraries` | Créer |
| `GET` | `/api/v1/itineraries` | Lister les siens |
| `GET` | `/api/v1/itineraries/{id}` | Lire le sien |
| `PATCH` | `/api/v1/itineraries/{id}` | Modifier le sien |
| `DELETE` | `/api/v1/itineraries/{id}` | Supprimer le sien |
| `GET` | `/api/v1/public/itineraries/{id}` | Lire un itinéraire public |

Exemple de création :

```json
{
  "title": "Entre mer et montagne",
  "stops": [
    { "slug": "kribi", "days": 2 },
    { "slug": "mont-cameroun", "days": 3 }
  ]
}
```

La mise à jour accepte un sous-ensemble de `title`, `stops` et `visibility`.

## Discovery Service

| Méthode | Route passerelle | Rôle |
| --- | --- | --- |
| `GET` | `/api/v1/discovery/destinations` | Recherche publique |
| `GET` | `/api/v1/discovery/destinations/{slug}` | Fiche publique |
| `GET` | `/api/v1/discovery/recommendations` | Suggestions par intérêt et rythme |
| `POST` | `/api/v1/discovery/admin/destinations` | Créer un brouillon ou contenu publié |
| `POST` | `/api/v1/discovery/admin/destinations/{slug}/publish` | Publier |

Paramètres de recherche : `query`, `category` et `limit`. Paramètres de recommandation : `interest` et `pace` (`relaxed`, `balanced`, `active`). Les routes d’administration attendent un rôle `admin` déjà vérifié.

## Événements

Exchange RabbitMQ : `cameroon.events`, type `topic`, messages JSON durables.

| Routing key | Déclencheur |
| --- | --- |
| `itinerary.created` | Nouvel itinéraire |
| `itinerary.updated` | Titre, étapes ou visibilité modifiés |
| `itinerary.deleted` | Itinéraire supprimé |

Les événements contiennent seulement les identifiants nécessaires. Les emails et contenus complets ne circulent pas sur le bus.

