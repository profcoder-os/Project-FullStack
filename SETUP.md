# Quick Setup Guide

## Prerequisites Check

1. **Node.js**: Run `node --version` (should be v16+)
2. **MongoDB**: Run `mongosh --version` (should be installed)
3. **npm**: Run `npm --version`

## Step-by-Step Setup

### 1. Install Server Dependencies

```bash
cd server
npm install
```

### 2. Configure Server Environment

Create `server/.env`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/collaborative-editor
JWT_SECRET=change-this-to-a-random-secret-key-in-production
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
```

### 3. Start MongoDB

**macOS (Homebrew):**
```bash
brew services start mongodb-community
```

**Linux:**
```bash
sudo systemctl start mongod
```

**Windows:**
```bash
net start MongoDB
```

**Or use MongoDB Atlas (cloud):**
- Sign up at https://www.mongodb.com/cloud/atlas
- Create a free cluster
- Get connection string
- Update `MONGODB_URI` in `.env`

### 4. Start Server

```bash
cd server
npm run dev
```

Server should start on `http://localhost:5000`

### 5. Install Client Dependencies

```bash
cd client
npm install
```

### 6. Configure Client Environment

Create `client/.env`:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WS_URL=http://localhost:5000
```

### 7. Start Client

```bash
cd client
npm start
```

Client should start on `http://localhost:3000`

## Verify Installation

1. Open `http://localhost:3000`
2. Register a new account
3. Create a document
4. Open another browser window/tab
5. Login with a different account (or same account)
6. Open the same document
7. Start typing in both windows - changes should sync in real-time!

## Troubleshooting

### MongoDB Connection Error

```bash
# Test MongoDB connection
mongosh mongodb://localhost:27017/collaborative-editor

# If connection fails, check if MongoDB is running
ps aux | grep mongod
```

### Port Already in Use

Change `PORT` in `server/.env` to a different port (e.g., 5001)

### CORS Errors

Ensure `CLIENT_URL` in `server/.env` matches your client URL

### Module Not Found Errors

Delete `node_modules` and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Production Deployment

1. Build client: `cd client && npm run build`
2. Set `NODE_ENV=production` in server `.env`
3. Use a strong `JWT_SECRET`
4. Configure proper MongoDB connection string
5. Set up reverse proxy (nginx) if needed
6. Use PM2 or similar for process management

