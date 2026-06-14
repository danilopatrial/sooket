# Debian (glibc), NOT alpine (musl): onnxruntime-node — pulled in transitively by
# @huggingface/transformers (Complexity Score / Semantic Cache nodes) — ships
# glibc-only prebuilt binaries whose .so fails to load under musl's loader.
FROM node:22-slim AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Build the Next.js app
FROM base AS builder
COPY package.json package-lock.json ./
# puppeteer (a devDependency, used only by the headless smoke-test) downloads a
# Chrome binary in its postinstall, which fails in the build container and isn't
# needed to build or run the app. Skip it.
ENV PUPPETEER_SKIP_DOWNLOAD=1
RUN npm ci
COPY . .
# Standalone output is opt-in (the npm package uses a regular build)
ENV SOOKET_STANDALONE=1
RUN npm run build

# Production image
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user (Debian: groupadd/useradd, not alpine's addgroup/adduser)
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

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
