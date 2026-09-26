# ==========================================
# Build Stage
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy source and configuration
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript
RUN npm run build

# ==========================================
# Production Stage
# ==========================================
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist

# Create non-root user
USER node

EXPOSE 5000

CMD ["node", "dist/server.js"]
