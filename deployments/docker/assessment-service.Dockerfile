FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Install system dependencies for canvas and ONNX
RUN apk add --no-cache \
    python3 \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY libs/ ./libs/
COPY services/assessment-service/ ./services/assessment-service/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the libraries first
RUN pnpm build:libs

# Build the service
RUN pnpm --filter=@lms/assessment-service build

# Expose port
EXPOSE 3004

# Start the application
CMD ["pnpm", "--filter=@lms/assessment-service", "start"]
