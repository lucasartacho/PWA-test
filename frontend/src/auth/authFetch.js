import { db } from "../db.js";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const SESSION_ID = "current";

async function refreshAccessToken(refresh) {
  const response = await fetch(`${API_URL}/api/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.access;
}

export async function authFetch(path, options = {}) {
  const session = await db.session.get(SESSION_ID);
  if (!session) {
    throw new Error("Não autenticado");
  }

  const doFetch = (accessToken) =>
    fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });

  let response = await doFetch(session.access);

  if (response.status === 401) {
    const newAccess = await refreshAccessToken(session.refresh);
    if (!newAccess) {
      await db.session.delete(SESSION_ID);
      throw new Error("Sessão expirada");
    }
    await db.session.update(SESSION_ID, { access: newAccess });
    response = await doFetch(newAccess);
  }

  return response;
}
