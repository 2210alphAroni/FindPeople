import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './AdminPage.module.css';

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('users'); // users | stats

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/'); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        axios.get('/api/admin/stats'),
        axios.get('/api/admin/users'),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users);
    } catch { navigate('/'); }
    finally { setLoading(false); }
  };

  const handleSearch = async (e) => {
    const val = e.target.value;
    setSearch(val);
    try {
      const res = await axios.get(`/api/admin/users?search=${val}`);
      setUsers(res.data.users);
    } catch {}
  };

  const handleBan = async (userId, banned) => {
    try {
      await axios.put(`/api/admin/users/${userId}/ban`, { banned: !banned });
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, banned: !banned } : u));
    } catch {}
  };

  const handleDelete = async (userId, username) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`/api/admin/users/${userId}`);
      setUsers(prev => prev.filter(u => u._id !== userId));
      setStats(prev => ({ ...prev, totalUsers: prev.totalUsers - 1 }));
    } catch {}
  };

  const handleMakeAdmin = async (userId) => {
    try {
      await axios.put(`/api/admin/users/${userId}/role`, { role: 'admin' });
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: 'admin' } : u));
    } catch {}
  };

  if (loading) return (
    <div className={styles.loading}>
      <div className={styles.spinner} />
      <p>Loading admin panel...</p>
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>🛡️ Admin Panel</h1>
          <p>Manage users and monitor activity</p>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>👥</div>
            <div className={styles.statValue}>{stats.totalUsers}</div>
            <div className={styles.statLabel}>Total Users</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>🆕</div>
            <div className={styles.statValue}>{stats.recentUsers}</div>
            <div className={styles.statLabel}>New (7 days)</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>💬</div>
            <div className={styles.statValue}>{stats.totalMessages}</div>
            <div className={styles.statLabel}>Total Messages</div>
          </div>
        </div>
      )}

      {/* Users table */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>All Users</h2>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={handleSearch}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id} className={u.banned ? styles.bannedRow : ''}>
                  <td>
                    <div className={styles.userCell}>
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.username} className={styles.avatar} />
                      ) : (
                        <div className={styles.avatarFallback}>{u.username[0].toUpperCase()}</div>
                      )}
                      <span>{u.username}</span>
                      {u._id === user._id && <span className={styles.youBadge}>You</span>}
                    </div>
                  </td>
                  <td className={styles.emailCell}>{u.email}</td>
                  <td>
                    <span className={`${styles.roleBadge} ${u.role === 'admin' ? styles.adminBadge : ''}`}>
                      {u.role === 'admin' ? '🛡️ Admin' : '👤 User'}
                    </span>
                  </td>
                  <td className={styles.dateCell}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${u.banned ? styles.banned : styles.active}`}>
                      {u.banned ? '🚫 Banned' : '✅ Active'}
                    </span>
                  </td>
                  <td>
                    {u._id !== user._id && (
                      <div className={styles.actions}>
                        <button
                          className={`btn ${u.banned ? 'btn-primary' : 'btn-ghost'} ${styles.actionBtn}`}
                          onClick={() => handleBan(u._id, u.banned)}
                          title={u.banned ? 'Unban' : 'Ban'}
                        >
                          {u.banned ? '✅' : '🚫'}
                        </button>
                        {u.role !== 'admin' && (
                          <button
                            className={`btn btn-ghost ${styles.actionBtn}`}
                            onClick={() => handleMakeAdmin(u._id)}
                            title="Make Admin"
                          >
                            🛡️
                          </button>
                        )}
                        <button
                          className={`btn btn-danger ${styles.actionBtn}`}
                          onClick={() => handleDelete(u._id, u.username)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className={styles.noResults}>No users found</div>
          )}
        </div>
      </div>
    </div>
  );
}
