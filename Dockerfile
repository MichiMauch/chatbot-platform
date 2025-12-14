# Optimized Dockerfile for low-memory servers (4GB RAM)
# Uses pre-built Chromium image to avoid heavy build process

FROM ghcr.io/puppeteer/puppeteer:23.6.0 AS base

USER root
WORKDIR /app

# Stage 1: Install dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --maxsockets 1

# Stage 2: Build application
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments
ARG DATABASE_URL
ARG DATABASE_AUTH_TOKEN
ARG NEXTAUTH_URL
ARG NEXTAUTH_SECRET
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

ENV DATABASE_URL=$DATABASE_URL
ENV DATABASE_AUTH_TOKEN=$DATABASE_AUTH_TOKEN
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

# Build with reduced memory usage
ENV NODE_OPTIONS="--max-old-space-size=1024"
RUN npm run build

# Stage 3: Production runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Create uploads directory
RUN mkdir -p /app/uploads && chown pptruser:pptruser /app/uploads

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=pptruser:pptruser /app/.next/standalone ./
COPY --from=builder --chown=pptruser:pptruser /app/.next/static ./.next/static
COPY --from=builder /app/drizzle ./drizzle

USER pptruser

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

VOLUME ["/app/uploads"]

CMD ["node", "server.js"]
