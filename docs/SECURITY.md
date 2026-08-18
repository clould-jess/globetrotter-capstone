# Sécurité

Ce dossier décrit le niveau attendu avant une mise en production publique. Le Docker Compose fourni reste un environnement de développement.

## Contrôles déjà présents

- Modèles Pydantic avec longueurs, formats et listes autorisées.
- Requêtes PostgreSQL paramétrées.
- Isolation des données d’itinéraire par `owner_id`.
- Rôles requis sur les routes de publication et de liste des utilisateurs.
- Taille de requête limitée à 1 Mo et limite de débit à la passerelle.
- En-têtes contre le sniffing de contenu, l’intégration en iframe et les permissions inutiles.
- Conteneurs applicatifs lancés avec un utilisateur non privilégié.
- Mots de passe de développement configurables et fichier `.env` ignoré.
- Événements sans email ni contenu personnel complet.

## Frontière de confiance

Les en-têtes `X-User-ID` et `X-User-Role` ne sont fiables que s’ils sont supprimés puis recréés par une passerelle ayant validé un jeton signé. Dans un déploiement réel, les services ne doivent pas être exposés directement à Internet.

## À ajouter avant production

1. TLS obligatoire et redirection HTTP vers HTTPS.
2. Fournisseur OIDC, validation JWT, rotation des clés et sessions courtes.
3. Secrets fournis par un gestionnaire dédié, jamais par les valeurs de démonstration.
4. CORS limité aux origines officielles et protection CSRF si des cookies sont utilisés.
5. Migrations signées, sauvegardes chiffrées et exercice de restauration.
6. Journaux structurés sans données sensibles, métriques et alertes.
7. Analyse automatique des dépendances et images de conteneur.
8. Tests d’autorisation couvrant les accès horizontaux et administrateur.

## Données et vie privée

Collecter uniquement ce qui est utile au compte et aux itinéraires. Définir une durée de conservation, permettre l’export et la suppression, et ne jamais placer email, jeton ou secret dans les URLs ou les journaux.

## Signalement

Dans le cadre scolaire, les défauts sont consignés dans le suivi du projet avec une description reproductible, leur impact et la correction proposée. Aucun secret réel ne doit être ajouté à un ticket.

