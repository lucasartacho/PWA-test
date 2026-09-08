import { agricultorAuthFetch } from "./agricultorAuthFetch.js";
import { ApiValidationError } from "../api.js";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function loginAgricultor({ cpf }) {
  const response = await fetch(`${API_URL}/api/agricultor/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cpf }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiValidationError(data, "Não foi possível entrar");
  }
  return response.json();
}

export async function getAgricultorMe() {
  const response = await agricultorAuthFetch("/api/agricultor/me/");
  if (!response.ok) throw new Error("Não foi possível carregar seus dados");
  return response.json();
}

export async function salvarSelos(selos) {
  const response = await agricultorAuthFetch("/api/agricultor/selos/", {
    method: "PUT",
    body: JSON.stringify({ selos }),
  });
  if (!response.ok) throw new Error("Não foi possível salvar os selos");
  return response.json();
}
