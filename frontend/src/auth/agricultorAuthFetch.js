import { db } from "../db.js";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const SESSION_ID = "current";

export async function agricultorAuthFetch(path, options = {}) {
  const session = await db.agricultorSession.get(SESSION_ID);
  if (!session) {
    throw new Error("Não autenticado");
  }
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
      Authorization: `Bearer ${session.token}`,
    },
  });
}
