import { Navigate } from 'react-router-dom';
import { useAuth } from '../useAuth.js';

// Asks the server who is logged in before rendering the protected view.
// Only a 401 sends the user to /login; any other failure is shown as an error.
export default function RequireAuth({ children }) {
  const auth = useAuth();

  if (auth.status === 'loading') return <p className="status">Loading…</p>;
  if (auth.status === 'unauthenticated') return <Navigate to="/login" replace />;
  if (auth.status === 'error') {
    return <p className="error" role="alert">Could not verify your session. Please try again.</p>;
  }
  return children(auth.username);
}
