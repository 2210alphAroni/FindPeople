import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import styles from './ChatPanel.module.css';

export default function ChatPanel({ targetUser, onClose }) {
  const { user } = useAuth();
  const { sendMessage, messages, startTyping, stopTyping, typingUsers } = useSocket();
  const [input, setInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const targetId = targetUser.userId;
  const targetSocketId = targetUser.socketId;

  useEffect(() => {
    if (targetId) {
      setLoading(true);
      axios.get(`/api/messages/${targetId}`).then(res => {
        setChatHistory(res.data.messages.map(m => ({
          id: m._id, message: m.message, fileUrl: m.fileUrl,
          fileType: m.fileType, fileName: m.fileName,
          direction: m.sender._id === user._id ? 'outgoing' : 'incoming',
          from: m.sender, timestamp: new Date(m.createdAt), historical: true,
        })));
      }).catch(() => {}).finally(() => setLoading(false));
    }
  }, [targetId]);

  useEffect(() => {
    const newMsgs = messages.filter(m =>
      (m.direction === 'outgoing' || m.from?.socketId === targetSocketId) &&
      !chatHistory.find(h => h.id === m.id)
    );
    if (newMsgs.length > 0) setChatHistory(prev => [...prev, ...newMsgs]);
  }, [messages]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const msgText = input.trim();
    setInput('');
    stopTyping(targetSocketId);
    const fromUser = {
      userId: user._id,
      username: user.isAnonymous ? (user.anonymousName || 'Anonymous') : user.username,
      avatar: user.isAnonymous ? null : user.avatar,
      anonymous: user.isAnonymous,
    };
    sendMessage(targetSocketId, targetId, msgText, fromUser);
    if (targetId) axios.post('/api/messages', { receiverId: targetId, message: msgText }).catch(() => {});
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !targetId) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('receiverId', targetId);
    try {
      const res = await axios.post('/api/messages/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const msg = res.data.message;
      setChatHistory(prev => [...prev, {
        id: msg._id, message: '', fileUrl: msg.fileUrl,
        fileType: msg.fileType, fileName: msg.fileName,
        direction: 'outgoing', timestamp: new Date(msg.createdAt),
      }]);
      // notify via socket
      sendMessage(targetSocketId, targetId, `📎 Sent a ${msg.fileType === 'image' ? 'photo' : 'file'}: ${msg.fileName}`, {
        userId: user._id, username: user.username, avatar: user.avatar,
      });
    } catch { alert('Upload failed'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    startTyping(targetSocketId);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => stopTyping(targetSocketId), 2000);
  };

  const isTargetTyping = Object.values(typingUsers).some(u => u && u.socketId === targetSocketId);
  const displayName = targetUser.anonymous ? '👤 Anonymous' : targetUser.username;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <div className={styles.avatar}>
            {targetUser.avatar && !targetUser.anonymous
              ? <img src={targetUser.avatar} alt={displayName} />
              : <div className={`${styles.avatarFallback} ${targetUser.anonymous ? styles.anon : ''}`}>{targetUser.anonymous ? '?' : targetUser.username?.[0]?.toUpperCase()}</div>
            }
            <div className={styles.onlineDot} />
          </div>
          <div>
            <div className={styles.name}>{displayName}</div>
            <div className={styles.dist}>📍 {targetUser.distance}m away</div>
          </div>
        </div>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
      </div>

      <div className={styles.messages}>
        {loading && <div className={styles.loadingMsg}>Loading...</div>}
        {chatHistory.length === 0 && !loading && (
          <div className={styles.noMessages}><span>👋</span><p>Say hi to {displayName}!</p></div>
        )}
        {chatHistory.map((msg, idx) => (
          <div key={msg.id || idx} className={`${styles.msgRow} ${msg.direction === 'outgoing' ? styles.outgoing : styles.incoming}`}>
            <div className={styles.bubble}>
              {msg.fileType === 'image' && msg.fileUrl && (
                <a href={msg.fileUrl} target="_blank" rel="noreferrer">
                  <img src={msg.fileUrl} alt="photo" className={styles.chatImg} />
                </a>
              )}
              {msg.fileType === 'file' && msg.fileUrl && (
                <a href={msg.fileUrl} target="_blank" rel="noreferrer" className={styles.fileLink}>
                  📎 {msg.fileName || 'Download file'}
                </a>
              )}
              {msg.message && <p>{msg.message}</p>}
              <span className={styles.time}>{new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        ))}
        {isTargetTyping && (
          <div className={`${styles.msgRow} ${styles.incoming}`}>
            <div className={`${styles.bubble} ${styles.typingBubble}`}>
              <span className={styles.typingDot} /><span className={styles.typingDot} style={{ animationDelay: '0.2s' }} /><span className={styles.typingDot} style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputArea}>
        <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx,.txt,.zip" />
        <button className={styles.attachBtn} onClick={() => fileInputRef.current?.click()} disabled={uploading} title="Attach file">
          {uploading ? '⏳' : '📎'}
        </button>
        <textarea value={input} onChange={handleInputChange} onKeyDown={handleKeyDown}
          placeholder={`Message ${displayName}...`} className={styles.input} rows={1} />
        <button className={`btn btn-primary ${styles.sendBtn}`} onClick={handleSend} disabled={!input.trim()}>➤</button>
      </div>
    </div>
  );
}