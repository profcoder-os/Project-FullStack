const Y = require('yjs');
const Document = require('../models/Document');
const OperationLog = require('../models/OperationLog');
const logger = require('../config/logger');

class CRDTService {
  constructor() {
    this.documents = new Map(); // In-memory Yjs documents
    this.vectorClocks = new Map(); // DocumentId -> Map<userId, clock>
  }

  async getOrCreateDocument(documentId) {
    if (this.documents.has(documentId)) {
      return this.documents.get(documentId);
    }

    const doc = new Y.Doc();
    const dbDocument = await Document.findById(documentId);

    if (dbDocument && dbDocument.content) {
      try {
        Y.applyUpdate(doc, dbDocument.content);
      } catch (error) {
        logger.error(`Error applying document state: ${error.message}`);
      }
    }

    // Initialize vector clock
    if (dbDocument?.vectorClock) {
      this.vectorClocks.set(documentId, new Map(dbDocument.vectorClock));
    } else {
      this.vectorClocks.set(documentId, new Map());
    }

    this.documents.set(documentId, doc);
    return doc;
  }

  async applyUpdate(documentId, update, userId) {
    const doc = await this.getOrCreateDocument(documentId);
    
    try {
      // Apply update to local document
      Y.applyUpdate(doc, update);

      // Update vector clock
      const vectorClock = this.vectorClocks.get(documentId);
      const currentClock = vectorClock.get(userId.toString()) || 0;
      vectorClock.set(userId.toString(), currentClock + 1);

      // Get lamport timestamp (max of all clocks + 1)
      const lamportTimestamp = Math.max(...Array.from(vectorClock.values()), 0) + 1;

      // Log operation
      await this.logOperation(documentId, userId, update, vectorClock, lamportTimestamp);

      // Periodic snapshot (every 100 operations)
      const docModel = await Document.findById(documentId);
      if (docModel && (docModel.version % 100 === 0)) {
        await this.createSnapshot(documentId, doc);
      }

      return { success: true, vectorClock: new Map(vectorClock), lamportTimestamp };
    } catch (error) {
      logger.error(`Error applying update: ${error.message}`);
      throw error;
    }
  }

  async logOperation(documentId, userId, update, vectorClock, lamportTimestamp) {
    const docModel = await Document.findById(documentId);
    const sequenceNumber = docModel ? docModel.version + 1 : 1;

    await OperationLog.create({
      documentId,
      userId,
      operation: Buffer.from(update),
      vectorClock: new Map(vectorClock),
      lamportTimestamp,
      sequenceNumber,
    });

    // Update document version
    if (docModel) {
      docModel.version = sequenceNumber;
      docModel.vectorClock = new Map(vectorClock);
      docModel.lastModified = new Date();
      await docModel.save();
    }
  }

  async createSnapshot(documentId, doc) {
    const state = Y.encodeStateAsUpdate(doc);
    await Document.findByIdAndUpdate(documentId, {
      content: Buffer.from(state),
      lastModified: new Date(),
    });
    logger.info(`Created snapshot for document ${documentId}`);
  }

  async getDocumentState(documentId) {
    const doc = await this.getOrCreateDocument(documentId);
    return Y.encodeStateAsUpdate(doc);
  }

  async reconcileUpdates(documentId, updates) {
    const doc = await this.getOrCreateDocument(documentId);
    
    // Apply all updates in order (Yjs handles conflicts automatically)
    for (const update of updates) {
      try {
        Y.applyUpdate(doc, update);
      } catch (error) {
        logger.error(`Error reconciling update: ${error.message}`);
      }
    }

    return Y.encodeStateAsUpdate(doc);
  }

  async getPendingOperations(documentId, lastVectorClock) {
    const docModel = await Document.findById(documentId);
    if (!docModel) return [];

    // Find operations that happened after the client's last known state
    const operations = await OperationLog.find({
      documentId,
      timestamp: { $gt: lastVectorClock.timestamp || new Date(0) },
    }).sort({ lamportTimestamp: 1, sequenceNumber: 1 }).limit(1000);

    return operations.map(op => ({
      operation: op.operation,
      vectorClock: op.vectorClock,
      lamportTimestamp: op.lamportTimestamp,
      timestamp: op.timestamp,
    }));
  }

  removeDocument(documentId) {
    const doc = this.documents.get(documentId);
    if (doc) {
      doc.destroy();
      this.documents.delete(documentId);
      this.vectorClocks.delete(documentId);
    }
  }
}

module.exports = new CRDTService();

