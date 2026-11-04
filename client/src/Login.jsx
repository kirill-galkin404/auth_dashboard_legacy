import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from './api.js';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    api
      .login(username, password)
      .then(() => {
        navigate('/dashboard');
      })
      .catch(() => {
        setError('Invalid username or password');
      });
  }

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
