import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  const clearError = useCallback(() => setError(''), []);

  // The single place API failures are turned into UI behaviour:
  // 401 -> back to the login page, anything else -> a visible message.
  const handleApiError = useCallback(
    (err) => {
      if (err && err.status === 401) {
        setUser(null);
        setError('');
        navigate('/login', { replace: true });
        return;
      }
      setError(GENERIC_ERROR_MESSAGE);
    },
    [navigate]
  );

  const value = useMemo(
    () => ({ user, setUser, error, clearError, handleApiError }),
    [user, error, clearError, handleApiError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return ctx;
}
