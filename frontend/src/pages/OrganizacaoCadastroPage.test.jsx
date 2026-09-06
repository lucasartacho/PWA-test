import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import OrganizacaoCadastroPage from "./OrganizacaoCadastroPage.jsx";
import { AuthProvider } from "../auth/AuthContext.jsx";

function renderPage() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/organizacao/cadastro"]}>
        <Routes>
          <Route path="/organizacao/cadastro" element={<OrganizacaoCadastroPage />} />
          <Route path="/organizacao/dashboard" element={<div>Dashboard Stub</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe("OrganizacaoCadastroPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("cadastra e loga a organização, navegando pro dashboard", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 }), { status: 201 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access: "a", refresh: "b" }), { status: 200 })
        )
    );
    renderPage();

    await userEvent.type(screen.getByLabelText("Nome da Associação"), "Coop Teste");
    await userEvent.type(screen.getByLabelText("Razão Social da Associação"), "Coop Teste LTDA");
    await userEvent.type(screen.getByLabelText("CNPJ"), "12345678000199");
    await userEvent.click(
      screen.getByLabelText(/exclusivamente da agricultura familiar/i)
    );
    await userEvent.click(await screen.findByRole("option", { name: "Sim" }));
    await userEvent.type(screen.getByLabelText("Definição de senha"), "senha-segura-123");
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar" }));

    await waitFor(() => expect(screen.getByText("Dashboard Stub")).toBeInTheDocument());
  });
});
