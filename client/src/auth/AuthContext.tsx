import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getMe } from '../api/client';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  username: string | null;
  status: AuthStatus;
}

interface AuthContextValue extends AuthState {
  setAuthenticated: (username: string) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ username: null, status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    getMe()
      .then((res) => {
        if (!cancelled) setState({ username: res.username, status: 'authenticated' });
      })
      .catch(() => {
        if (!cancelled) setState({ username: null, status: 'unauthenticated' });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setAuthenticated = useCallback((username: string) => {
    setState({ username, status: 'authenticated' });
  }, []);

  const clearAuth = useCallback(() => {
    setState({ username: null, status: 'unauthenticated' });
  }, []);

  const value = useMemo(
    () => ({ ...state, setAuthenticated, clearAuth }),
    [state, setAuthenticated, clearAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
