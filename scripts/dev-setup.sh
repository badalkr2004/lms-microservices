#!/bin/bash

echo "🔧 Setting up development environment..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "Installing pnpm..."
    npm install -g pnpm
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build shared libraries
echo "🏗️  Building shared libraries..."
pnpm build:libs

# Setup database
echo "🗄️  Setting up database..."
pnpm db:generate
pnpm db:migrate

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please update the .env file with your configuration"
fi

echo "✅ Development environment setup complete!"
echo "🚀 Run 'pnpm dev' to start all services"
