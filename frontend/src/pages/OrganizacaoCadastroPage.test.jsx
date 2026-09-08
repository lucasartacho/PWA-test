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
    // Heaviest test in the suite (multi-field form + MUI select + two sequential
    // mocked fetches). Under Docker CPU contention with the full suite running in
    // parallel workers, this can take 6-7s even though it's not actually broken —
    // see frontend/flaky-test-investigation.md for measurements.
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

    await userEvent.type(screen.getByLabelText(/^Nome da Associação/i), "Coop Teste");
    await userEvent.type(screen.getByLabelText(/^Razão Social da Associação/i), "Coop Teste LTDA");
    await userEvent.type(screen.getByLabelText(/^CNPJ/i), "12345678000199");
    await userEvent.click(
      screen.getByLabelText(/exclusivamente da agricultura familiar/i)
    );
    await userEvent.click(await screen.findByRole("option", { name: "Sim" }));
    await userEvent.type(screen.getByLabelText(/^Definição de senha/i), "senha-segura-123");
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar" }));

    await waitFor(() => expect(screen.getByText("Dashboard Stub")).toBeInTheDocument());
  }, 10000);

  it("mostra os erros de todos os campos retornados pelo backend, não só um", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            cnpj: ["CNPJ deve conter exatamente 14 dígitos numéricos."],
            password: ["Ensure this field has at least 8 characters."],
          }),
          { status: 400 }
        )
      )
    );
    renderPage();

    await userEvent.type(screen.getByLabelText(/^Nome da Associação/i), "Coop Teste");
    await userEvent.type(screen.getByLabelText(/^Razão Social da Associação/i), "Coop Teste LTDA");
    await userEvent.type(screen.getByLabelText(/^CNPJ/i), "123");
    await userEvent.click(
      screen.getByLabelText(/exclusivamente da agricultura familiar/i)
    );
    await userEvent.click(await screen.findByRole("option", { name: "Sim" }));
    await userEvent.type(screen.getByLabelText(/^Definição de senha/i), "senha-com-oito-ou-mais");
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar" }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    const alertText = screen.getByRole("alert").textContent;
    expect(alertText).toContain("CNPJ deve conter exatamente 14 dígitos numéricos.");
    expect(alertText).toContain("Ensure this field has at least 8 characters.");
  });
});
