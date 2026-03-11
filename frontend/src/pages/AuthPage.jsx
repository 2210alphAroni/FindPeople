import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import styles from './AuthPage.module.css';

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        if (!form.username || form.username.length < 3) {
          setError('Username must be at least 3 characters');
          setLoading(false);
          return;
        }
        await register(form.username, form.email, form.password);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Background grid */}
      <div className={styles.grid} />

      {/* Glow blobs */}
      <div className={styles.blob1} />
      <div className={styles.blob2} />

      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <span>◉</span>
          </div>
          <h1>FindPeople</h1>
          <p>See who's around you — right now</p>
        </div>

        {/* Toggle */}
        <div className={styles.toggle}>
          <button
            className={`${styles.toggleBtn} ${mode === 'login' ? styles.active : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
          >Login</button>
          <button
            className={`${styles.toggleBtn} ${mode === 'register' ? styles.active : ''}`}
            onClick={() => { setMode('register'); setError(''); }}
          >Register</button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className={styles.field}>
              <label>Username</label>
              <input
                type="text"
                placeholder="your_username"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                required
              />
            </div>
          )}

          <div className={styles.field}>
            <label>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
            />
          </div>

          <div className={styles.field}>
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
              minLength={6}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className={`btn btn-primary ${styles.submitBtn}`} disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Login →' : 'Create Account →'}
          </button>
        </form>

        <p className={styles.hint}>
          Your location is only shared while you're on the map. We respect your privacy.
        </p>
      </div>
    </div>
  );
}
