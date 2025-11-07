const Document = require('../models/Document');
const logger = require('../config/logger');

const checkDocumentAccess = (requiredRole = 'viewer') => {
  return async (req, res, next) => {
    try {
      const documentId = req.params.documentId || req.body.documentId;
      const userId = req.user._id;

      if (!documentId) {
        return res.status(400).json({ error: 'Document ID required' });
      }

      const document = await Document.findById(documentId);
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Check if user is owner
      if (document.owner.toString() === userId.toString()) {
        req.documentAccess = { role: 'owner', document };
        return next();
      }

      // Check access control list
      const access = document.accessControl.find(
        (ac) => ac.user.toString() === userId.toString()
      );

      if (!access) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const roleHierarchy = { viewer: 0, editor: 1, owner: 2 };
      const requiredLevel = roleHierarchy[requiredRole];
      const userLevel = roleHierarchy[access.role];

      if (userLevel < requiredLevel) {
        return res.status(403).json({ 
          error: `Requires ${requiredRole} access, but user has ${access.role}` 
        });
      }

      req.documentAccess = { role: access.role, document };
      next();
    } catch (error) {
      logger.error(`Document access check error: ${error.message}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

module.exports = { checkDocumentAccess };

