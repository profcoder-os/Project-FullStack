# Debugging Server Crash

## If nodemon says "app crashed"

### Step 1: Check the actual error

Look at the terminal output **BEFORE** the "app crashed" message. There should be an error message showing what went wrong.

### Step 2: Run server directly (without nodemon)

```bash
cd server
node server.js
```

This will show you the actual error without nodemon restarting.

### Step 3: Common Issues

#### MongoDB Connection Error
If you see MongoDB connection errors:
- Make sure MongoDB is running
- Check your `MONGODB_URI` in `.env`
- For MongoDB Atlas, make sure your IP is whitelisted

#### Port Already in Use
If port 5001 is already in use:
```bash
lsof -ti:5001 | xargs kill -9
```

#### Missing Environment Variables
Make sure `server/.env` has:
- `JWT_SECRET` (required)
- `MONGODB_URI` (required)
- `PORT=5001` (optional, defaults to 5001)

### Step 4: Check Logs

```bash
cd server
tail -f logs/combined.log
```

### Step 5: Test Individual Components

```bash
# Test database connection
node -e "require('dotenv').config(); const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => { console.log('DB OK'); process.exit(0); });"

# Test server startup
cd server && node server.js
```

## Share the Error

If the server still crashes, **copy the full error message** from the terminal and share it. The error message will tell us exactly what's wrong.

