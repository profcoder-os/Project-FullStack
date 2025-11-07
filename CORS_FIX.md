# CORS Fix Instructions

## Issue
The server was conflicting with macOS AirPlay service on port 5000, causing CORS errors.

## Solution
The server port has been changed to **5001** to avoid conflicts.

## Steps to Fix

1. **Update server port** (already done in code):
   - Server now uses port 5001 by default

2. **Update client environment**:
   Create or update `client/.env`:
   ```env
   REACT_APP_API_URL=http://localhost:5001/api
   REACT_APP_WS_URL=http://localhost:5001
   ```

3. **Restart both server and client**:
   ```bash
   # Terminal 1 - Server
   cd server
   npm run dev
   
   # Terminal 2 - Client (after updating .env)
   cd client
   npm start
   ```

4. **Alternative: Use port 5000 by setting environment variable**:
   If you want to use port 5000, you'll need to disable AirPlay:
   - System Preferences → Sharing → Uncheck "AirPlay Receiver"
   - Or set `PORT=5000` in `server/.env`

## Verify CORS is Working

After restarting, test the login:
- Email: `alice@demo.com`
- Password: `demo123`

The CORS error should be resolved!



