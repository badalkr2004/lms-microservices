#!/bin/bash

echo "🏗️  Building all services..."

# Clean previous builds
pnpm clean

# Build shared libraries first
pnpm build:libs

# Build all services
pnpm build:services

echo "✅ All services built successfully!"
