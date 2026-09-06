import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import OrganizacaoPerfilPage from "./OrganizacaoPerfilPage.jsx";
import * as organizacaoApi from "../auth/organizacaoApi.js";
import { AuthProvider } from "../auth/AuthContext.jsx";

function renderPage() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/organizacao/perfil"]}>
        <Routes>
          <Route path="/organizacao/perfil" element={<OrganizacaoPerfilPage />} />
          <Route path="/organizacao" element={<div>Login Stub</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe("OrganizacaoPerfilPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("carrega e exibe o perfil atual", async () => {
    vi.spyOn(organizacaoApi, "getPerfil").mockResolvedValue({
      nome: "Coop Teste",
      razao_social: "Cooperativa Teste LTDA",
      exclusivamente_agricultura_familiar: true,
    });
    renderPage();
    await waitFor(() => expect(screen.getByDisplayValue("Coop Teste")).toBeInTheDocument());
  });

  it("exclui o perfil, desloga e volta pro login", async () => {
    vi.spyOn(organizacaoApi, "getPerfil").mockResolvedValue({
      nome: "Coop Teste",
      razao_social: "Cooperativa Teste LTDA",
      exclusivamente_agricultura_familiar: true,
    });
    vi.spyOn(organizacaoApi, "excluirPerfil").mockResolvedValue();
    renderPage();

    await waitFor(() => expect(screen.getByDisplayValue("Coop Teste")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Excluir organização" }));
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(screen.getByText("Login Stub")).toBeInTheDocument());
  });

  it("mostra um erro quando falha ao carregar o perfil", async () => {
    vi.spyOn(organizacaoApi, "getPerfil").mockRejectedValue(
      new Error("Não foi possível carregar o perfil")
    );
    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Não foi possível carregar o perfil")).toBeInTheDocument()
    );
  });

  it("mostra um erro quando falha ao excluir o perfil, sem navegar", async () => {
    vi.spyOn(organizacaoApi, "getPerfil").mockResolvedValue({
      nome: "Coop Teste",
      razao_social: "Cooperativa Teste LTDA",
      exclusivamente_agricultura_familiar: true,
    });
    vi.spyOn(organizacaoApi, "excluirPerfil").mockRejectedValue(
      new Error("Não foi possível excluir o perfil")
    );
    renderPage();

    await waitFor(() => expect(screen.getByDisplayValue("Coop Teste")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Excluir organização" }));
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));

    await waitFor(() =>
      expect(screen.getByText("Não foi possível excluir o perfil")).toBeInTheDocument()
    );
    expect(screen.queryByText("Login Stub")).not.toBeInTheDocument();
  });
});
