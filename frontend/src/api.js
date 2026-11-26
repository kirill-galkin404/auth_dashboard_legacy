async function request(path, options = {}) {
  const res = await fetch(path, { credentials: 'same-origin', ...options });
  if (!res.ok) {
    const err = new Error('Request failed with status ' + res.status);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export function login(username, password) {
  return request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
}

export function getMe() {
  return request('/api/me', { method: 'GET' });
}

export function getDashboard() {
  return request('/api/dashboard', { method: 'GET' });
}

export function logout() {
  return request('/api/logout', { method: 'POST' });
}
