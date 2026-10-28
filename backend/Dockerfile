# ====================================================
# Stage 1: Build Stage (Compiles TypeScript)
# ====================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install all dependencies (including devDependencies)
COPY package*.json tsconfig.json ./
RUN npm ci

# Copy source and compile to JavaScript (/app/dist)
COPY src ./src
RUN npm run build

# Prune devDependencies to keep only production packages
RUN npm prune --omit=dev

# ====================================================
# Stage 2: Hardened Production Runtime (Least Privilege)
# ====================================================
FROM node:20-alpine AS runner

WORKDIR /app

# 1. Update OS packages to patch known Alpine / OpenSSL vulnerabilities
RUN apk update && apk upgrade --no-cache

# 2. Set production environment
ENV NODE_ENV=production

# 3. Copy only compiled output and production dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# 4. Enforce Principle of Least Privilege:
# Change ownership of /app to standard non-root user 'node' (UID 1000)
RUN chown -R node:node /app

# 5. Switch to unprivileged user (Defense against Container Escape)
USER node

EXPOSE 5000

CMD ["node", "dist/index.js"]
