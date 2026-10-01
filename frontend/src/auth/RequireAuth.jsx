import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getMe } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

// Gates its children on GET /api/me. The check runs on EVERY mount of the guarded
// route (no cached verdict), and any failure - 401, 500 or network - sends the
// user to /login before anything else is loaded.
export default function RequireAuth({ children }) {
  const { setUser } = useAuth();
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((me) => {
        if (cancelled) return;
        setUser(me.username);
        setStatus('ok');
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        setStatus('failed');
      });
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  if (status === 'failed') {
    return <Navigate to="/login" replace />;
  }
  if (status !== 'ok') {
    return null;
  }
  return children;
}
