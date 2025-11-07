# Real-Time Collaborative Editor

A production-ready real-time collaborative text editor with guaranteed convergence across clients. Built with Node.js, React, WebSocket, MongoDB, and Yjs (CRDT) for seamless multi-user editing with conflict resolution, offline support, and comprehensive access control.

## 🚀 Key Features

### Real-Time Collaboration
- **WebSocket Transport**: Low-latency bidirectional communication with room-based document sessions
- **CRDT Engine**: Yjs-based conflict-free replicated data types for guaranteed convergence
- **Optimistic UI**: Instant local updates with server reconciliation
- **Shared Cursors & Selections**: Per-user cursors with stable colors and throttled updates

### Consistency & Reliability
- **Vector Clocks**: Lamport timestamps for operation ordering and conflict detection
- **Operation Logging**: Persistent operation history with MongoDB for recovery and time travel
- **Periodic Snapshots**: Efficient document state persistence (every 100 operations)
- **Idempotent Operations**: Duplicate operation detection and safe replay guards

### Offline & Recovery
- **Offline Queue**: Local operation queuing during disconnection
- **Automatic Reconnection**: Seamless reconnection with operation replay
- **Out-of-Order Handling**: Vector clock-based ordering for concurrent edits

### Security & Access Control
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Permissions**: Owner/Editor/Viewer roles with per-document ACL
- **Access Control Lists**: Fine-grained document access management

### Observability & Scalability
- **Structured Logging**: Winston-based logging with correlation IDs
- **Health Endpoints**: System health and metrics monitoring
- **Rate Limiting**: Protection against abuse and DoS
- **Room Sharding**: Efficient document room management

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (v5 or higher)
- npm or yarn

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Collaborative_Editor
```

### 2. Server Setup

```bash
cd server
npm install
```

Create a `.env` file in the `server` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/collaborative-editor

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# WebSocket Configuration
WS_MAX_CONNECTIONS_PER_IP=10
WS_HEARTBEAT_INTERVAL=30000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Client URL (for CORS)
CLIENT_URL=http://localhost:3000
```

### 3. Client Setup

```bash
cd client
npm install
```

Create a `.env` file in the `client` directory:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WS_URL=http://localhost:5000
```

### 4. Start MongoDB

Make sure MongoDB is running on your system:

```bash
# macOS (with Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB
```

## 🚀 Running the Application

### Development Mode

**Terminal 1 - Start Server:**
```bash
cd server
npm run dev  # Uses nodemon for auto-reload
```

**Terminal 2 - Start Client:**
```bash
cd client
npm start
```

The server will run on `http://localhost:5000` and the client on `http://localhost:3000`.

### Production Mode

**Build Client:**
```bash
cd client
npm run build
```

**Start Server:**
```bash
cd server
NODE_ENV=production npm start
```

## 📖 Usage

### 1. Register/Login

1. Navigate to `http://localhost:3000`
2. Register a new account or login with existing credentials
3. You'll be redirected to the document list

### 2. Create a Document

1. Click "Create" to create a new document
2. Enter a document title
3. The editor will open automatically

### 3. Collaborate

1. Share the document URL with other users
2. Grant access via the document settings (Owner role required)
3. Multiple users can edit simultaneously
4. See real-time cursors and changes from other users

### 4. Access Control

- **Owner**: Full control, can delete and manage access
- **Editor**: Can edit document content
- **Viewer**: Read-only access

## 🏗️ Architecture

### Backend Structure

```
server/
├── config/
│   ├── database.js      # MongoDB connection
│   └── logger.js        # Winston logger configuration
├── middleware/
│   ├── auth.js          # JWT authentication
│   └── documentAccess.js # Document access control
├── models/
│   ├── User.js          # User model
│   ├── Document.js      # Document model with Yjs state
│   ├── OperationLog.js  # Operation history
│   └── Session.js       # Active user sessions
├── routes/
│   ├── auth.js          # Authentication endpoints
│   ├── documents.js     # Document CRUD endpoints
│   └── health.js        # Health check & metrics
├── services/
│   ├── crdtService.js   # Yjs CRDT engine integration
│   ├── websocketService.js # WebSocket room management
│   └── offlineQueue.js  # Offline operation queue
└── server.js            # Main server entry point
```

### Frontend Structure

```
client/
├── src/
│   ├── components/
│   │   ├── Login.js     # Login component
│   │   ├── Register.js  # Registration component
│   │   ├── DocumentList.js # Document list view
│   │   └── Editor.js    # Main collaborative editor
│   ├── context/
│   │   └── AuthContext.js # Authentication context
│   ├── App.js           # Main app component
│   └── index.js         # Entry point
```

## 🔧 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Documents

- `GET /api/documents` - List user's documents (protected)
- `POST /api/documents` - Create new document (protected)
- `GET /api/documents/:documentId` - Get document state (protected)
- `PUT /api/documents/:documentId/access` - Update document access (owner only)
- `DELETE /api/documents/:documentId` - Delete document (owner only)

### Health & Metrics

- `GET /api/health` - Health check
- `GET /api/health/metrics` - System metrics

## 🔌 WebSocket Events

### Client → Server

- `join-document` - Join a document room
- `document-update` - Send document update
- `cursor-update` - Send cursor position update

### Server → Client

- `document-state` - Initial document state
- `document-update` - Remote document update
- `update-ack` - Update acknowledgment
- `cursor-update` - Remote cursor update
- `user-joined` - User joined notification
- `user-left` - User left notification
- `presence-update` - Current users in document
- `error` - Error notification

## 🧪 Testing

### Unit Tests

```bash
cd server
npm test
```

### Multi-Client Testing

1. Open multiple browser windows/tabs
2. Login with different accounts
3. Join the same document
4. Test concurrent editing, cursors, and offline scenarios

## 📊 Monitoring

### Health Check

```bash
curl http://localhost:5000/api/health
```

### Metrics

```bash
curl http://localhost:5000/api/health/metrics
```

### Logs

Server logs are written to:
- `server/logs/combined.log` - All logs
- `server/logs/error.log` - Error logs only

## 🔒 Security Features

- **JWT Tokens**: Secure authentication with configurable expiration
- **Password Hashing**: bcrypt with salt rounds
- **CORS Protection**: Configurable allowed origins
- **Rate Limiting**: Request rate limiting per IP
- **Helmet.js**: Security headers
- **Input Validation**: Request validation and sanitization

## 🚀 Scalability Considerations

- **Horizontal Scaling**: Stateless server design allows multiple instances
- **Room Sharding**: Document rooms can be distributed across instances
- **Operation Batching**: Efficient update batching for high-frequency edits
- **Snapshot Strategy**: Periodic snapshots reduce operation log size
- **MongoDB Indexing**: Optimized indexes for document and operation queries

## 🐛 Troubleshooting

### MongoDB Connection Issues

```bash
# Check if MongoDB is running
mongosh --eval "db.adminCommand('ping')"

# Check connection string in .env
# Default: mongodb://localhost:27017/collaborative-editor
```

### Port Already in Use

```bash
# Change PORT in server/.env
PORT=5001
```

### WebSocket Connection Issues

- Check CORS settings in `server.js`
- Verify `CLIENT_URL` in server `.env`
- Check firewall settings

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📚 Technologies Used

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **Socket.IO** - WebSocket library
- **MongoDB** - Database
- **Mongoose** - ODM
- **Yjs** - CRDT library
- **JWT** - Authentication
- **Winston** - Logging
- **Helmet** - Security headers

### Frontend
- **React** - UI framework
- **Socket.IO Client** - WebSocket client
- **Yjs** - CRDT client
- **React Router** - Routing
- **Axios** - HTTP client
- **React Toastify** - Notifications

## 🎯 Future Enhancements

- [ ] Rich text editing with ProseMirror
- [ ] Code syntax highlighting
- [ ] Document versioning and history
- [ ] Comments and annotations
- [ ] Real-time presence indicators
- [ ] Document templates
- [ ] Export to various formats
- [ ] Mobile app support
- [ ] End-to-end encryption
- [ ] Advanced conflict resolution UI
