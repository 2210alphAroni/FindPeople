import styles from './UserList.module.css';

export default function UserList({ nearbyUsers, onChatClick }) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Nearby People</h3>
        <span className={styles.badge}>{nearbyUsers.length}</span>
      </div>

      {nearbyUsers.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🔍</div>
          <p>No one nearby yet</p>
          <span>People within 500m will appear here</span>
        </div>
      ) : (
        <div className={styles.list}>
          {nearbyUsers.map((user) => (
            <div key={user.socketId} className={styles.userCard}>
              <div className={styles.avatar}>
                {user.avatar && !user.anonymous ? (
                  <img src={user.avatar} alt={user.username} />
                ) : (
                  <div className={`${styles.avatarFallback} ${user.anonymous ? styles.anon : ''}`}>
                    {user.anonymous ? '?' : user.username?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className={styles.onlineDot} />
              </div>

              <div className={styles.info}>
                <div className={styles.name}>
                  {user.anonymous ? (
                    <span className={styles.anonName}>👤 Anonymous</span>
                  ) : (
                    <span>{user.username}</span>
                  )}
                </div>
                <div className={styles.distance}>
                  <span className={styles.distanceBar}>
                    <span
                      className={styles.distanceFill}
                      style={{ width: `${Math.max(10, 100 - (user.distance / 5))}%` }}
                    />
                  </span>
                  <span className={styles.distanceText}>
                    📍 {user.distance}m away
                  </span>
                </div>
              </div>

              <button
                className={`btn btn-primary ${styles.chatBtn}`}
                onClick={() => onChatClick(user)}
                title="Send message"
              >
                💬
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
