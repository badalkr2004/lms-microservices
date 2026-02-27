FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Install build dependencies for mediasoup
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    linux-headers

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY libs/ ./libs/
COPY services/live-session-service/ ./services/live-session-service/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the libraries first
RUN pnpm build:libs

# Build the service
RUN pnpm --filter=@lms/live-session-service build

# Expose port
EXPOSE 3007

# Start the application
CMD ["pnpm", "--filter=@lms/live-session-service", "start"]
