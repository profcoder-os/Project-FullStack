# 🚀 START HERE - Fix Network Error

## The Problem
Your server is **NOT running**, which is why you're getting "Network Error" when trying to log in.

## Quick Fix (2 Steps)

### Step 1: Start the Server

Open a **NEW terminal window** and run:

```bash
cd /Users/dheerajkumar/Desktop/Collaborative_Editor/server
npm run dev
```

**Wait until you see:**
```
Server running on port 5001 in development mode
```

### Step 2: Verify It's Working

In another terminal, test:

```bash
curl http://localhost:5001/api/health
```

If you get a JSON response, the server is running! ✅

## Then Try Login Again

1. Go to http://localhost:3000/login
2. Use:
   - Email: `alice@demo.com`
   - Password: `demo123`

## If Port 5001 Doesn't Work

Your server .env might have `PORT=5000`. Update it:

```bash
cd server
# Edit .env and change PORT=5000 to PORT=5001
# Or just run:
sed -i '' 's/PORT=5000/PORT=5001/' .env
```

Then restart the server.

## Still Having Issues?

1. **Check MongoDB is running:**
   ```bash
   mongosh --eval "db.adminCommand('ping')"
   ```

2. **Check server logs** for any error messages

3. **Make sure client/.env exists** with:
   ```
   REACT_APP_API_URL=http://localhost:5001/api
   REACT_APP_WS_URL=http://localhost:5001
   ```
