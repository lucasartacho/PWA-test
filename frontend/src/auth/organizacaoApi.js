import { authFetch } from "./authFetch.js";

export async function getPerfil() {
  const response = await authFetch("/api/organizacoes/me/");
  if (!response.ok) throw new Error("Não foi possível carregar o perfil");
  return response.json();
}

export async function atualizarPerfil(dados) {
  const response = await authFetch("/api/organizacoes/me/", {
    method: "PATCH",
    body: JSON.stringify(dados),
  });
  if (!response.ok) throw new Error("Não foi possível atualizar o perfil");
  return response.json();
}

export async function excluirPerfil() {
  const response = await authFetch("/api/organizacoes/me/", { method: "DELETE" });
  if (!response.ok && response.status !== 204) {
    throw new Error("Não foi possível excluir o perfil");
  }
}

export async function listarAgricultores() {
  const response = await authFetch("/api/agricultores/");
  if (!response.ok) throw new Error("Não foi possível carregar os agricultores");
  return response.json();
}

export async function cadastrarAgricultor(dados) {
  const response = await authFetch("/api/agricultores/", {
    method: "POST",
    body: JSON.stringify(dados),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.cpf?.[0] || "Não foi possível cadastrar o(a) agricultor(a)");
  }
  return response.json();
}

export async function obterAgricultor(id) {
  const response = await authFetch(`/api/agricultores/${id}/`);
  if (!response.ok) throw new Error("Agricultor(a) não encontrado(a)");
  return response.json();
}

export async function atualizarAgricultor(id, dados) {
  const response = await authFetch(`/api/agricultores/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(dados),
  });
  if (!response.ok) throw new Error("Não foi possível atualizar o(a) agricultor(a)");
  return response.json();
}

export async function excluirAgricultor(id) {
  const response = await authFetch(`/api/agricultores/${id}/`, { method: "DELETE" });
  if (!response.ok && response.status !== 204) {
    throw new Error("Não foi possível excluir o(a) agricultor(a)");
  }
}
