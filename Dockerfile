# Use Node.js latest
FROM node:22-slim AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Final image
FROM node:22-slim

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm install

# Copy all source files (cleanly)
# We need src for backend imports (db.ts, etc)
COPY src ./src
COPY server.ts ./
COPY .env.example ./.env

# Copy built frontend assets from builder
COPY --from=builder /app/dist ./dist

# Default environment variables
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Run the server
CMD ["npx", "tsx", "server.ts"]
