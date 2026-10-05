import { useEffect, useState } from 'react';
import { getMe } from './api.js';

// status: 'loading' | 'authenticated' | 'unauthenticated' (401 only) | 'error'
export function useAuth() {
  const [state, setState] = useState({ status: 'loading', username: null });

  useEffect(() => {
    let cancelled = false;
    getMe().then(
      (me) => {
        if (!cancelled) setState({ status: 'authenticated', username: me.username });
      },
      (err) => {
        if (cancelled) return;
        setState({ status: err && err.status === 401 ? 'unauthenticated' : 'error', username: null });
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
