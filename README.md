# Laminar Aviation App - Fleet Management

A comprehensive fleet management application for aviation operations. This is a code bundle for FLEET_MANAGEMENT. The original project is available at https://www.figma.com/design/oEeyeeowVtTiNPINocB0RZ/FLEET_MANAGEMENT.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Development](#development)
- [Deployment](#deployment)
  - [Steps for Deployment (Prod and UAT)](#steps-for-deployment-prod-and-uat)
  - [How to Deploy (Steps)](#how-to-deploy-steps)
  - [Docker Deployment](#docker-deployment-recommended)
  - [Traditional Deployment](#traditional-deployment)
  - [Production Configuration](#production-configuration)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- **Node.js** (v18 or higher)
- **npm** (v9 or higher) or **yarn**
- **Docker** and **Docker Compose** (for Docker deployment)
- Backend API server running (default: `http://localhost:8000`)

## Getting Started

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start the development server
npm run dev
```

The application will be available at `http://localhost:3000`

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production

### Project Structure

```
src/
├── api/              # API client configuration
├── components/       # React components
├── hooks/            # Custom React hooks
├── types/            # TypeScript type definitions
├── utility/          # Utility functions
└── styles/          # Global styles
```

## Deployment

### Steps for Deployment (Prod and UAT)

Use the API URL for the target environment. Rebuild the app whenever `VITE_API_URL` changes (it is set at build time).

---

#### Production (Prod)

| Step | Action | Command |
|------|--------|--------|
| 1 | Set production API URL | `echo "VITE_API_URL=https://api.yourdomain.com/api/v1/" > .env` |
| 2 | Build and run (Docker) | `docker-compose up -d --build` |
| 3 | Or build image only | `docker build --build-arg VITE_API_URL=https://api.yourdomain.com/api/v1/ -t laminar-aviation-app:prod .` |
| 4 | Verify | `curl https://your-frontend-domain/health` and open the app in a browser |

**Traditional (no Docker):**

| Step | Action | Command |
|------|--------|--------|
| 1 | Set production API URL | `export VITE_API_URL=https://api.yourdomain.com/api/v1/` |
| 2 | Build | `npm install && npm run build` |
| 3 | Deploy | Copy `build/` to prod server (e.g. `scp -r build/* user@prod-server:/var/www/laminar-aviation/`) |
| 4 | Restart web server | On server: `sudo nginx -t && sudo systemctl restart nginx` |

---

#### UAT (User Acceptance Testing)

| Step | Action | Command |
|------|--------|--------|
| 1 | Set UAT API URL | `echo "VITE_API_URL=https://uat-api.yourdomain.com/api/v1/" > .env` |
| 2 | Build and run (Docker) | `docker-compose up -d --build` |
| 3 | Or build image only | `docker build --build-arg VITE_API_URL=https://uat-api.yourdomain.com/api/v1/ -t laminar-aviation-app:uat .` |
| 4 | Verify | `curl http://localhost:3000/health` and test the app against UAT backend |

**Traditional (no Docker):**

| Step | Action | Command |
|------|--------|--------|
| 1 | Set UAT API URL | `export VITE_API_URL=https://uat-api.yourdomain.com/api/v1/` |
| 2 | Build | `npm install && npm run build` |
| 3 | Deploy | Copy `build/` to UAT server (e.g. `scp -r build/* user@uat-server:/var/www/laminar-aviation-uat/`) |
| 4 | Restart web server | On server: `sudo nginx -t && sudo systemctl restart nginx` |

---

**Checklist**

- [ ] Backend for the environment (prod or UAT) is running and reachable.
- [ ] CORS on the backend allows the frontend origin (e.g. `https://app.yourdomain.com`, `https://uat.yourdomain.com`).
- [ ] `.env` (or build arg) has the correct `VITE_API_URL` for that environment.
- [ ] After changing `VITE_API_URL`, you ran a new build and redeployed.

---

### How to Deploy (Steps)

#### Option A: Docker (recommended)

Run these commands in order from the project root:

| Step | Command |
|------|--------|
| 1. Set API URL (production) | `echo "VITE_API_URL=http://your-backend-url:8000/api/v1/" > .env` |
| 2. Build and start | `docker-compose up -d --build` |
| 3. View logs (optional) | `docker-compose logs -f` |
| 4. Verify | `curl http://localhost:3000/health` |

**Manual Docker build (without docker-compose):**

```bash
# 1. Set API URL and build image
docker build --build-arg VITE_API_URL=http://your-backend-url:8000/api/v1/ -t laminar-aviation-app:latest .

# 2. Run container
docker run -d -p 3000:80 --name laminar-frontend laminar-aviation-app:latest

# 3. Verify
curl http://localhost:3000/health
```

---

#### Option B: Traditional (build + Nginx/Apache)

Run these commands in order:

| Step | Command |
|------|--------|
| 1. Install dependencies | `npm install` |
| 2. Set API URL (production) | `export VITE_API_URL=http://your-backend-url:8000/api/v1/` |
| 3. Build | `npm run build` |
| 4. Copy to server | `scp -r build/* user@your-server:/var/www/laminar-aviation/` |
| 5. On server: enable Nginx site | `sudo ln -s /etc/nginx/sites-available/laminar-aviation /etc/nginx/sites-enabled/` |
| 6. On server: test and restart | `sudo nginx -t && sudo systemctl restart nginx` |

**One-liner build (with API URL):**

```bash
npm install && VITE_API_URL=http://your-backend-url:8000/api/v1/ npm run build
```

Details and config files (Nginx, Apache, Docker Compose) are in the sections below.

---

### Docker Deployment (Recommended)

Docker provides an easy and consistent way to deploy the application across different environments.

#### Prerequisites

- Docker (v20.10 or higher)
- Docker Compose (v2.0 or higher)

#### Quick Start

1. **Build and run with Docker Compose:**

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

The application will be available at `http://localhost:3000`

#### Docker: Dev vs Prod

| Environment | Command | API URL (build-time) |
|-------------|---------|----------------------|
| **Prod** | `echo "VITE_API_URL=https://api.yourdomain.com/api/v1/" > .env` then `docker-compose up -d --build` | From `.env` or default `http://localhost:8000/api/v1/` |
| **Dev** (backend on host) | `docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build` | `http://host.docker.internal:8000/api/v1/` so the container can reach backend on your machine |

- **Prod:** Set `VITE_API_URL` in `.env` to your production API, then run `docker-compose up -d --build`.
- **Dev:** Use `docker-compose.dev.yml` so the frontend (in Docker) talks to a backend running on the host (Docker Desktop: `host.docker.internal`).

2. **Build Docker image manually:**

```bash
# Build the image
docker build -t laminar-aviation-app:latest .

# Run the container
docker run -d -p 3000:80 --name laminar-frontend laminar-aviation-app:latest
```

#### Production Deployment with Custom API URL

1. **Create environment file:**

```bash
# Create .env file in project root
echo "VITE_API_URL=http://your-backend-url:8000/api/v1/" > .env
```

2. **Build and deploy:**

```bash
# Using docker-compose
docker-compose up -d --build

# Or using docker build directly
docker build --build-arg VITE_API_URL=http://your-backend-url:8000/api/v1/ -t laminar-aviation-app:latest .
docker run -d -p 3000:80 --name laminar-frontend laminar-aviation-app:latest
```

#### Deploy to Cloud Platforms

**Docker Hub / Container Registry:**

```bash
# Tag for your registry
docker tag laminar-aviation-app:latest your-registry/laminar-aviation-app:latest

# Push to registry
docker push your-registry/laminar-aviation-app:latest

# Pull and run on server
docker pull your-registry/laminar-aviation-app:latest
docker run -d -p 80:80 --name laminar-frontend your-registry/laminar-aviation-app:latest
```

**AWS ECS / Google Cloud Run / Azure Container Instances:**

Follow your cloud provider's documentation for deploying Docker containers. Use the built image from the steps above.

### Traditional Deployment

#### Build for Production

```bash
# Build the application
npm run build
```

This creates a `build` directory with optimized production files.

#### Serve with Nginx

1. **Copy build files to server:**

```bash
# Copy build directory to your server
scp -r build/* user@your-server:/var/www/laminar-aviation/
```

2. **Configure Nginx:**

Create `/etc/nginx/sites-available/laminar-aviation`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/laminar-aviation;
    index index.html;

    # Handle React Router (SPA routing)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;
}
```

3. **Enable site and restart Nginx:**

```bash
sudo ln -s /etc/nginx/sites-available/laminar-aviation /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Serve with Apache

1. **Copy build files:**

```bash
scp -r build/* user@your-server:/var/www/html/laminar-aviation/
```

2. **Configure Apache:**

Create `/etc/apache2/sites-available/laminar-aviation.conf`:

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /var/www/html/laminar-aviation

    <Directory /var/www/html/laminar-aviation>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Handle React Router
    <IfModule mod_rewrite.c>
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </IfModule>
</VirtualHost>
```

3. **Enable site:**

```bash
sudo a2ensite laminar-aviation.conf
sudo systemctl restart apache2
```

#### Serve with Node.js (Express)

1. **Install serve package:**

```bash
npm install -g serve
```

2. **Serve the build:**

```bash
serve -s build -l 3000
```

### Production Configuration

#### Environment Variables

The application uses environment variables for configuration. For Vite applications, these must be set at **build time**, not runtime.

**Development:**
- Uses default API URL: `http://localhost:8000/api/v1/`

**Production:**
- Set `VITE_API_URL` before building
- Example: `VITE_API_URL=http://api.yourdomain.com/api/v1/ npm run build`

#### Build with Environment Variables

```bash
# Set environment variable and build
VITE_API_URL=http://your-backend-url:8000/api/v1/ npm run build

# Or export first
export VITE_API_URL=http://your-backend-url:8000/api/v1/
npm run build
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:8000/api/v1/` |

### Setting Environment Variables

**For Docker:**
- Use build args: `docker build --build-arg VITE_API_URL=...`
- Or create `.env` file for docker-compose

**For Traditional Deployment:**
- Export before build: `export VITE_API_URL=... && npm run build`
- Or use `.env` file (requires `dotenv` package)

## Troubleshooting

### Docker Issues

**Container won't start:**
```bash
# Check logs
docker logs laminar-frontend

# Check if port is in use
lsof -i :3000
```

**Build fails:**
```bash
# Clear Docker cache
docker builder prune

# Rebuild without cache
docker build --no-cache -t laminar-aviation-app:latest .
```

**"Unable to connect to the backend server" (frontend in Docker, backend on host):**

API requests run in your **browser**, not inside the container. The browser must be able to reach the backend (usually on your machine).

1. **Backend must be running on your host** on port 8000:
   ```bash
   # Example: start your backend (FastAPI/Django/etc.) on port 8000
   # Ensure it listens on 0.0.0.0 or 127.0.0.1 so the browser can connect
   ```

2. **Use `localhost` for the API URL in dev** (not `host.docker.internal`):
   - Create `.env` in the project root: `VITE_API_URL=http://localhost:8000/api/v1/`
   - Rebuild and run: `docker-compose up -d --build`
   - Or with dev override: `docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build`
   - The dev override now defaults to `http://localhost:8000/api/v1/` so the browser (on your machine) can reach the backend.

3. **CORS on the backend** must allow requests from the frontend origin:
   - Allow origin: `http://localhost:3000` (and your production domain in prod)
   - Example (FastAPI): `CORSMiddleware(allow_origins=["http://localhost:3000"])`

4. **Verify backend from your machine:**
   ```bash
   curl http://localhost:8000/api/v1/
   # or
   curl http://localhost:8000/api/v1/documents-on-board/paged?page=1&limit=10
   ```
   If this fails, the backend is not running or not listening on port 8000.

**API connection errors (general):**
- Verify backend is running and accessible
- Check `VITE_API_URL` is set correctly at **build time**
- Ensure CORS is configured on backend
- Rebuild image after changing `VITE_API_URL`

### Build Issues

**Build fails with module errors:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Environment variables not working:**
- Remember: Vite requires env vars at build time
- Variables must start with `VITE_`
- Rebuild after changing environment variables

### Runtime Issues

**404 errors on routes:**
- Ensure server is configured for SPA routing (see Nginx/Apache configs above)
- Check that `try_files` or rewrite rules are in place

**API calls failing:**
- Verify backend is running
- Check network connectivity
- Verify CORS settings on backend
- Check browser console for detailed error messages

### Health Check

The Docker container includes a health check endpoint:

```bash
curl http://localhost:3000/health
```

Should return: `healthy`

## Additional Resources

- [Docker Documentation](DOCKER.md) - Detailed Docker deployment guide
- [Vite Documentation](https://vitejs.dev/) - Build tool documentation
- [React Documentation](https://react.dev/) - React framework documentation

## Support

For issues and questions, please refer to the project documentation or contact the development team.
  