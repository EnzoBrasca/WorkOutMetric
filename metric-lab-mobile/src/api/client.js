import { API_URL } from '../config/api';
import { useAuthStore } from '../store/useAuthStore';

// Thin fetch wrapper shared by the domain api modules (mesocycles, routines,
// oneRm). Stores used to call `fetch` inline; this just centralizes the
// Bearer header, JSON body handling and error shape so new endpoints don't
// have to repeat it.
export async function apiRequest(path, { method = 'GET', body } = {}) {
  const token = useAuthStore.getState().token;

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Error responses are `{error: "message"}`, but stay defensive in case a
  // response has no body (e.g. a network-level failure page).
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}
