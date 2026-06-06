FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Build the Next.js app
FROM base AS builder
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production image
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Persistent data volume for SQLite
RUN mkdir -p /data && chown nextjs:nodejs /data
ENV SOOKET_DATA_DIR=/data
VOLUME ["/data"]

USER nextjs

EXPOSE 3000
ENV PORT=3000
# Bind 0.0.0.0 *inside the container* so the published port works. Network
# exposure is gated at the host level by docker-compose, which publishes this
# port on 127.0.0.1 only by default. See docker-compose.yml.
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
