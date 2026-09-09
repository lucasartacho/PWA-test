import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AgricultorLoginPage from "./AgricultorLoginPage.jsx";
import { AgricultorAuthProvider } from "../auth/AgricultorAuthContext.jsx";
import { db } from "../db.js";

function renderPage() {
  return render(
    <AgricultorAuthProvider>
      <MemoryRouter initialEntries={["/agricultor"]}>
        <Routes>
          <Route path="/agricultor" element={<AgricultorLoginPage />} />
          <Route path="/agricultor/inicio" element={<div>Inicio Stub</div>} />
        </Routes>
      </MemoryRouter>
    </AgricultorAuthProvider>
  );
}

describe("AgricultorLoginPage", () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await db.agricultorSession.clear();
  });

  it("opens the explanation modal", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Como fazer? / O que é?" }));
    expect(
      screen.getByText(/bem-vindo\(a\) ao Protocolo de Levantamento de Benefícios/)
    ).toBeInTheDocument();
  });

  it("navigates to /agricultor/inicio after a successful login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ token: "abc" }), { status: 200 }))
    );
    renderPage();

    await userEvent.type(screen.getByLabelText(/^CPF/i), "12345678900");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(screen.getByText("Inicio Stub")).toBeInTheDocument());
  });

  it("shows an error when the CPF is not found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ cpf: ["CPF não encontrado em nenhuma organização."] }), {
          status: 400,
        })
      )
    );
    renderPage();

    await userEvent.type(screen.getByLabelText(/^CPF/i), "99999999999");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() =>
      expect(screen.getByText("CPF não encontrado em nenhuma organização.")).toBeInTheDocument()
    );
  });
});
