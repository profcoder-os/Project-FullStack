const mongoose = require('mongoose');

const operationLogSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  operation: {
    type: Buffer, // Yjs update as binary
    required: true,
  },
  vectorClock: {
    type: Map,
    of: Number,
    required: true,
  },
  lamportTimestamp: {
    type: Number,
    required: true,
  },
  sequenceNumber: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  processed: {
    type: Boolean,
    default: false,
  },
});

operationLogSchema.index({ documentId: 1, sequenceNumber: 1 });
operationLogSchema.index({ documentId: 1, timestamp: 1 });
operationLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 }); // 30 days TTL

module.exports = mongoose.model('OperationLog', operationLogSchema);

