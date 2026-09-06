import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import OrganizacaoLoginPage from "./OrganizacaoLoginPage.jsx";
import { AuthProvider } from "../auth/AuthContext.jsx";

function renderPage() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/organizacao"]}>
        <Routes>
          <Route path="/organizacao" element={<OrganizacaoLoginPage />} />
          <Route path="/organizacao/dashboard" element={<div>Dashboard Stub</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe("OrganizacaoLoginPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("navigates to the dashboard after a successful login", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ access: "a", refresh: "b" }), { status: 200 }))
    );
    renderPage();

    await userEvent.type(screen.getByLabelText(/^CNPJ/i), "12345678000199");
    await userEvent.type(screen.getByLabelText(/^Senha/i), "senha-segura-123");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(screen.getByText("Dashboard Stub")).toBeInTheDocument());
  });

  it("shows an error message on invalid credentials", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    renderPage();

    await userEvent.type(screen.getByLabelText(/^CNPJ/i), "12345678000199");
    await userEvent.type(screen.getByLabelText(/^Senha/i), "senha-errada");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() =>
      expect(screen.getByText("CNPJ ou senha inválidos")).toBeInTheDocument()
    );
  });
});
