//const BASE_URL = 'http://localhost:5000/api';
const BASE_URL = 'https://cartridgeapp.fun/api';

// A 401/403 only means "your session is dead" when the request actually
// carried a token in the first place — login's own 401/403 (wrong
// credentials, unverified account) is a different thing entirely and must
// not trigger this. Clears the stored session and sends the user back to
// the landing page's sign-in, instead of leaving the UI looking logged in
// while every subsequent API call silently fails.
function handleAuthFailure(response, hadToken) {
  if (!hadToken) return;
  if (response.status !== 401 && response.status !== 403) return;

  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  localStorage.removeItem('email');

  // A hard redirect (rather than React Router navigation) is deliberate:
  // this file isn't a component/hook and has no access to AuthContext or
  // useNavigate, and a full reload guarantees AuthProvider re-initializes
  // from the now-cleared localStorage instead of leaving stale React state
  // (userId/email still set) hanging around after the token is gone.
  if (window.location.pathname !== '/') {
    window.location.href = '/';
  }
}

export const api = {

  // get()
  get: async (endpoint, token = null) => {
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: headers,
    });
    handleAuthFailure(response, !!token);
    return response;
  },

  // post()
  post: async (endpoint, body, token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
    });
    handleAuthFailure(response, !!token);
    return response;
  },

  // put()
  put: async (endpoint, body, token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: headers,
      body: JSON.stringify(body),
    });
    handleAuthFailure(response, !!token);
    return response;
  },

  // patch()
  patch: async (endpoint, body, token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: headers,
      body: JSON.stringify(body),
    });
    handleAuthFailure(response, !!token);
    return response;
  },

  // delete()
  delete: async (endpoint, token = null, body = null) => {
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: headers,
      body: body ? JSON.stringify(body) : null,
    });
    handleAuthFailure(response, !!token);
    return response;
  },
};