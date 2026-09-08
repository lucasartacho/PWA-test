import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import OrganizacaoDashboardPage from "./OrganizacaoDashboardPage.jsx";
import * as organizacaoApi from "../auth/organizacaoApi.js";

describe("OrganizacaoDashboardPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the empty state when there are no agricultores", async () => {
    vi.spyOn(organizacaoApi, "listarAgricultores").mockResolvedValue([]);
    render(
      <MemoryRouter>
        <OrganizacaoDashboardPage />
      </MemoryRouter>
    );
    await waitFor(() =>
      expect(screen.getByText("Nenhum(a) agricultor(a) cadastrado(a) ainda")).toBeInTheDocument()
    );
  });

  it("lists agricultores and removes one on delete", async () => {
    vi.spyOn(organizacaoApi, "listarAgricultores")
      .mockResolvedValueOnce([{ id: 1, nome: "Maria Agricultora" }])
      .mockResolvedValueOnce([]);
    vi.spyOn(organizacaoApi, "excluirAgricultor").mockResolvedValue();

    render(
      <MemoryRouter>
        <OrganizacaoDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Maria Agricultora")).toBeInTheDocument());
    expect(screen.getByText("Protocolo: Ainda não preenchido")).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("Excluir Maria Agricultora"));

    await waitFor(() =>
      expect(screen.getByText("Nenhum(a) agricultor(a) cadastrado(a) ainda")).toBeInTheDocument()
    );
    expect(organizacaoApi.excluirAgricultor).toHaveBeenCalledWith(1);
  });

  it("shows an error message when delete fails, without removing the row", async () => {
    vi.spyOn(organizacaoApi, "listarAgricultores").mockResolvedValue([
      { id: 1, nome: "Maria Agricultora" },
    ]);
    vi.spyOn(organizacaoApi, "excluirAgricultor").mockRejectedValue(
      new Error("Não foi possível excluir o(a) agricultor(a)")
    );

    render(
      <MemoryRouter>
        <OrganizacaoDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Maria Agricultora")).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText("Excluir Maria Agricultora"));

    await waitFor(() =>
      expect(screen.getByText("Não foi possível excluir o(a) agricultor(a)")).toBeInTheDocument()
    );
    expect(screen.getByText("Maria Agricultora")).toBeInTheDocument();
  });

  it("shows an error message when the initial fetch fails", async () => {
    vi.spyOn(organizacaoApi, "listarAgricultores").mockRejectedValue(new Error("Falha ao buscar agricultores"));

    render(
      <MemoryRouter>
        <OrganizacaoDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(screen.getByText("Falha ao buscar agricultores")).toBeInTheDocument()
    );
  });
});
