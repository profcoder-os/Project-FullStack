import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './DocumentList.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function DocumentList() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API_URL}/documents`);
      setDocuments(response.data.documents);
    } catch (error) {
      toast.error('Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const createDocument = async (e) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;

    setCreating(true);
    try {
      const response = await axios.post(`${API_URL}/documents`, {
        title: newDocTitle,
      });
      toast.success('Document created');
      navigate(`/editor/${response.data.document.id}`);
    } catch (error) {
      toast.error('Failed to create document');
    } finally {
      setCreating(false);
      setNewDocTitle('');
    }
  };

  const handleDocumentClick = (documentId) => {
    navigate(`/editor/${documentId}`);
  };

  if (loading) {
    return <div className="loading">Loading documents...</div>;
  }

  return (
    <div className="document-list-container">
      <header className="document-list-header">
        <h1>My Documents</h1>
        <div className="header-actions">
          <span className="username">{user?.username}</span>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </header>

      <div className="document-list-content">
        <form onSubmit={createDocument} className="create-document-form">
          <input
            type="text"
            placeholder="New document title..."
            value={newDocTitle}
            onChange={(e) => setNewDocTitle(e.target.value)}
            className="document-input"
          />
          <button type="submit" disabled={creating || !newDocTitle.trim()}>
            {creating ? 'Creating...' : 'Create'}
          </button>
        </form>

        <div className="documents-grid">
          {documents.length === 0 ? (
            <p className="empty-state">No documents yet. Create one to get started!</p>
          ) : (
            documents.map((doc) => {
              const docId = doc._id || doc.id;
              return (
                <div
                  key={docId}
                  className="document-card"
                  onClick={() => handleDocumentClick(docId)}
                >
                  <h3>{doc.title}</h3>
                  <p className="document-meta">
                    Modified: {new Date(doc.lastModified).toLocaleDateString()}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default DocumentList;

