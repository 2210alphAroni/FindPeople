import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const NotifContext = createContext(null);

export function NotifProvider({ children }) {
  const [notifs, setNotifs] = useState([]);
  const [permission, setPermission] = useState(Notification.permission);

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(p => setPermission(p));
    }
  }, []);

  const addNotif = useCallback((notif) => {
    const id = Date.now();
    setNotifs(prev => [...prev, { ...notif, id }]);
    // Auto remove after 5s
    setTimeout(() => {
      setNotifs(prev => prev.filter(n => n.id !== id));
    }, 5000);

    // Browser notification
    if (permission === 'granted') {
      new Notification(notif.title, {
        body: notif.body,
        icon: '/vite.svg',
      });
    }
  }, [permission]);

  const removeNotif = useCallback((id) => {
    setNotifs(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotifContext.Provider value={{ notifs, addNotif, removeNotif, permission }}>
      {children}
    </NotifContext.Provider>
  );
}

export const useNotif = () => useContext(NotifContext);
