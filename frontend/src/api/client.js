export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function request(method, url, payload) {
  const options = { method, credentials: 'include', headers: {} };
  if (payload !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(payload);
  }

  let res;
  try {
    res = await fetch(url, options);
  } catch (err) {
    throw new ApiError('Network error', 0);
  }

  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    data = null;
  }

  if (!res.ok) {
    const message = (data && data.error) || 'Request failed with status ' + res.status;
    throw new ApiError(message, res.status, data);
  }
  return data;
}

export function login(username, password) {
  return request('POST', '/api/login', { username, password });
}

export function getMe() {
  return request('GET', '/api/me');
}

export function getDashboard() {
  return request('GET', '/api/dashboard');
}

export function logout() {
  return request('POST', '/api/logout', {});
}
