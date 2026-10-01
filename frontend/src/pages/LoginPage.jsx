import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm.jsx';
import { login } from '../api/client.js';

export const LOGIN_ERROR_MESSAGE = 'Invalid username or password';

export default function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  async function handleSubmit(username, password) {
    setError('');
    try {
      await login(username, password);
    } catch (err) {
      // Any failure (401, 500, network) is reported the same way.
      setError(LOGIN_ERROR_MESSAGE);
      return;
    }
    navigate('/dashboard');
  }

  return <LoginForm error={error} onSubmit={handleSubmit} />;
}
