# Build stage
FROM node:20-slim AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Build both frontend and server (build script does: npm run build:api && vite build)
# With vite.config.ts having emptyOutDir: false, server files won't be deleted
RUN npm run build

# Runtime stage
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from builder (both API and frontend)
COPY --from=builder /app/dist ./dist

# Expose ports
EXPOSE 3001 8080

# Install serve package globally for frontend
RUN npm install -g serve

# Set environment variables
ENV NODE_ENV=production
ENV API_PORT=3001

# Start both services: API on 3001 and frontend on 8080
# The API server uses API_PORT env var (not affected by global PORT)
# Frontend uses serve -l 8080 (explicit port flag, doesn't need PORT env var)
CMD ["sh", "-c", "node dist/server/api.js > /tmp/api.log 2>&1 & serve -s dist -l 8080"] 