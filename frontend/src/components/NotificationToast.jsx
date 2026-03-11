import { useNotif } from '../context/NotifContext';
import styles from './NotificationToast.module.css';

const icons = {
  nearby: '📍',
  message: '💬',
  seen: '👁️',
  info: 'ℹ️',
  success: '✅',
  error: '❌',
};

export default function NotificationToast() {
  const { notifs, removeNotif } = useNotif();

  return (
    <div className={styles.container}>
      {notifs.map(n => (
        <div key={n.id} className={`${styles.toast} ${styles[n.type || 'info']}`}>
          <span className={styles.icon}>{icons[n.type] || 'ℹ️'}</span>
          <div className={styles.content}>
            <div className={styles.title}>{n.title}</div>
            {n.body && <div className={styles.body}>{n.body}</div>}
          </div>
          <button className={styles.close} onClick={() => removeNotif(n.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}
