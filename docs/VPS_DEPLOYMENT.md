# Déployer les comptes, discussions et le tableau de bord sur le VPS

## 1. Publier le code

Depuis l’ordinateur de développement, dans le vrai dossier Git :

```bash
git switch -c feature/community-accounts-admin
git add -- app components lib backend docs tests README.md
git commit -m "Add accounts, destination chats and admin dashboard"
git push -u origin feature/community-accounts-admin
```

Après vérification, fusionner la branche dans `main` sur GitHub. Ne jamais ajouter `backend/.env`.

## 2. Préparer les secrets du VPS

Sur le VPS, dans le dépôt :

```bash
git switch main
git pull --ff-only origin main
cd backend
cp -n .env.example .env
openssl rand -base64 48
```

Éditer ensuite `backend/.env` :

- remplacer tous les mots de passe de développement ;
- définir `ADMIN_EMAIL` avec l’adresse du premier administrateur ;
- définir `ADMIN_PASSWORD` avec le secret aléatoire généré ;
- mettre `SESSION_COOKIE_SECURE=true` lorsque le domaine utilise HTTPS.

Le User Service crée ou promeut ce compte administrateur au démarrage. Après la première connexion, conserver le secret dans un gestionnaire de mots de passe.

## 3. Reconstruire les services

```bash
docker compose pull
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 gateway user-service community-service
```

Les nouvelles tables sont créées sans effacer les utilisateurs ni les destinations existantes. Sauvegarder les volumes PostgreSQL avant chaque mise à jour importante.

## 4. Reconstruire le frontend

Depuis la racine du dépôt :

```bash
npm ci
npm test
pm2 restart cameroon-project --update-env
```

Si le processus PM2 n’existe pas encore :

```bash
npm run build
pm2 start npm --name cameroon-project -- start
pm2 save
```

## 5. Router le même domaine

Le proxy TLS public doit envoyer `/api/v1/` vers la passerelle et le reste vers le frontend :

```nginx
location /api/v1/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Real-IP $remote_addr;
}

location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Exposer publiquement uniquement les ports 80/443. Les ports 8001–8003 et 15672 doivent rester bloqués par le pare-feu ; Community Service n’a déjà aucun port hôte.

## 6. Contrôles après déploiement

```bash
curl -i https://votre-domaine.example/api/v1/auth/session
curl -fsS https://votre-domaine.example/api/health
docker compose ps
```

La première commande doit répondre `401` sans cookie. Créer ensuite un compte dans `/account`, ouvrir un salon dans `/community`, publier un message, puis se connecter avec `ADMIN_EMAIL` et vérifier `/admin`.
