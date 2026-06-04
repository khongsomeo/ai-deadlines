# Build stage
FROM node:20-slim AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy project files
COPY . .

# Build the app
RUN npm run build

# Runtime stage
FROM node:20-slim

WORKDIR /app

# Install serve
RUN --mount=type=cache,target=/root/.npm \
    npm install -g serve

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Expose port 8080
EXPOSE 8080

# Start server
CMD ["serve", "-s", "dist", "-l", "8080"]