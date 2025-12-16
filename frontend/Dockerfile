FROM node:20-alpine AS base

# Install dependencies only when needed (separate stage for caching)
FROM base AS deps
WORKDIR /app

# Copy ONLY package files (rarely change)
COPY package.json package-lock.json* ./

# Install dependencies (cached layer - only rebuilds if package*.json changes)
RUN npm ci --legacy-peer-deps

# Development stage
FROM base AS dev
WORKDIR /app

# Install Playwright browsers for testing
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy cached node_modules
COPY --from=deps /app/node_modules ./node_modules

# Copy application code (frequent changes - later in cache)
COPY . .

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["npm", "run", "dev"]

# Production build stage
FROM base AS builder
WORKDIR /app

# Copy cached node_modules
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Copy Next.js build output
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["npm", "start"]
RUN addgroup --system --gid 1001 nodejs
