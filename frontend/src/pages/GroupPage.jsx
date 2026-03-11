import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import styles from './GroupPage.module.css';

export default function GroupPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => { loadGroups(); }, []);

  useEffect(() => {
    if (activeGroup) {
      loadMessages(activeGroup._id);
      // Poll for new messages every 3s
      pollRef.current = setInterval(() => loadMessages(activeGroup._id), 3000);
    }
    return () => clearInterval(pollRef.current);
  }, [activeGroup?._id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadGroups = async () => {
    try {
      const res = await axios.get('/api/groups');
      setGroups(res.data.groups);
      if (res.data.groups.length > 0 && !activeGroup) setActiveGroup(res.data.groups[0]);
    } catch {}
  };

  const loadMessages = async (groupId) => {
    try {
      const res = await axios.get(`/api/groups/${groupId}/messages`);
      setMessages(res.data.messages);
    } catch {}
  };

  const handleSend = async () => {
    if (!input.trim() || !activeGroup) return;
    const text = input.trim();
    setInput('');
    try {
      await axios.post(`/api/groups/${activeGroup._id}/messages`, { message: text });
      loadMessages(activeGroup._id);
    } catch {}
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeGroup) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post(`/api/groups/${activeGroup._id}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      loadMessages(activeGroup._id);
    } catch { alert('Upload failed'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post('/api/groups', newGroup);
      setGroups(prev => [res.data.group, ...prev]);
      setActiveGroup(res.data.group);
      setShowCreate(false);
      setNewGroup({ name: '', description: '' });
    } catch { alert('Failed to create group'); }
    finally { setLoading(false); }
  };

  const handleLeave = async (groupId) => {
    if (!confirm('Leave this group?')) return;
    try {
      await axios.delete(`/api/groups/${groupId}/leave`);
      const updated = groups.filter(g => g._id !== groupId);
      setGroups(updated);
      setActiveGroup(updated[0] || null);
      setMessages([]);
    } catch {}
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className={styles.page}>
      {/* Sidebar */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2>Groups</h2>
          <button className={`btn btn-primary ${styles.createBtn}`} onClick={() => setShowCreate(true)}>+</button>
        </div>

        {groups.length === 0 ? (
          <div className={styles.noGroups}>
            <span>💬</span>
            <p>No groups yet</p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create Group</button>
          </div>
        ) : (
          <div className={styles.groupList}>
            {groups.map(g => (
              <div
                key={g._id}
                className={`${styles.groupItem} ${activeGroup?._id === g._id ? styles.activeGroup : ''}`}
                onClick={() => setActiveGroup(g)}
              >
                <div className={styles.groupAvatar}>
                  {g.avatar ? <img src={g.avatar} alt={g.name} /> : <span>{g.name[0].toUpperCase()}</span>}
                </div>
                <div className={styles.groupInfo}>
                  <div className={styles.groupName}>{g.name}</div>
                  <div className={styles.groupMembers}>{g.members?.length || 0} members</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat area */}
      <div className={styles.chatArea}>
        {activeGroup ? (
          <>
            <div className={styles.chatHeader}>
              <div className={styles.chatHeaderInfo}>
                <div className={styles.groupAvatarLg}>
                  {activeGroup.avatar ? <img src={activeGroup.avatar} alt={activeGroup.name} /> : <span>{activeGroup.name[0].toUpperCase()}</span>}
                </div>
                <div>
                  <div className={styles.chatGroupName}>{activeGroup.name}</div>
                  <div className={styles.chatGroupMembers}>{activeGroup.members?.length || 0} members</div>
                </div>
              </div>
              <button
                className={`btn btn-ghost ${styles.leaveBtn}`}
                onClick={() => handleLeave(activeGroup._id)}
              >Leave</button>
            </div>

            <div className={styles.messages}>
              {messages.length === 0 && (
                <div className={styles.noMessages}><span>👋</span><p>Start the conversation!</p></div>
              )}
              {messages.map((msg, idx) => {
                const isMe = msg.sender?._id === user._id;
                return (
                  <div key={msg._id || idx} className={`${styles.msgRow} ${isMe ? styles.outgoing : styles.incoming}`}>
                    {!isMe && (
                      <div className={styles.msgAvatar}>
                        {msg.sender?.avatar
                          ? <img src={msg.sender.avatar} alt={msg.sender.username} />
                          : <div className={styles.msgAvatarFallback}>{msg.sender?.username?.[0]?.toUpperCase()}</div>}
                      </div>
                    )}
                    <div className={styles.msgContent}>
                      {!isMe && <div className={styles.senderName}>{msg.sender?.isAnonymous ? '👤 Anonymous' : msg.sender?.username}</div>}
                      <div className={styles.bubble}>
                        {msg.fileType === 'image' && msg.fileUrl && (
                          <a href={msg.fileUrl} target="_blank" rel="noreferrer">
                            <img src={msg.fileUrl} alt="photo" className={styles.chatImg} />
                          </a>
                        )}
                        {msg.fileType === 'file' && msg.fileUrl && (
                          <a href={msg.fileUrl} target="_blank" rel="noreferrer" className={styles.fileLink}>
                            📎 {msg.fileName || 'Download'}
                          </a>
                        )}
                        {msg.message && <p>{msg.message}</p>}
                        <span className={styles.time}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className={styles.inputArea}>
              <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx,.txt,.zip" />
              <button className={styles.attachBtn} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? '⏳' : '📎'}
              </button>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${activeGroup.name}...`}
                className={styles.input}
                rows={1}
              />
              <button className={`btn btn-primary ${styles.sendBtn}`} onClick={handleSend} disabled={!input.trim()}>➤</button>
            </div>
          </>
        ) : (
          <div className={styles.noChatSelected}>
            <span>💬</span>
            <h3>Select a group or create one</h3>
          </div>
        )}
      </div>

      {/* Create group modal */}
      {showCreate && (
        <div className={styles.modalOverlay} onClick={() => setShowCreate(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Create Group</h2>
            <div className={styles.field}>
              <label>Group Name *</label>
              <input type="text" placeholder="My Group" value={newGroup.name}
                onChange={e => setNewGroup(p => ({ ...p, name: e.target.value }))} maxLength={50} />
            </div>
            <div className={styles.field}>
              <label>Description</label>
              <input type="text" placeholder="Optional description" value={newGroup.description}
                onChange={e => setNewGroup(p => ({ ...p, description: e.target.value }))} maxLength={100} />
            </div>
            <div className={styles.modalActions}>
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateGroup} disabled={loading || !newGroup.name.trim()}>
                {loading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}