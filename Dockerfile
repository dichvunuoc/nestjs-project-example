# --- Build Stage ---
FROM oven/bun:latest AS builder

WORKDIR /app

# Copy package files and install dependencies
# Using bun.lock if it exists, otherwise it will fall back to package.json
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source code and scripts
COPY . .

# Ensure the build script is executable
RUN chmod +x scripts/build-binary.sh

# Build the binary
RUN bun run build:binary

# --- Final Stage ---
# Use debian-slim for a minimal but complete environment with necessary native libraries
FROM debian:12-slim

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -m -s /bin/bash nodejs

WORKDIR /app

# Install minimal native dependencies that might be required by the binary or its dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    openssl \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

# Copy only the compiled binary from the builder stage
COPY --from=builder --chown=nodejs:nodejs /app/build/nest-app /app/nest-app

# Switch to non-root user
USER nodejs

# Expose the application port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
# Disable pretty logging in container to avoid pino-pretty dependency issues in binary
ENV ENABLE_PRETTY_LOGGING=false

# Run the binary
ENTRYPOINT ["/app/nest-app"]
