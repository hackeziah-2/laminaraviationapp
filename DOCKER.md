# Docker Deployment Guide

This guide explains how to build and deploy the Laminar Aviation App using Docker.

## Prerequisites

- Docker installed (version 20.10 or higher)
- Docker Compose installed (version 2.0 or higher)

## Quick Start

### Build and Run with Docker Compose

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

The application will be available at `http://localhost:3000`

### Build Docker Image Manually

```bash
# Build the image
docker build -t laminar-aviation-app:latest .

# Run the container
docker run -d -p 3000:80 --name laminar-frontend laminar-aviation-app:latest
```

## Configuration

### Environment Variables

For production, you may want to set environment variables. Create a `.env` file in the project root:

```bash
# .env file
VITE_API_URL=http://your-backend-url:8000/api/v1/
```

Then use it with docker-compose:

```bash
docker-compose up -d
```

Or build with custom API URL:

```bash
docker build --build-arg VITE_API_URL=http://your-backend-url:8000/api/v1/ -t laminar-aviation-app:latest .
```

### API Configuration

The frontend expects a backend API at `http://localhost:8000/api/v1/`. 

If your backend is running in a separate container:
1. Uncomment the backend service in `docker-compose.yml`
2. Update the API base URL in `src/api/index.ts` to use the backend service name
3. Ensure both services are on the same Docker network

### Custom Nginx Configuration

To customize nginx settings, modify `nginx.conf` and rebuild the image.

## Production Deployment

### Build for Production

```bash
docker build -t laminar-aviation-app:production .
```

### Push to Registry

```bash
# Tag for your registry
docker tag laminar-aviation-app:production your-registry/laminar-aviation-app:latest

# Push
docker push your-registry/laminar-aviation-app:latest
```

### Deploy to Server

```bash
# Pull and run
docker pull your-registry/laminar-aviation-app:latest
docker run -d -p 80:80 --name laminar-frontend your-registry/laminar-aviation-app:latest
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker logs laminar-frontend

# Check if port is already in use
lsof -i :3000
```

### Build fails

```bash
# Clear Docker cache
docker builder prune

# Rebuild without cache
docker build --no-cache -t laminar-aviation-app:latest .
```

### Update API URL for Production

The API URL is configured via environment variables at build time. Set `VITE_API_URL` when building:

```bash
# Using docker-compose with .env file
echo "VITE_API_URL=http://your-backend-url:8000/api/v1/" > .env
docker-compose up -d --build

# Or using docker build directly
docker build --build-arg VITE_API_URL=http://your-backend-url:8000/api/v1/ -t laminar-aviation-app:latest .
```

**Note:** Vite requires environment variables to be available at build time, not runtime. You must rebuild the image if the API URL changes.

## Health Check

The container includes a health check endpoint at `/health`:

```bash
curl http://localhost:3000/health
```

## Multi-stage Build

The Dockerfile uses a multi-stage build:
1. **Builder stage**: Installs dependencies and builds the React app
2. **Production stage**: Serves the built app with nginx

This results in a smaller final image (~50MB vs ~500MB+).
