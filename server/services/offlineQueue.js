const logger = require('../config/logger');

class OfflineQueue {
  constructor() {
    this.queues = new Map(); // socketId -> Array<operations>
    this.maxQueueSize = 1000;
  }

  enqueue(socketId, operation) {
    if (!this.queues.has(socketId)) {
      this.queues.set(socketId, []);
    }

    const queue = this.queues.get(socketId);
    
    if (queue.length >= this.maxQueueSize) {
      logger.warn(`Queue full for socket ${socketId}, dropping oldest operation`);
      queue.shift();
    }

    queue.push({
      ...operation,
      timestamp: Date.now(),
      id: `${Date.now()}-${Math.random()}`,
    });

    logger.debug(`Enqueued operation for socket ${socketId}, queue size: ${queue.length}`);
  }

  dequeue(socketId) {
    const queue = this.queues.get(socketId);
    if (!queue || queue.length === 0) {
      return null;
    }

    return queue.shift();
  }

  getAll(socketId) {
    return this.queues.get(socketId) || [];
  }

  clear(socketId) {
    this.queues.delete(socketId);
    logger.debug(`Cleared queue for socket ${socketId}`);
  }

  size(socketId) {
    return this.queues.get(socketId)?.length || 0;
  }
}

module.exports = new OfflineQueue();

