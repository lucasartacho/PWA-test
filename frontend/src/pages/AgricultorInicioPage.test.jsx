import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AgricultorInicioPage from "./AgricultorInicioPage.jsx";
import * as agricultorApi from "../auth/agricultorApi.js";

describe("AgricultorInicioPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a greeting with the agricultor's name", async () => {
    vi.spyOn(agricultorApi, "getAgricultorMe").mockResolvedValue({
      nome: "Maria Agricultora",
      selos: [],
    });
    render(
      <MemoryRouter>
        <AgricultorInicioPage />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText("Olá, Maria Agricultora!")).toBeInTheDocument());
  });

  it("shows an error when loading fails", async () => {
    vi.spyOn(agricultorApi, "getAgricultorMe").mockRejectedValue(
      new Error("Não foi possível carregar seus dados")
    );
    render(
      <MemoryRouter>
        <AgricultorInicioPage />
      </MemoryRouter>
    );
    await waitFor(() =>
      expect(screen.getByText("Não foi possível carregar seus dados")).toBeInTheDocument()
    );
  });
});
