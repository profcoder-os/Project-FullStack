const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Document = require('../models/Document');
const Session = require('../models/Session');
const crdtService = require('./crdtService');
const logger = require('../config/logger');

class WebSocketService {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // documentId -> Set<socketId>
    this.socketToUser = new Map(); // socketId -> userId
    this.socketToDocument = new Map(); // socketId -> documentId
    this.pendingOperations = new Map(); // socketId -> Array<operations>
    this.cursorThrottle = new Map(); // socketId -> lastCursorUpdate
    this.metrics = {
      connections: 0,
      operationsPerSecond: 0,
      averageLatency: 0,
    };
  }

  initialize() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = user._id.toString();
        socket.username = user.username;
        next();
      } catch (error) {
        logger.error(`WebSocket auth error: ${error.message}`);
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket) => this.handleConnection(socket));
    
    // Metrics collection
    setInterval(() => this.collectMetrics(), 5000);
  }

  async handleConnection(socket) {
    this.metrics.connections++;
    logger.info(`User connected: ${socket.username} (${socket.id})`);

    socket.on('join-document', async (data) => {
      await this.handleJoinDocument(socket, data);
    });

    socket.on('document-update', async (data) => {
      await this.handleDocumentUpdate(socket, data);
    });

    socket.on('cursor-update', (data) => {
      this.handleCursorUpdate(socket, data);
    });

    socket.on('disconnect', async () => {
      await this.handleDisconnect(socket);
    });

    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}: ${error.message}`);
    });
  }

  async handleJoinDocument(socket, { documentId }) {
    try {
      // Verify document access
      const document = await Document.findById(documentId);
      if (!document) {
        socket.emit('error', { message: 'Document not found' });
        return;
      }

      const hasAccess = document.owner.toString() === socket.userId ||
        document.accessControl.some(ac => ac.user.toString() === socket.userId);

      if (!hasAccess) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      // Join room
      socket.join(documentId);
      this.socketToDocument.set(socket.id, documentId);
      this.socketToUser.set(socket.id, socket.userId);

      if (!this.rooms.has(documentId)) {
        this.rooms.set(documentId, new Set());
      }
      this.rooms.get(documentId).add(socket.id);

      // Create or update session
      const session = await Session.findOneAndUpdate(
        { documentId, userId: socket.userId, socketId: socket.id },
        {
          documentId,
          userId: socket.userId,
          socketId: socket.id,
          connected: true,
          lastActivity: new Date(),
        },
        { upsert: true, new: true }
      );

      // Get document state
      const state = await crdtService.getDocumentState(documentId);
      const docModel = await Document.findById(documentId);

      // Get pending operations if client has vector clock
      socket.emit('document-state', {
        state: state.toString('base64'),
        version: docModel.version,
        vectorClock: docModel.vectorClock,
      });

      // Broadcast presence
      socket.to(documentId).emit('user-joined', {
        userId: socket.userId,
        username: socket.username,
        color: session.color,
      });

      // Send current users in room
      const sessions = await Session.find({ documentId, connected: true });
      socket.emit('presence-update', {
        users: sessions.map(s => ({
          userId: s.userId.toString(),
          color: s.color,
          cursor: s.cursor,
        })),
      });

      logger.info(`User ${socket.username} joined document ${documentId}`);
    } catch (error) {
      logger.error(`Join document error: ${error.message}`);
      socket.emit('error', { message: 'Failed to join document' });
    }
  }

  async handleDocumentUpdate(socket, { documentId, update, vectorClock, clientId }) {
    try {
      const startTime = Date.now();
      const documentIdStr = documentId.toString();

      // Verify socket is in the document room
      if (this.socketToDocument.get(socket.id) !== documentIdStr) {
        socket.emit('error', { message: 'Not in document room' });
        return;
      }

      // Decode update from base64
      const updateBuffer = Buffer.from(update, 'base64');

      // Apply update through CRDT service
      const result = await crdtService.applyUpdate(
        documentIdStr,
        updateBuffer,
        socket.userId
      );

      // Broadcast to other clients in room (excluding sender)
      socket.to(documentId).emit('document-update', {
        update,
        vectorClock: Object.fromEntries(result.vectorClock),
        lamportTimestamp: result.lamportTimestamp,
        userId: socket.userId,
        clientId, // For duplicate detection on client
      });

      // Send ACK to sender
      socket.emit('update-ack', {
        clientId,
        vectorClock: Object.fromEntries(result.vectorClock),
        lamportTimestamp: result.lamportTimestamp,
      });

      const latency = Date.now() - startTime;
      this.updateLatencyMetrics(latency);

      logger.debug(`Document update processed for ${documentIdStr} by ${socket.username}`);
    } catch (error) {
      logger.error(`Document update error: ${error.message}`);
      socket.emit('error', { message: 'Failed to process update' });
    }
  }

  handleCursorUpdate(socket, { documentId, cursor }) {
    try {
      const documentIdStr = documentId.toString();

      // Throttle cursor updates (max once per 50ms)
      const lastUpdate = this.cursorThrottle.get(socket.id) || 0;
      const now = Date.now();
      if (now - lastUpdate < 50) {
        return; // Skip throttled update
      }
      this.cursorThrottle.set(socket.id, now);

      // Update session cursor
      Session.findOneAndUpdate(
        { documentId: documentIdStr, userId: socket.userId, socketId: socket.id },
        { cursor, lastActivity: new Date() },
        { upsert: true }
      ).catch(err => logger.error(`Cursor update error: ${err.message}`));

      // Broadcast to other clients
      socket.to(documentId).emit('cursor-update', {
        userId: socket.userId,
        username: socket.username,
        cursor,
      });
    } catch (error) {
      logger.error(`Cursor update error: ${error.message}`);
    }
  }

  async handleDisconnect(socket) {
    this.metrics.connections--;
    const documentId = this.socketToDocument.get(socket.id);

    if (documentId) {
      // Update session
      await Session.findOneAndUpdate(
        { documentId, userId: socket.userId, socketId: socket.id },
        { connected: false, lastActivity: new Date() }
      );

      // Remove from room
      const room = this.rooms.get(documentId);
      if (room) {
        room.delete(socket.id);
        if (room.size === 0) {
          this.rooms.delete(documentId);
          // Optionally persist and remove document from memory after inactivity
        }
      }

      // Broadcast user left
      socket.to(documentId).emit('user-left', {
        userId: socket.userId,
        username: socket.username,
      });

      logger.info(`User ${socket.username} left document ${documentId}`);
    }

    this.socketToDocument.delete(socket.id);
    this.socketToUser.delete(socket.id);
    this.cursorThrottle.delete(socket.id);
    this.pendingOperations.delete(socket.id);

    logger.info(`User disconnected: ${socket.username} (${socket.id})`);
  }

  updateLatencyMetrics(latency) {
    // Simple moving average
    this.metrics.averageLatency = 
      (this.metrics.averageLatency * 0.9) + (latency * 0.1);
  }

  collectMetrics() {
    // This would be enhanced with more sophisticated metrics collection
    logger.debug('Metrics', this.metrics);
  }

  getMetrics() {
    return this.metrics;
  }
}

module.exports = WebSocketService;

