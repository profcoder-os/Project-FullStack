const express = require('express');
const mongoose = require('mongoose');
const logger = require('../config/logger');

const router = express.Router();

// Health check endpoint
router.get('/', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const wsService = req.app.locals.wsService;
    const wsMetrics = wsService?.getMetrics ? wsService.getMetrics() : null;

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      websocket: {
        connections: wsMetrics?.connections || 0,
        averageLatency: wsMetrics?.averageLatency || 0,
      },
    });
  } catch (error) {
    logger.error(`Health check error: ${error.message}`);
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

// Metrics endpoint
router.get('/metrics', (req, res) => {
  try {
    const wsService = req.app.locals.wsService;
    const wsMetrics = wsService?.getMetrics ? wsService.getMetrics() : null;
    res.json({
      websocket: wsMetrics,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
    });
  } catch (error) {
    logger.error(`Metrics error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

