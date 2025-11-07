const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: Buffer, // Yjs document state as binary
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  accessControl: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    role: {
      type: String,
      enum: ['owner', 'editor', 'viewer'],
      default: 'viewer',
    },
  }],
  version: {
    type: Number,
    default: 0,
  },
  lastModified: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  vectorClock: {
    type: Map,
    of: Number,
    default: new Map(),
  },
});

documentSchema.index({ owner: 1 });
documentSchema.index({ 'accessControl.user': 1 });
documentSchema.index({ lastModified: -1 });

module.exports = mongoose.model('Document', documentSchema);

