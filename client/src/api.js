async function request(method, url, body) {
  const options = {
    method,
    credentials: 'same-origin',
    headers: { Accept: 'application/json' }
  };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, options);
  } catch (e) {
    const err = new Error('Network error');
    err.status = 0;
    throw err;
  }

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }

  if (!res.ok) {
    const err = new Error((data && data.error) || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

export function login(username, password) {
  return request('POST', '/api/login', { username, password });
}

export function logout() {
  return request('POST', '/api/logout', {});
}

export function me() {
  return request('GET', '/api/me');
}

export function dashboard() {
  return request('GET', '/api/dashboard');
}
