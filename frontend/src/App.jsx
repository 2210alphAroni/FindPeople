import axios from 'axios';
axios.defaults.baseURL = 'https://findpeople-backend.onrender.com';

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotifProvider } from './context/NotifContext';
import { SocketProvider } from './context/SocketContext';
import AuthPage from './pages/AuthPage';
import MapPage from './pages/MapPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import GroupPage from './pages/GroupPage';
import Layout from './components/Layout';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)', color:'var(--accent)', fontSize:'18px', fontWeight:700, letterSpacing:'2px' }}>
      LOADING...
    </div>
  );
  return user ? children : <Navigate to="/auth" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
      <Route path="/" element={
        <ProtectedRoute>
          <SocketProvider>
            <NotifProvider>
              <Layout><MapPage /></Layout>
            </NotifProvider>
          </SocketProvider>
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <SocketProvider>
            <NotifProvider>
              <Layout><ProfilePage /></Layout>
            </NotifProvider>
          </SocketProvider>
        </ProtectedRoute>
      } />
      <Route path="/groups" element={
        <ProtectedRoute>
          <SocketProvider>
            <NotifProvider>
              <Layout><GroupPage /></Layout>
            </NotifProvider>
          </SocketProvider>
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute>
          <SocketProvider>
            <NotifProvider>
              <Layout><AdminPage /></Layout>
            </NotifProvider>
          </SocketProvider>
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}