# Step-by-Step VPS Deployment Guide for Cameroon Project

This guide provides complete, step-by-step instructions for hosting the **Cameroon Project** microservices architecture on your VPS using Docker and Docker Compose.

---

## 1. Prerequisites Checklist

Make sure you have:
* SSH access to your Linux VPS (as `root` or a user with `sudo` privileges).
* Docker & Docker Compose plugin installed (`docker compose version`).
* Port **`3000`**, **`8085`**, **`8001`**, **`8002`**, **`8003`**, and **`15673`** available on your VPS.

---

## 2. Step 1 — SSH into Your VPS & Prepare Directory

Run in your local terminal to log into your VPS:

```bash
ssh root@YOUR_VPS_IP
```

Navigate to your web project directory (e.g. `/var/www` or `/opt`):

```bash
cd /var/www
```

---

## 3. Step 2 — Clone the GitHub Repository

Clone the latest `main` (or `backend`) branch from GitHub:

```bash
git clone https://github.com/clould-jess/globetrotter-capstone.git cameroon-project
cd cameroon-project
```

---

## 4. Step 3 — Create Production Environment Configuration

Copy `.env.example` to `.env` inside the `backend/` directory:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` to set strong, custom production passwords:

```bash
nano backend/.env
```

Replace default values with secure passwords:

```env
USER_DB_PASSWORD=YourStrongUserDBPass_2026!
ITINERARY_DB_PASSWORD=YourStrongItineraryDBPass_2026!
DISCOVERY_DB_PASSWORD=YourStrongDiscoveryDBPass_2026!
RABBITMQ_USER=cameroon_admin
RABBITMQ_PASSWORD=YourStrongRabbitMQPass_2026!
```

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

---

## 5. Step 4 — Build & Launch All Docker Containers

From the `cameroon-project` root folder, run Docker Compose:

```bash
docker compose -f backend/docker-compose.yml up -d --build
```

> **Note**: This will automatically build the `web` frontend container, microservices, databases, Nginx gateway, and RabbitMQ in the background.

---

## 6. Step 5 — Verify Container Status & Health

Check the status of all running containers:

```bash
docker compose -f backend/docker-compose.yml ps
```

You should see **9 services** running with `healthy` or `running` state:

```text
NAME                                STATUS
cameroon-project-web-1              Up (healthy)
cameroon-project-gateway-1          Up (healthy)
cameroon-project-user-service-1     Up (healthy)
cameroon-project-itinerary-service-1  Up (healthy)
cameroon-project-discovery-service-1  Up (healthy)
cameroon-project-user-db-1          Up (healthy)
cameroon-project-itinerary-db-1     Up (healthy)
cameroon-project-discovery-db-1     Up (healthy)
cameroon-project-rabbitmq-1         Up (healthy)
```

Test API endpoints directly from your VPS command line:

```bash
curl http://localhost:8085/health
curl http://localhost:3000/api/health
```

---

## 7. Step 6 — Configure Host Nginx & SSL (Port 80 / 443)

Since your VPS already has Nginx running on Port 80, create a new site configuration file for your domain/subdomain:

```bash
sudo nano /etc/nginx/sites-available/cameroon.conf
```

Paste the following reverse proxy configuration (replace `your-domain.com` with your actual VPS domain or IP):

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Frontend Web UI (Port 3000)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Microservices API Gateway (Port 8085)
    location /api/v1/ {
        proxy_pass http://127.0.0.1:8085;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site configuration and restart host Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/cameroon.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Install Free Let's Encrypt SSL Certificate (Optional but Recommended)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

---

## 8. Step 7 — Useful Maintenance & Operation Commands

### View Live Container Logs
```bash
docker compose -f backend/docker-compose.yml logs -f
```

### View Specific Container Logs (e.g. `web` or `user-service`)
```bash
docker compose -f backend/docker-compose.yml logs -f web
docker compose -f backend/docker-compose.yml logs -f user-service
```

### Restart All Services
```bash
docker compose -f backend/docker-compose.yml restart
```

### Update Code & Redeploy New Version
```bash
git pull origin main
docker compose -f backend/docker-compose.yml up -d --build
```

### Perform Database Backup (`user-db`)
```bash
docker exec -t cameroon-project-user-db-1 pg_dump -U cameroon_user cameroon_users > user_db_backup.sql
```
