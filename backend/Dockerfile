# Production Dockerfile for Backend API
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json tsconfig.json ./
RUN npm ci

# Copy source code and build TypeScript
COPY src ./src
RUN npm run build

EXPOSE 5000

CMD ["node", "dist/index.js"]
