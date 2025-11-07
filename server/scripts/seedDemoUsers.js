require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/database');
const logger = require('../config/logger');

const demoUsers = [
  {
    username: 'alice',
    email: 'alice@demo.com',
    password: 'demo123',
    role: 'user',
  },
  {
    username: 'bob',
    email: 'bob@demo.com',
    password: 'demo123',
    role: 'user',
  },
  {
    username: 'charlie',
    email: 'charlie@demo.com',
    password: 'demo123',
    role: 'user',
  },
  {
    username: 'admin',
    email: 'admin@demo.com',
    password: 'admin123',
    role: 'admin',
  },
];

// Note: The User model automatically lowercases emails due to lowercase: true in schema

async function seedDemoUsers() {
  try {
    await connectDB();
    logger.info('Connected to database');

    for (const userData of demoUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email: userData.email }, { username: userData.username }],
      });

      if (existingUser) {
        logger.info(`User ${userData.username} already exists, skipping...`);
        continue;
      }

      // Create new user
      const user = await User.create(userData);
      logger.info(`Created demo user: ${user.username} (${user.email})`);
    }

    logger.info('Demo users seeded successfully!');
    logger.info('\n=== Demo Accounts ===');
    logger.info('Email: alice@demo.com | Password: demo123');
    logger.info('Email: bob@demo.com | Password: demo123');
    logger.info('Email: charlie@demo.com | Password: demo123');
    logger.info('Email: admin@demo.com | Password: admin123');
    logger.info('========================\n');

    process.exit(0);
  } catch (error) {
    logger.error(`Error seeding demo users: ${error.message}`);
    process.exit(1);
  }
}

seedDemoUsers();

