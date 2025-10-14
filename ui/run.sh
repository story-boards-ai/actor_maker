#!/bin/bash
# Quick start script for Styles Maker UI

echo "🎨 Starting Styles Maker UI..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "🚀 Starting dev server..."
npm run dev
