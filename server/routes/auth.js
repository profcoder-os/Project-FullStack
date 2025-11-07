const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../config/logger');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = await User.create({ username, email, password });
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logger.info(`User registered: ${user.username}`);
    res.status(201).json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET is not set in environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      logger.warn(`Login attempt with non-existent email: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      logger.warn(`Invalid password attempt for user: ${user.email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logger.info(`User logged in: ${user.username} (${user.email})`);
    res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (error) {
    logger.error(`Login error: ${error.message}`, { stack: error.stack });
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: { id: req.user._id, username: req.user.username, email: req.user.email } });
});

module.exports = router;

