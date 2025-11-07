const express = require('express');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const logger = require('../config/logger');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Search users by email or username
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ users: [] });
    }

    const users = await User.find({
      $or: [
        { email: { $regex: q, $options: 'i' } },
        { username: { $regex: q, $options: 'i' } },
      ],
      _id: { $ne: req.user._id }, // Exclude current user
    })
    .select('username email _id')
    .limit(10);

    res.json({ users });
  } catch (error) {
    logger.error(`User search error: ${error.message}`);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

module.exports = router;

