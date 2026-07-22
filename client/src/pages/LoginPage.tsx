import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { postLogin, ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { setAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    try {
      const res = await postLogin(username, password);
      setAuthenticated(res.username);
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Invalid username or password');
      } else {
        setError('Something went wrong. Please try again later.');
      }
    }
  };

  return (
    <div className="login-box">
      <h1>Sign in</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Log in</button>
      </form>
      {error && <p className="error">{error}</p>}
      <p className="hint">admin / admin123</p>
    </div>
  );
}
