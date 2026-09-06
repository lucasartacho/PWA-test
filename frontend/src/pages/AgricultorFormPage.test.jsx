import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AgricultorFormPage from "./AgricultorFormPage.jsx";
import * as organizacaoApi from "../auth/organizacaoApi.js";

function renderForm(initialPath, path) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path={path} element={<AgricultorFormPage />} />
        <Route path="/organizacao/dashboard" element={<div>Dashboard Stub</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("AgricultorFormPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("cadastra um novo agricultor e navega pro dashboard", async () => {
    vi.spyOn(organizacaoApi, "cadastrarAgricultor").mockResolvedValue({ id: 1 });
    renderForm("/organizacao/agricultores/novo", "/organizacao/agricultores/novo");

    await userEvent.type(screen.getByLabelText(/^Nome do\(a\) Agricultor\(a\)/i), "Maria Agricultora");
    await userEvent.type(screen.getByLabelText(/^CPF do\(a\) agricultor\(a\)/i), "12345678900");
    for (const label of [
      /associado ou cooperado/i,
      /agricultor\(a\) familiar/i,
      /sistema agroflorestal/i,
      /agrotóxico/i,
    ]) {
      await userEvent.click(screen.getByLabelText(label));
      await userEvent.click(await screen.findByRole("option", { name: "Sim" }));
    }
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar" }));

    await waitFor(() => expect(screen.getByText("Dashboard Stub")).toBeInTheDocument());
    expect(organizacaoApi.cadastrarAgricultor).toHaveBeenCalledWith({
      nome: "Maria Agricultora",
      cpf: "12345678900",
      associado_ou_cooperado: true,
      agricultor_familiar: true,
      tem_saf: true,
      usa_agrotoxico: true,
    });
  });

  it("carrega os dados existentes no modo edição", async () => {
    vi.spyOn(organizacaoApi, "obterAgricultor").mockResolvedValue({
      nome: "Maria Agricultora",
      cpf: "12345678900",
      associado_ou_cooperado: true,
      agricultor_familiar: false,
      tem_saf: true,
      usa_agrotoxico: false,
    });
    renderForm("/organizacao/agricultores/1/editar", "/organizacao/agricultores/:id/editar");

    await waitFor(() =>
      expect(screen.getByDisplayValue("Maria Agricultora")).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
  });

  it("mostra um erro quando falha ao carregar o agricultor no modo edição", async () => {
    vi.spyOn(organizacaoApi, "obterAgricultor").mockRejectedValue(
      new Error("Agricultor não encontrado")
    );
    renderForm("/organizacao/agricultores/1/editar", "/organizacao/agricultores/:id/editar");

    await waitFor(() =>
      expect(screen.getByText("Agricultor não encontrado")).toBeInTheDocument()
    );
  });
});
