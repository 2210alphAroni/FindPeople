import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import NotificationToast from './NotificationToast';
import styles from './Layout.module.css';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { isConnected, nearbyUsers } = useSocket();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/auth'); };

  return (
    <div className={styles.layout}>
      <nav className={styles.nav}>
        <div className={styles.navLeft}>
          <Link to="/" className={styles.brand}>
            <span className={styles.brandIcon}>◉</span>
            <span>FindPeople</span>
          </Link>
        </div>

        <div className={styles.navCenter}>
          <div className={styles.status}>
            <span className={`${styles.dot} ${isConnected ? styles.online : styles.offline}`} />
            <span>{isConnected ? 'Connected' : 'Offline'}</span>
          </div>
          {isConnected && nearbyUsers.length > 0 && (
            <div className={styles.nearby}>
              <span className={styles.nearbyCount}>{nearbyUsers.length}</span>
              <span>nearby</span>
            </div>
          )}
        </div>

        <div className={styles.navRight}>
          {/* Theme toggle */}
          <button className={styles.themeBtn} onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <Link to="/profile" className={`${styles.navBtn} ${location.pathname === '/profile' ? styles.navActive : ''}`}>
            {user?.avatar ? (
              <img src={user.avatar} alt={user.username} className={styles.navAvatar} />
            ) : (
              <div className={styles.navAvatarFallback}>{user?.username?.[0]?.toUpperCase()}</div>
            )}
            <span className={styles.navUsername}>
              {user?.isAnonymous ? '👤 Anonymous' : user?.username}
            </span>
          </Link>

          <Link to="/groups" className={`${styles.navBtn} ${location.pathname === '/groups' ? styles.navActive : ''}`}>
            💬 Groups
          </Link>

          {user?.role === 'admin' && (
            <Link to="/admin" className={`${styles.navBtn} ${location.pathname === '/admin' ? styles.navActive : ''}`}>
              🛡️ Admin
            </Link>
          )}

          <button onClick={handleLogout} className={`btn btn-ghost ${styles.logoutBtn}`}>Logout</button>
        </div>
      </nav>

      <main className={styles.main}>{children}</main>
      <NotificationToast />
    </div>
  );
}