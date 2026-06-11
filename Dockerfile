# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Builder: install everything and build shared -> frontend -> backend.
# ---------------------------------------------------------------------------
FROM node:22-slim AS builder
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
# lmdb / msgpackr-extract / esbuild ship prebuilt binaries for linux x64+arm64
# (glibc), so no compiler toolchain is needed on this base image.
RUN corepack enable
WORKDIR /app

# Install dependencies first (better layer caching).
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Copy sources and build the whole workspace in dependency order.
COPY . .
RUN pnpm run build

# ---------------------------------------------------------------------------
# Runner: slim image with only production deps + built artifacts.
# ---------------------------------------------------------------------------
FROM node:22-slim AS runner
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PORT=8080
RUN corepack enable
WORKDIR /app

# Manifests + lockfile for a scoped production install.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/

# Install only the backend (+ its workspace dependency `shared`) prod deps.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --prod --frozen-lockfile --filter @status/backend...

# Built artifacts from the builder stage.
COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/apps/backend/dist apps/backend/dist
COPY --from=builder /app/apps/frontend/dist apps/frontend/dist

# Build metadata (passed by CI; visible in logs and `docker inspect`).
ARG APP_VERSION=dev
ARG BUILD_TIME
ARG GIT_COMMIT
ENV APP_VERSION=$APP_VERSION \
    BUILD_TIME=$BUILD_TIME \
    GIT_COMMIT=$GIT_COMMIT

LABEL org.opencontainers.image.title="xray-sp" \
      org.opencontainers.image.source="https://github.com/kastov/xray-sp" \
      org.opencontainers.image.version=$APP_VERSION \
      org.opencontainers.image.revision=$GIT_COMMIT

EXPOSE 8080
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/config').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/backend/dist/main.js"]
