#!/usr/bin/env bash
echo "======================================================="
echo " DeutschMeister - Automated Setup & Dependency Installer"
echo "======================================================="

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js v18+ first."
    exit 1
fi

echo "Installing npm dependencies..."
npm install

echo "Generating Prisma Client & Pushing Database Schema..."
npx prisma db push --skip-generate
npx prisma generate

echo "======================================================="
echo " Setup complete! Next steps:"
echo " 1. Add your credentials to .env.local"
echo " 2. Run: node scripts/setup-admin.js admin@domain.com myPassword"
echo " 3. Run: npm run dev"
echo "======================================================="
