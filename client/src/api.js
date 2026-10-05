export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(method, url, body) {
  const options = { method, credentials: 'same-origin', headers: {} };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  if (!res.ok) {
    throw new ApiError(res.status, (data && data.error) || 'Request failed with status ' + res.status);
  }
  return data;
}

export function login(username, password) {
  return request('POST', '/api/login', { username, password });
}

export function logout() {
  return request('POST', '/api/logout');
}

export function getMe() {
  return request('GET', '/api/me');
}

export function getDashboard() {
  return request('GET', '/api/dashboard');
}
