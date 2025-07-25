FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY libs/ ./libs/
COPY services/api-gateway/ ./services/api-gateway/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the application
RUN pnpm build:libs
RUN pnpm --filter=@lms/api-gateway build

# Expose port
EXPOSE 3000

# Start the application
CMD ["pnpm", "--filter=@lms/api-gateway", "start"]
