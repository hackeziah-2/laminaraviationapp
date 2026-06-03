# Multi-stage build for React/Vite application
# Same Dockerfile for dev, UAT, and prod. Pass VITE_API_URL at build time via
# docker-compose (--env-file .env.dev | .env.uat | .env.prod).

# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files (package-lock.json required for npm ci)
COPY package.json package-lock.json ./

# Install dependencies (including devDependencies for Vite build)
RUN npm ci

# Copy source code
COPY . .

# Build arguments: set at build time via docker-compose (--env-file .env.dev | .env.uat | .env.prod)
ARG VITE_API_URL
ARG VITE_APP_URL

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_APP_URL=${VITE_APP_URL}

RUN echo "=================================="
RUN echo "VITE_API_URL=${VITE_API_URL}"
RUN echo "VITE_APP_URL=${VITE_APP_URL}"
RUN echo "=================================="

# Build for production
RUN npm run build

# Stage 2: Serve with nginx (production image)
FROM nginx:alpine

# Install wget for HEALTHCHECK (minimal)
RUN apk add --no-cache wget

# Copy built files from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Health check for orchestrators
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:80/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
