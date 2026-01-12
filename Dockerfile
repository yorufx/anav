# Stage 1: Build frontend
FROM oven/bun:1-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source files
COPY index.html vite.config.ts tsconfig*.json components.json ./
COPY src/ ./src/
COPY public/ ./public/

# Build frontend
RUN bun run build

# Stage 2: Build backend with musl
FROM rust:1-alpine AS backend-builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache musl-dev pkgconfig openssl-dev openssl-libs-static

# Copy cargo files
COPY Cargo.toml Cargo.lock ./
COPY server/ ./server/

# Build release binary with static linking
ENV OPENSSL_STATIC=1
ENV OPENSSL_LIB_DIR=/usr/lib
ENV OPENSSL_INCLUDE_DIR=/usr/include
RUN cargo build --release

# Stage 3: Runtime
FROM alpine:3.21

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache ca-certificates

# Copy built artifacts
COPY --from=backend-builder /app/target/release/anav-server ./anav-server
COPY --from=frontend-builder /app/dist ./dist

# Create config directory for assets (icons, backgrounds)
RUN mkdir -p /app/config/assets

# Environment variables
ENV PORT=33989
ENV USERNAME=admin
ENV PASSWORD=admin

EXPOSE 33989

VOLUME ["/app/config"]

CMD ["./anav-server"]
