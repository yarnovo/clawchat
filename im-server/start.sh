#!/bin/sh
set -e

echo "Running prisma migrate deploy..."
npx prisma migrate deploy

echo "Running seed..."
npx prisma db seed

echo "Starting im-server..."
exec node dist/index.js
