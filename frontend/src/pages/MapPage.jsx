import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useNotif } from '../context/NotifContext';
import UserList from '../components/UserList';
import ChatPanel from '../components/ChatPanel';
import styles from './MapPage.module.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const createUserIcon = (color = '#00ff88', label = '') => L.divIcon({
  className: '',
  html: `<div style="position:relative;width:40px;height:40px;">
    <div style="width:40px;height:40px;border-radius:50%;background:${color};border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-weight:800;color:#000;font-size:14px;box-shadow:0 0 0 3px ${color}44,0 4px 12px rgba(0,0,0,0.5);font-family:'Syne',sans-serif;">${label || '◉'}</div>
    <div style="position:absolute;top:-4px;right:-4px;width:12px;height:12px;border-radius:50%;background:${color};animation:ping 1.5s ease-in-out infinite;opacity:0.6;"></div>
  </div>`,
  iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -20],
});

const createNearbyIcon = (username, anonymous) => {
  const initial = anonymous ? '?' : (username?.[0]?.toUpperCase() || '?');
  return L.divIcon({
    className: '',
    html: `<div style="width:36px;height:36px;border-radius:50%;background:${anonymous ? '#7c3aed' : '#ff6b35'};border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.4);font-family:'Syne',sans-serif;">${initial}</div>`,
    iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -18],
  });
};

function MapController({ position }) {
  const map = useMap();
  useEffect(() => { if (position) map.setView([position.lat, position.lng], map.getZoom() || 16); }, [position?.lat, position?.lng]);
  return null;
}

export default function MapPage() {
  const { user } = useAuth();
  const { updateLocation, nearbyUsers, isConnected, setOnNearby, setOnMessage, setOnSeen } = useSocket();
  const { addNotif } = useNotif();
  const [myPosition, setMyPosition] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [showList, setShowList] = useState(true);
  const [chatUser, setChatUser] = useState(null);
  const watchIdRef = useRef(null);

  // Setup notification callbacks
  useEffect(() => {
    setOnNearby((u) => {
      addNotif({
        type: 'nearby',
        title: 'Someone nearby!',
        body: `${u.anonymous ? 'Anonymous' : u.username} is ${u.distance}m away`,
      });
    });
    setOnMessage((msg) => {
      addNotif({
        type: 'message',
        title: 'New message',
        body: `${msg.from?.username || 'Someone'}: ${msg.message?.slice(0, 40)}`,
      });
    });
    setOnSeen((u) => {
      addNotif({
        type: 'seen',
        title: 'Someone can see you',
        body: `${u.anonymous ? 'Anonymous' : u.username} is nearby`,
      });
    });
  }, [setOnNearby, setOnMessage, setOnSeen, addNotif]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) { setLocationError('Geolocation not supported'); return; }
    setIsTracking(true);
    setLocationError('');
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const position = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyPosition(position);
        if (isConnected) updateLocation(position.lat, position.lng);
      },
      (err) => { setLocationError(`Location error: ${err.message}`); setIsTracking(false); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }, [isConnected, updateLocation]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    setIsTracking(false);
  }, []);

  useEffect(() => () => stopTracking(), []);

  const myIcon = createUserIcon('#00ff88', user?.username?.[0]?.toUpperCase());

  return (
    <div className={styles.page}>
      <div className={styles.mapWrapper}>
        {myPosition ? (
          <MapContainer center={[myPosition.lat, myPosition.lng]} zoom={16} className={styles.map}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
            <MapController position={myPosition} />
            <Circle center={[myPosition.lat, myPosition.lng]} radius={500}
              pathOptions={{ color: '#00ff88', fillColor: '#00ff88', fillOpacity: 0.05, weight: 1.5, dashArray: '6 4' }} />
            <Marker position={[myPosition.lat, myPosition.lng]} icon={myIcon}>
              <Popup><div className={styles.popupContent}><strong>You</strong><span>{user?.isAnonymous ? '🎭 Anonymous' : `@${user?.username}`}</span></div></Popup>
            </Marker>
            {nearbyUsers.map((u) => (
              <Marker key={u.socketId} position={[u.location.lat, u.location.lng]} icon={createNearbyIcon(u.username, u.anonymous)}>
                <Popup>
                  <div className={styles.popupContent}>
                    <strong>{u.anonymous ? '👤 Anonymous' : u.username}</strong>
                    <span>📍 {u.distance}m away</span>
                    <button className={`btn btn-primary ${styles.chatBtn}`} onClick={() => setChatUser(u)}>💬 Message</button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        ) : (
          <div className={styles.noMap}>
            <div className={styles.noMapInner}>
              <div className={styles.radarAnim}>
                <div className={styles.radarRing} />
                <div className={styles.radarRing} style={{ animationDelay: '0.5s' }} />
                <div className={styles.radarRing} style={{ animationDelay: '1s' }} />
                <div className={styles.radarCenter}>◉</div>
              </div>
              <h2>Start Scanning</h2>
              <p>Share your location to see who's nearby within 500 meters</p>
              {locationError && <div className={styles.locationError}>{locationError}</div>}
              <button className="btn btn-primary" onClick={startTracking} style={{ marginTop: '16px', padding: '14px 32px', fontSize: '16px' }}>
                📍 Share My Location
              </button>
            </div>
          </div>
        )}

        {myPosition && (
          <div className={styles.mapControls}>
            <button className={`btn ${isTracking ? 'btn-danger' : 'btn-primary'}`} onClick={isTracking ? stopTracking : startTracking}>
              {isTracking ? '⏹ Stop' : '▶ Track'}
            </button>
            <button className="btn btn-ghost" onClick={() => setShowList(s => !s)}>
              {showList ? '◀ Hide' : '▶ List'}
            </button>
          </div>
        )}
      </div>

      {showList && myPosition && (
        <div className={styles.sidePanel}>
          <UserList nearbyUsers={nearbyUsers} onChatClick={setChatUser} />
        </div>
      )}

      {chatUser && <ChatPanel targetUser={chatUser} onClose={() => setChatUser(null)} />}
    </div>
  );
}
