import { API_URL } from '../config/api';
import { useAuthStore } from '../store/useAuthStore';

// Thin fetch wrapper shared by the domain api modules (mesocycles, routines,
// oneRm). Stores used to call `fetch` inline; this just centralizes the
// Bearer header, JSON body handling and error shape so new endpoints don't
// have to repeat it.
function sendRequest(path, method, body, token) {
  return fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function apiRequest(path, { method = 'GET', body } = {}) {
  const token = useAuthStore.getState().token;

  let response = await sendRequest(path, method, body, token);

  // Supabase access tokens expire after an hour. A persisted session therefore
  // comes back from storage looking valid and 401s on the first request, so a
  // 401 means "renew and retry once" rather than "this failed". If the refresh
  // is itself rejected the store clears the session and the retry 401s again,
  // which surfaces as a normal error instead of an app that shows nothing.
  if (response.status === 401 && token) {
    const freshToken = await useAuthStore.getState().refreshSession();
    if (freshToken) {
      response = await sendRequest(path, method, body, freshToken);
    }
  }

  // Error responses are `{error: "message"}`, but stay defensive in case a
  // response has no body (e.g. a network-level failure page).
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}
