import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import * as Y from 'yjs';
import axios from 'axios';
import { toast } from 'react-toastify';
import DocumentSettings from './DocumentSettings';
import './Editor.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:5001';

function Editor() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef(null);
  const socketRef = useRef(null);
  const ydocRef = useRef(null);
  const ytextRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [documentTitle, setDocumentTitle] = useState('Loading...');
  const [content, setContent] = useState('');
  const [presence, setPresence] = useState({});
  const [pendingOperations, setPendingOperations] = useState([]);
  const [isOffline, setIsOffline] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [userRole, setUserRole] = useState('viewer');
  const cursorThrottleRef = useRef(0);
  const lastCursorRef = useRef({ position: 0, selectionStart: 0, selectionEnd: 0 });
  const clientIdRef = useRef(0);
  const vectorClockRef = useRef({});
  const isLocalChangeRef = useRef(false);

  useEffect(() => {
    fetchDocumentInfo();
    initializeEditor();
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const fetchDocumentInfo = async () => {
    try {
      const response = await axios.get(`${API_URL}/documents/${documentId}`);
      const doc = response.data.document;
      setDocumentTitle(doc.title);
      
      // Determine user role by checking if current user is owner or has access
      try {
        const meResponse = await axios.get(`${API_URL}/auth/me`);
        const currentUserId = meResponse.data.user.id;
        
        if (doc.owner?.id === currentUserId || doc.owner?._id === currentUserId) {
          setUserRole('owner');
        } else {
          const access = doc.accessControl?.find(
            ac => ac.user?.id === currentUserId || ac.user?._id === currentUserId
          );
          setUserRole(access?.role || 'viewer');
        }
      } catch (authError) {
        // If we can't get user info, default to viewer
        setUserRole('viewer');
      }
    } catch (error) {
      console.error('Error fetching document info:', error);
      toast.error('Failed to load document');
    }
  };

  const initializeEditor = async () => {
    try {
      // Initialize Yjs document
      const ydoc = new Y.Doc();
      const ytext = ydoc.getText('content');
      ydocRef.current = ydoc;
      ytextRef.current = ytext;

      // Initialize WebSocket connection
      const token = localStorage.getItem('token');
      const socket = io(WS_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      socketRef.current = socket;

      // Socket event handlers
      socket.on('connect', () => {
        setConnected(true);
        setIsOffline(false);
        toast.success('Connected');
        socket.emit('join-document', { documentId });
      });

      socket.on('disconnect', () => {
        setConnected(false);
        setIsOffline(true);
        toast.warning('Disconnected. Changes will sync when reconnected.');
      });

      socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        toast.error('Connection failed');
      });

      socket.on('document-state', async ({ state, version, vectorClock }) => {
        try {
          const stateBuffer = Uint8Array.from(atob(state), c => c.charCodeAt(0));
          Y.applyUpdate(ydoc, stateBuffer);
          vectorClockRef.current = vectorClock || {};
          
          // Process pending operations
          if (pendingOperations.length > 0) {
            await processPendingOperations();
          }
        } catch (error) {
          console.error('Error applying document state:', error);
        }
      });

      socket.on('document-update', ({ update, vectorClock, lamportTimestamp, userId, clientId }) => {
        try {
          // Skip if this is our own update (already applied optimistically)
          if (clientId === clientIdRef.current) {
            return;
          }

          const updateBuffer = Uint8Array.from(atob(update), c => c.charCodeAt(0));
          Y.applyUpdate(ydoc, updateBuffer);
          vectorClockRef.current = vectorClock || {};
        } catch (error) {
          console.error('Error applying update:', error);
        }
      });

      socket.on('update-ack', ({ clientId, vectorClock, lamportTimestamp }) => {
        // Remove acknowledged operation from pending queue
        setPendingOperations(prev => prev.filter(op => op.clientId !== clientId));
        vectorClockRef.current = vectorClock || {};
      });

      socket.on('cursor-update', ({ userId, username, cursor }) => {
        setPresence(prev => ({
          ...prev,
          [userId]: { ...prev[userId], cursor, username },
        }));
      });

      socket.on('user-joined', ({ userId, username, color }) => {
        setPresence(prev => ({
          ...prev,
          [userId]: { username, color, cursor: null },
        }));
        toast.info(`${username} joined`);
      });

      socket.on('user-left', ({ userId, username }) => {
        setPresence(prev => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
        toast.info(`${username} left`);
      });

      socket.on('presence-update', ({ users }) => {
        const presenceMap = {};
        users.forEach(user => {
          presenceMap[user.userId] = user;
        });
        setPresence(presenceMap);
      });

      socket.on('error', ({ message }) => {
        toast.error(message);
        if (message.includes('Access denied') || message.includes('not found')) {
          navigate('/documents');
        }
      });

      // Yjs text observer - only update if change came from Yjs (not from our own input)
      ytext.observe((event) => {
        // Only update if this is a remote change (not from our typing)
        if (!isLocalChangeRef.current) {
          const text = ytext.toString();
          setContent(text);
          
          // Only update cursor if textarea is not focused (remote update)
          requestAnimationFrame(() => {
            const textarea = editorRef.current;
            if (textarea && document.activeElement !== textarea) {
              const cursorPos = Math.min(textarea.selectionStart || 0, text.length);
              textarea.setSelectionRange(cursorPos, cursorPos);
            }
          });
        } else {
          // Reset flag after a short delay to allow rapid typing
          setTimeout(() => {
            isLocalChangeRef.current = false;
          }, 50);
        }
      });

      // Initial content
      setContent(ytext.toString());

    } catch (error) {
      console.error('Initialization error:', error);
      toast.error('Failed to initialize editor');
    }
  };

  const processPendingOperations = async () => {
    if (!socketRef.current?.connected || pendingOperations.length === 0) {
      return;
    }

    const operations = [...pendingOperations];
    setPendingOperations([]);

    for (const op of operations) {
      try {
        socketRef.current.emit('document-update', {
          documentId,
          update: op.update,
          vectorClock: op.vectorClock,
          clientId: op.clientId,
        });
      } catch (error) {
        console.error('Error sending pending operation:', error);
        setPendingOperations(prev => [...prev, op]);
      }
    }
  };

  const handleTextChange = useCallback((e) => {
    if (!ytextRef.current || !ydocRef.current) return;

    const textarea = e.target;
    const newValue = textarea.value;
    const oldValue = ytextRef.current.toString();
    
    if (newValue === oldValue) return;

    // Mark as local change to prevent observer from updating
    isLocalChangeRef.current = true;
    
    // Get cursor position before we modify Yjs
    const cursorPos = textarea.selectionStart;
    
    // Simple approach: replace entire content if lengths are very different
    // Otherwise, calculate minimal diff
    const oldLength = oldValue.length;
    const newLength = newValue.length;
    
    if (Math.abs(oldLength - newLength) > 100 || oldLength === 0) {
      // Large change or empty document - replace all
      const ydoc = ydocRef.current;
      ydoc.transact(() => {
        if (oldLength > 0) {
          ytextRef.current.delete(0, oldLength);
        }
        if (newLength > 0) {
          ytextRef.current.insert(0, newValue);
        }
      }, 'user-input');
    } else {
      // Small change - calculate diff
      let start = 0;
      while (start < oldLength && start < newLength && oldValue[start] === newValue[start]) {
        start++;
      }
      
      let endOld = oldLength;
      let endNew = newLength;
      while (endOld > start && endNew > start && oldValue[endOld - 1] === newValue[endNew - 1]) {
        endOld--;
        endNew--;
      }
      
      // Apply changes in a transaction
      const ydoc = ydocRef.current;
      ydoc.transact(() => {
        if (endOld > start) {
          ytextRef.current.delete(start, endOld - start);
        }
        if (endNew > start) {
          ytextRef.current.insert(start, newValue.substring(start, endNew));
        }
      }, 'user-input');
    }

    // Update content state immediately so textarea shows the change
    setContent(newValue);

    // Restore cursor position - preserve the actual cursor position from textarea
    // Don't override it, just ensure it's valid
    requestAnimationFrame(() => {
      if (textarea && document.activeElement === textarea) {
        // Use the actual current cursor position, not the saved one
        const currentCursor = textarea.selectionStart;
        const currentSelectionEnd = textarea.selectionEnd;
        // Only adjust if cursor is out of bounds
        if (currentCursor > newValue.length) {
          textarea.setSelectionRange(newValue.length, newValue.length);
        } else if (currentSelectionEnd > newValue.length) {
          textarea.setSelectionRange(currentCursor, newValue.length);
        }
      }
    });

    // Send update optimistically
    const update = Y.encodeStateAsUpdate(ydocRef.current);
    const clientId = ++clientIdRef.current;
    const updateBase64 = btoa(String.fromCharCode(...update));

    if (socketRef.current?.connected) {
      socketRef.current.emit('document-update', {
        documentId,
        update: updateBase64,
        vectorClock: vectorClockRef.current,
        clientId,
      });

      // Add to pending operations for ACK tracking
      setPendingOperations(prev => [...prev, {
        clientId,
        update: updateBase64,
        vectorClock: vectorClockRef.current,
        timestamp: Date.now(),
      }]);
    } else {
      // Queue for offline
      setPendingOperations(prev => [...prev, {
        clientId,
        update: updateBase64,
        vectorClock: vectorClockRef.current,
        timestamp: Date.now(),
      }]);
      setIsOffline(true);
    }
  }, [documentId]);

  // Removed calculateDiff - using direct Yjs operations instead

  const handleCursorChange = useCallback(() => {
    if (!editorRef.current) return;

    const textarea = editorRef.current;
    const position = textarea.selectionStart;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;

    // Throttle cursor updates (max once per 50ms)
    const now = Date.now();
    if (now - cursorThrottleRef.current < 50) {
      return;
    }
    cursorThrottleRef.current = now;

    // Only send if cursor actually changed
    if (
      position === lastCursorRef.current.position &&
      selectionStart === lastCursorRef.current.selectionStart &&
      selectionEnd === lastCursorRef.current.selectionEnd
    ) {
      return;
    }

    lastCursorRef.current = { position, selectionStart, selectionEnd };

    if (socketRef.current?.connected) {
      socketRef.current.emit('cursor-update', {
        documentId,
        cursor: { position, selectionStart, selectionEnd },
      });
    }
  }, [documentId]);

  const cleanup = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (ydocRef.current) {
      ydocRef.current.destroy();
      ydocRef.current = null;
    }
  };

  return (
    <div className="editor-container">
      <header className="editor-header">
        <button onClick={() => navigate('/documents')} className="back-btn">
          ← Back
        </button>
        <h1>{documentTitle}</h1>
        <div className="header-actions">
          <button onClick={() => setShowSettings(true)} className="settings-btn">
            ⚙️ Settings
          </button>
        </div>
        <div className="editor-status">
          <span className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? '● Connected' : '○ Disconnected'}
          </span>
          {Object.keys(presence).length > 0 && (
            <div className="presence-indicators">
              {Object.entries(presence).map(([userId, data]) => (
                <span
                  key={userId}
                  className="presence-badge"
                  style={{ borderColor: data.color || '#667eea' }}
                  title={data.username}
                >
                  {data.username?.[0]?.toUpperCase() || 'U'}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="editor-content">
        <textarea
          ref={editorRef}
          value={content}
          onChange={handleTextChange}
          onSelect={handleCursorChange}
          onKeyUp={handleCursorChange}
          onMouseUp={handleCursorChange}
          className="editor-textarea"
          placeholder="Start typing..."
          spellCheck={false}
        />
      </div>

      {isOffline && pendingOperations.length > 0 && (
        <div className="offline-indicator">
          {pendingOperations.length} pending change(s) - will sync when reconnected
        </div>
      )}

      <DocumentSettings
        documentId={documentId}
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        userRole={userRole}
        onUpdate={fetchDocumentInfo}
      />
    </div>
  );
}

export default Editor;

