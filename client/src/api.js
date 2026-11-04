async function request(method, url, body) {
  const options = { method, credentials: 'same-origin' };
  if (body !== undefined) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = new Error('Request failed with status ' + res.status);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export function login(username, password) {
  return request('POST', '/api/login', { username, password });
}

export function me() {
  return request('GET', '/api/me');
}

export function dashboard() {
  return request('GET', '/api/dashboard');
}

export function logout() {
  return request('POST', '/api/logout');
}
