# Quick Start Guide - Fix Network Error

## The Problem
The server is not running, which causes the "Network Error" when trying to log in.

## Solution: Start the Server

### Option 1: Using the Startup Script (Easiest)

```bash
./start-server.sh
```

### Option 2: Manual Start

1. **Open a terminal and navigate to server directory:**
   ```bash
   cd server
   ```

2. **Make sure you have a .env file:**
   ```bash
   # If .env doesn't exist, create it:
   cat > .env << EOF
   PORT=5001
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/collaborative-editor
   JWT_SECRET=your-secret-key-here
   JWT_EXPIRES_IN=7d
   CLIENT_URL=http://localhost:3000
   EOF
   ```

3. **Start the server:**
   ```bash
   npm run dev
   ```

4. **You should see:**
   ```
   Server running on port 5001 in development mode
   ```

## Verify Server is Running

In a new terminal, test if server is responding:

```bash
curl http://localhost:5001/api/health
```

You should get a JSON response with status "healthy".

## Client Configuration

Make sure `client/.env` exists with:

```env
REACT_APP_API_URL=http://localhost:5001/api
REACT_APP_WS_URL=http://localhost:5001
```

Then restart the React app if it's already running.

## Common Issues

### MongoDB Not Running
If you see MongoDB connection errors:
- **macOS (Homebrew):** `brew services start mongodb-community`
- **Linux:** `sudo systemctl start mongod`
- **Or use MongoDB Atlas** (cloud) and update MONGODB_URI in .env

### Port Already in Use
If port 5001 is taken, change PORT in server/.env to another port (e.g., 5002) and update client/.env accordingly.

## Test Login

Once server is running:
1. Go to http://localhost:3000/login
2. Use demo account:
   - Email: `alice@demo.com`
   - Password: `demo123`

The network error should be resolved! 🎉

