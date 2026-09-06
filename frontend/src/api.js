const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export function extractErrorMessage(data, fallback) {
  const messages = Object.values(data ?? {}).flat().filter((m) => typeof m === "string");
  return messages.length > 0 ? messages.join(" ") : fallback;
}

export async function checkHealth() {
  const response = await fetch(`${API_URL}/api/health/`);
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }
  return response.json();
}

export async function loginOrganizacao({ cnpj, password }) {
  const response = await fetch(`${API_URL}/api/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cnpj, password }),
  });
  if (!response.ok) {
    throw new Error("CNPJ ou senha inválidos");
  }
  return response.json();
}

export async function cadastrarOrganizacao(dados) {
  const response = await fetch(`${API_URL}/api/organizacoes/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(data, "Não foi possível cadastrar a organização"));
  }
  return response.json();
}
