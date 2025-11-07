# 🎯 How to Test Real-Time Collaboration

## ✅ Yes! This project supports real-time collaboration!

When you or your friend types something, it **instantly appears** on everyone else's screen who is viewing the same document.

## 🧪 How to Test It

### Step 1: Start the Server

```bash
cd server
npm run dev
```

Wait until you see: `Server running on port 5001`

### Step 2: Start the Client (First User)

```bash
cd client
npm start
```

This opens http://localhost:3000

### Step 3: Login as First User

1. Go to http://localhost:3000/login
2. Login with:
   - Email: `alice@demo.com`
   - Password: `demo123`
3. Create a new document or open an existing one

### Step 4: Open in Another Browser/Window (Second User)

**Option A: Different Browser**
- Open Chrome, Firefox, Safari, or Edge
- Go to http://localhost:3000/login
- Login with a **different account**:
   - Email: `bob@demo.com`
   - Password: `demo123`
- Open the **same document** (same document ID in URL)

**Option B: Incognito/Private Window**
- Open an incognito/private window
- Go to http://localhost:3000/login
- Login with a different account
- Open the same document

**Option C: Different Device**
- Open http://localhost:3000 on your phone/tablet (make sure it's on the same network)
- Login with a different account
- Open the same document

### Step 5: Test Real-Time Collaboration! 🎉

1. **Type in one window** - Watch it appear in the other window **instantly**!
2. **Have your friend type** - See their changes appear on your screen
3. **Type at the same time** - Both changes will merge correctly (CRDT handles conflicts)
4. **See cursors** - You'll see colored badges showing who else is in the document

## 🔍 What You Should See

### Real-Time Features Working:

1. ✅ **Text Sync**: Typing in one window appears in all other windows instantly
2. ✅ **Cursors**: See colored presence indicators showing other users
3. ✅ **Simultaneous Editing**: Multiple people can type at the same time without conflicts
4. ✅ **Connection Status**: Green "Connected" indicator when online
5. ✅ **User Notifications**: Toast messages when users join/leave

### Visual Indicators:

- **Presence Badges**: Colored circles showing other users in the document
- **Connection Status**: "● Connected" or "○ Disconnected" in the header
- **User Join/Leave**: Toast notifications when someone joins or leaves

## 🎮 Try These Scenarios

### Scenario 1: Basic Collaboration
1. User A types "Hello"
2. User B sees "Hello" appear instantly
3. User B types " World"
4. User A sees "Hello World"

### Scenario 2: Simultaneous Editing
1. User A types at the beginning: "Start "
2. User B types at the end: " End"
3. Both see: "Start [content] End" - CRDT merges correctly!

### Scenario 3: Cursor Tracking
1. Move your cursor around
2. Friend should see your cursor position (throttled to reduce jitter)

### Scenario 4: Offline/Reconnect
1. Disconnect your internet
2. Type something (it queues locally)
3. Reconnect internet
4. Changes sync automatically!

## 🐛 Troubleshooting

### Changes Not Appearing?

1. **Check both users are in the same document**
   - Look at the URL - document IDs must match
   - Example: `/editor/690ce8d39be09290e7cbda1a`

2. **Check connection status**
   - Should show "● Connected" (green)
   - If "○ Disconnected" (red), refresh the page

3. **Check server is running**
   ```bash
   curl http://localhost:5001/api/health
   ```

4. **Check browser console** (F12)
   - Look for WebSocket connection errors
   - Check for CORS errors

5. **Verify client .env**
   ```bash
   cd client
   cat .env
   # Should show:
   # REACT_APP_API_URL=http://localhost:5001/api
   # REACT_APP_WS_URL=http://localhost:5001
   ```

### Server Not Running?

```bash
cd server
npm run dev
```

### Can't See Other Users?

- Make sure both users are logged in
- Both must have access to the document
- Check presence badges in the header

## 🎯 Expected Behavior

✅ **What Works:**
- Real-time text synchronization
- Multiple users editing simultaneously
- Conflict-free merging (CRDT)
- Cursor/presence indicators
- Offline queue and reconnect
- User join/leave notifications

❌ **What Doesn't Work (by design):**
- Rich text formatting (plain text only)
- Images/files (text only)
- Undo/redo across users (local only)

## 🚀 Advanced Testing

### Test with 3+ Users
1. Open 3 different browsers/windows
2. Login with: alice, bob, charlie
3. All open the same document
4. Everyone types at once - watch the magic! ✨

### Test Network Issues
1. Start editing
2. Disconnect internet
3. Type something
4. Reconnect
5. Changes should sync automatically

## 📊 How It Works Technically

1. **You type** → Changes go to Yjs (CRDT) locally
2. **Yjs creates update** → Sent to server via WebSocket
3. **Server processes** → Applies to server's Yjs document
4. **Server broadcasts** → Sends to all other connected clients
5. **Other clients receive** → Apply update to their Yjs document
6. **UI updates** → Text appears on everyone's screen!

**Result**: Everyone sees the same document state, even when editing simultaneously! 🎉

---

**Enjoy real-time collaboration!** 🚀

