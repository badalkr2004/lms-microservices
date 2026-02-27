FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY libs/ ./libs/
COPY services/course-service/ ./services/course-service/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the libraries first
RUN pnpm build:libs

# Build the service
RUN pnpm --filter=@lms/course-service build

# Expose port
EXPOSE 3002

# Start the application
CMD ["pnpm", "--filter=@lms/course-service", "start"]
