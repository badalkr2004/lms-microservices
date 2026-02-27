FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Install dependencies for sharp image processing
RUN apk add --no-cache \
    python3 \
    g++ \
    vips-dev

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY libs/ ./libs/
COPY services/file-service/ ./services/file-service/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the libraries first
RUN pnpm build:libs

# Build the service
RUN pnpm --filter=@lms/file-service build

# Expose port
EXPOSE 3008

# Start the application
CMD ["pnpm", "--filter=@lms/file-service", "start"]
