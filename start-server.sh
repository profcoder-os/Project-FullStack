#!/bin/bash

echo "Starting Collaborative Editor Server..."
echo "========================================"

cd "$(dirname "$0")/server"

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found in server directory"
    echo "Creating .env from defaults..."
    cat > .env << EOF
PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/collaborative-editor
JWT_SECRET=your-super-secret-jwt-key-change-in-production-$(date +%s)
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
EOF
    echo "✅ Created .env file"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🚀 Starting server on port 5001..."
echo ""
npm run dev

