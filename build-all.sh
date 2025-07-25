#!/bin/bash
# Script to build all libraries and services in the correct order

# Clean all build artifacts first
echo "🧹 Cleaning all build artifacts..."
pnpm -r clean

# Build libraries in correct order
echo "🔨 Building common library..."
cd libs/common
pnpm build
if [ $? -ne 0 ]; then
  echo "❌ Common library build failed!"
  exit 1
fi

echo "🔨 Building logger library..."
cd ../logger
pnpm build
if [ $? -ne 0 ]; then
  echo "❌ Logger library build failed!"
  exit 1
fi

echo "🔨 Building database library..."
cd ../database
pnpm build
if [ $? -ne 0 ]; then
  echo "❌ Database library build failed!"
  exit 1
fi

# Build the user service
echo "🔨 Building user-service..."
cd ../../services/user-service
pnpm build
if [ $? -ne 0 ]; then
  echo "❌ User service build failed!"
  exit 1
fi

echo "✅ All builds completed successfully!"
echo "🚀 Starting user service..."
pnpm start
