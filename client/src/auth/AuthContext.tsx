import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  // Set once an explicit auth transition (login/logout) has happened, so a
  // late-resolving initial rehydration call can't stomp it (it never
  // supersedes an explicit action, only fills in the unknown state at
  // startup).
  const explicitAuthRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    getMe()
      .then((res) => {
        if (!cancelled && !explicitAuthRef.current) {
          setState({ username: res.username, status: 'authenticated' });
        }
      })
      .catch(() => {
        if (!cancelled && !explicitAuthRef.current) {
          setState({ username: null, status: 'unauthenticated' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setAuthenticated = useCallback((username: string) => {
    explicitAuthRef.current = true;
    setState({ username, status: 'authenticated' });
  }, []);

  const clearAuth = useCallback(() => {
    explicitAuthRef.current = true;
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
