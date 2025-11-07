import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import './DocumentSettings.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

function DocumentSettings({ documentId, isOpen, onClose, userRole, onUpdate }) {
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addingUser, setAddingUser] = useState(false);

  useEffect(() => {
    if (isOpen && documentId) {
      fetchDocument();
    }
  }, [isOpen, documentId]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/documents/${documentId}`);
      setDocument(response.data.document);
    } catch (error) {
      toast.error('Failed to load document settings');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await axios.get(`${API_URL}/users/search?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data.users || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchUsers(query);
  };

  const addUser = async (userId, role = 'viewer') => {
    try {
      setAddingUser(true);
      await axios.put(`${API_URL}/documents/${documentId}/access`, {
        userId,
        role,
      });
      toast.success('User added successfully');
      setSearchQuery('');
      setSearchResults([]);
      fetchDocument();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add user');
    } finally {
      setAddingUser(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      await axios.put(`${API_URL}/documents/${documentId}/access`, {
        userId,
        role: newRole,
      });
      toast.success('Access updated');
      fetchDocument();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update access');
    }
  };

  const removeUser = async (userId) => {
    if (!window.confirm('Remove this user\'s access to the document?')) {
      return;
    }

    try {
      await axios.put(`${API_URL}/documents/${documentId}/access`, {
        userId,
        remove: true,
      });
      toast.success('User removed');
      fetchDocument();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to remove user');
    }
  };

  const deleteDocument = async () => {
    if (!window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/documents/${documentId}`);
      toast.success('Document deleted');
      onClose();
      window.location.href = '/documents';
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete document');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Document Settings</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {loading ? (
          <div className="settings-loading">Loading...</div>
        ) : (
          <div className="settings-content">
            {/* Document Info */}
            <div className="settings-section">
              <h3>Document Information</h3>
              <p><strong>Title:</strong> {document?.title}</p>
              <p><strong>Owner:</strong> {document?.owner?.username} ({document?.owner?.email})</p>
              <p><strong>Created:</strong> {new Date(document?.createdAt).toLocaleString()}</p>
              <p><strong>Last Modified:</strong> {new Date(document?.lastModified).toLocaleString()}</p>
            </div>

            {/* Share Document */}
            {userRole === 'owner' && (
              <div className="settings-section">
                <h3>Share Document</h3>
                <div className="share-search">
                  <input
                    type="text"
                    placeholder="Search users by email or username..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="share-input"
                  />
                  {searching && <div className="search-loading">Searching...</div>}
                  {searchResults.length > 0 && (
                    <div className="search-results">
                      {searchResults.map((user) => {
                        const hasAccess = document?.accessControl?.some(
                          ac => ac.user.id === user._id
                        );
                        return (
                          <div key={user._id} className="search-result-item">
                            <div className="user-info">
                              <strong>{user.username}</strong>
                              <span>{user.email}</span>
                            </div>
                            {hasAccess ? (
                              <span className="already-shared">Already shared</span>
                            ) : (
                              <div className="add-user-actions">
                                <button
                                  onClick={() => addUser(user._id, 'editor')}
                                  disabled={addingUser}
                                  className="btn-add"
                                >
                                  Add as Editor
                                </button>
                                <button
                                  onClick={() => addUser(user._id, 'viewer')}
                                  disabled={addingUser}
                                  className="btn-add"
                                >
                                  Add as Viewer
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Access Control List */}
            <div className="settings-section">
              <h3>People with Access</h3>
              <div className="access-list">
                {/* Owner */}
                <div className="access-item owner">
                  <div className="user-info">
                    <strong>{document?.owner?.username}</strong>
                    <span>{document?.owner?.email}</span>
                  </div>
                  <span className="role-badge owner">Owner</span>
                </div>

                {/* Shared Users */}
                {document?.accessControl
                  ?.filter(ac => ac.user.id !== document?.owner?.id)
                  .map((access) => (
                    <div key={access.user.id} className="access-item">
                      <div className="user-info">
                        <strong>{access.user.username}</strong>
                        <span>{access.user.email}</span>
                      </div>
                      <div className="access-actions">
                        {userRole === 'owner' ? (
                          <>
                            <select
                              value={access.role}
                              onChange={(e) => updateUserRole(access.user.id, e.target.value)}
                              className="role-select"
                            >
                              <option value="viewer">Viewer</option>
                              <option value="editor">Editor</option>
                            </select>
                            <button
                              onClick={() => removeUser(access.user.id)}
                              className="btn-remove"
                            >
                              Remove
                            </button>
                          </>
                        ) : (
                          <span className={`role-badge ${access.role}`}>
                            {access.role.charAt(0).toUpperCase() + access.role.slice(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Danger Zone */}
            {userRole === 'owner' && (
              <div className="settings-section danger-zone">
                <h3>Danger Zone</h3>
                <button onClick={deleteDocument} className="btn-delete">
                  Delete Document
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DocumentSettings;

