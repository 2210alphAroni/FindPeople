import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import styles from './ProfilePage.module.css';

export default function ProfilePage() {
  const { user, updateUser, toggleAnonymous } = useAuth();
  const [form, setForm] = useState({ username: user?.username || '', bio: user?.bio || '' });
  const [anonName, setAnonName] = useState(user?.anonymousName || '');
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [message, setMessage] = useState('');
  const [pwMessage, setPwMessage] = useState('');
  const fileInputRef = useRef(null);

  const showMsg = (msg, target = 'profile') => {
    if (target === 'profile') { setMessage(msg); setTimeout(() => setMessage(''), 3000); }
    else { setPwMessage(msg); setTimeout(() => setPwMessage(''), 3000); }
  };

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      const res = await axios.put('/api/users/profile', form);
      updateUser(res.data.user);
      showMsg('✅ Profile saved!');
    } catch (err) { showMsg(`❌ ${err.response?.data?.message || 'Error'}`); }
    finally { setSaving(false); }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await axios.post('/api/users/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateUser(res.data.user);
      showMsg('✅ Avatar updated!');
    } catch { showMsg('❌ Upload failed'); }
    finally { setUploading(false); }
  };

  const handleToggleAnon = async () => {
    try {
      await toggleAnonymous(!user.isAnonymous, anonName);
      showMsg(user.isAnonymous ? '✅ Anonymous mode off' : '✅ Anonymous mode on');
    } catch { showMsg('❌ Failed'); }
  };

  const handlePasswordChange = async () => {
    const { currentPassword, newPassword, confirmPassword } = pwForm;
    if (!currentPassword || !newPassword || !confirmPassword) return showMsg('❌ All fields required', 'pw');
    if (newPassword !== confirmPassword) return showMsg('❌ Passwords do not match', 'pw');
    if (newPassword.length < 6) return showMsg('❌ Password must be at least 6 characters', 'pw');
    setChangingPw(true);
    try {
      await axios.put('/api/auth/change-password', { currentPassword, newPassword });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showMsg('✅ Password changed!', 'pw');
    } catch (err) { showMsg(`❌ ${err.response?.data?.message || 'Failed'}`, 'pw'); }
    finally { setChangingPw(false); }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Your Profile</h1>

        {/* Avatar */}
        <div className={styles.avatarSection}>
          <div className={styles.avatarWrapper} onClick={() => fileInputRef.current?.click()}>
            {user?.avatar
              ? <img src={user.avatar} alt={user.username} className={styles.avatar} />
              : <div className={styles.avatarFallback}>{user?.username?.[0]?.toUpperCase()}</div>}
            <div className={styles.avatarOverlay}>{uploading ? 'Uploading...' : '📷 Change'}</div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
          <div className={styles.avatarHint}>Click to change (max 2MB)</div>
        </div>

        {/* Profile info */}
        <div className={styles.section}>
          <h2>Account Info</h2>
          <div className={styles.field}>
            <label>Username</label>
            <input type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="username" />
          </div>
          <div className={styles.field}>
            <label>Email</label>
            <input type="email" value={user?.email} disabled />
          </div>
          <div className={styles.field}>
            <label>Bio</label>
            <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Tell people about yourself..." maxLength={150} rows={3} />
            <span style={{ fontSize: '11px', color: 'var(--text2)', textAlign: 'right' }}>{form.bio.length}/150</span>
          </div>
          <button className="btn btn-primary" onClick={handleProfileSave} disabled={saving} style={{ marginTop: '8px' }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {message && <div className={`${styles.msg} ${message.startsWith('✅') ? styles.success : styles.error}`}>{message}</div>}
        </div>

        {/* Password change */}
        <div className={styles.section}>
          <h2>🔑 Change Password</h2>
          <div className={styles.field}>
            <label>Current Password</label>
            <input type="password" value={pwForm.currentPassword} onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))} placeholder="••••••••" />
          </div>
          <div className={styles.field}>
            <label>New Password</label>
            <input type="password" value={pwForm.newPassword} onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))} placeholder="Min 6 characters" />
          </div>
          <div className={styles.field}>
            <label>Confirm New Password</label>
            <input type="password" value={pwForm.confirmPassword} onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))} placeholder="Repeat new password" />
          </div>
          <button className="btn btn-primary" onClick={handlePasswordChange} disabled={changingPw} style={{ marginTop: '8px' }}>
            {changingPw ? 'Changing...' : 'Change Password'}
          </button>
          {pwMessage && <div className={`${styles.msg} ${pwMessage.startsWith('✅') ? styles.success : styles.error}`}>{pwMessage}</div>}
        </div>

        {/* Anonymous */}
        <div className={styles.section}>
          <h2>Privacy</h2>
          <div className={styles.anonCard}>
            <div>
              <div className={styles.anonTitle}>
                👤 Anonymous Mode
                {user?.isAnonymous && <span className={styles.anonBadge}>ON</span>}
              </div>
              <p>Others see your anonymous name instead of your real profile.</p>
            </div>
            <div className={styles.field} style={{ marginTop: '12px' }}>
              <label>Anonymous Name (optional)</label>
              <input type="text" value={anonName} onChange={e => setAnonName(e.target.value)} placeholder="Leave blank for 'Anonymous'" />
            </div>
            <button className={`btn ${user?.isAnonymous ? 'btn-danger' : 'btn-primary'}`} onClick={handleToggleAnon} style={{ marginTop: '8px' }}>
              {user?.isAnonymous ? '🔓 Disable Anonymous' : '🎭 Enable Anonymous'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}