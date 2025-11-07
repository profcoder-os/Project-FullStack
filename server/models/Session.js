const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
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
  socketId: {
    type: String,
    required: true,
    index: true,
  },
  cursor: {
    position: Number,
    selectionStart: Number,
    selectionEnd: Number,
  },
  color: {
    type: String,
    default: () => {
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
      return colors[Math.floor(Math.random() * colors.length)];
    },
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  connected: {
    type: Boolean,
    default: true,
  },
});

sessionSchema.index({ documentId: 1, userId: 1 });
sessionSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 3600 }); // 1 hour TTL

module.exports = mongoose.model('Session', sessionSchema);

