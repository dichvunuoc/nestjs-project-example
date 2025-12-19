#!/bin/bash

# Ensure build directory exists
mkdir -p build

echo "Building NestJS binary with Bun..."

bun build ./src/main.ts \
  --compile \
  --outfile ./build/nest-app \
  --external @nestjs/microservices \
  --external @nestjs/platform-express \
  --external @nestjs/websockets \
  --external @fastify/view \
  --external class-transformer/storage

if [ $? -eq 0 ]; then
  echo "Build successful! Binary location: ./build/nest-app"
else
  echo "Build failed!"
  exit 1
fi
