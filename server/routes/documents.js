const express = require('express');
const Y = require('yjs');
const Document = require('../models/Document');
const crdtService = require('../services/crdtService');
const { authenticate } = require('../middleware/auth');
const { checkDocumentAccess } = require('../middleware/documentAccess');
const logger = require('../config/logger');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create document
router.post('/', async (req, res) => {
  try {
    const { title } = req.body;
    const doc = new Y.Doc();
    const initialState = Y.encodeStateAsUpdate(doc);

    const document = await Document.create({
      title: title || 'Untitled Document',
      content: Buffer.from(initialState),
      owner: req.user._id,
      accessControl: [{
        user: req.user._id,
        role: 'owner',
      }],
    });

    logger.info(`Document created: ${document._id} by ${req.user.username}`);
    res.status(201).json({ document: { id: document._id, title: document.title, createdAt: document.createdAt } });
  } catch (error) {
    logger.error(`Document creation error: ${error.message}`);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// Get all user documents
router.get('/', async (req, res) => {
  try {
    const documents = await Document.find({
      $or: [
        { owner: req.user._id },
        { 'accessControl.user': req.user._id },
      ],
    }).select('title owner createdAt lastModified').sort({ lastModified: -1 });

    res.json({ documents });
  } catch (error) {
    logger.error(`Get documents error: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get document by ID
router.get('/:documentId', checkDocumentAccess('viewer'), async (req, res) => {
  try {
    const { document } = req.documentAccess;
    const state = await crdtService.getDocumentState(document._id.toString());

    // Populate access control with user details
    await document.populate('owner', 'username email');
    await document.populate('accessControl.user', 'username email');

    res.json({
      document: {
        id: document._id,
        title: document.title,
        version: document.version,
        vectorClock: document.vectorClock,
        createdAt: document.createdAt,
        lastModified: document.lastModified,
        owner: {
          id: document.owner._id,
          username: document.owner.username,
          email: document.owner.email,
        },
        accessControl: document.accessControl.map(ac => ({
          user: {
            id: ac.user._id,
            username: ac.user.username,
            email: ac.user.email,
          },
          role: ac.role,
        })),
      },
      state: state.toString('base64'),
    });
  } catch (error) {
    logger.error(`Get document error: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Update document access
router.put('/:documentId/access', checkDocumentAccess('owner'), async (req, res) => {
  try {
    const { document } = req.documentAccess;
    const { userId, role, remove } = req.body;

    if (remove) {
      // Remove user access
      document.accessControl = document.accessControl.filter(
        (ac) => ac.user.toString() !== userId
      );
    } else {
      if (!userId || !['owner', 'editor', 'viewer'].includes(role)) {
        return res.status(400).json({ error: 'Invalid request' });
      }

      const existingAccess = document.accessControl.find(
        (ac) => ac.user.toString() === userId
      );

      if (existingAccess) {
        existingAccess.role = role;
      } else {
        document.accessControl.push({ user: userId, role });
      }
    }

    await document.save();
    logger.info(`Document access updated: ${document._id}`);
    res.json({ message: 'Access updated successfully' });
  } catch (error) {
    logger.error(`Update access error: ${error.message}`);
    res.status(500).json({ error: 'Failed to update access' });
  }
});

// Delete document
router.delete('/:documentId', checkDocumentAccess('owner'), async (req, res) => {
  try {
    const { document } = req.documentAccess;
    await Document.findByIdAndDelete(document._id);
    crdtService.removeDocument(document._id.toString());
    logger.info(`Document deleted: ${document._id}`);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    logger.error(`Delete document error: ${error.message}`);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

module.exports = router;

