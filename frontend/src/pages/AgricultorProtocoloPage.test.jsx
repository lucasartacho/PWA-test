import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AgricultorProtocoloPage from "./AgricultorProtocoloPage.jsx";
import * as agricultorApi from "../auth/agricultorApi.js";

describe("AgricultorProtocoloPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads existing selos and reflects them as checked", async () => {
    vi.spyOn(agricultorApi, "getAgricultorMe").mockResolvedValue({
      nome: "Maria",
      selos: ["policultivo"],
    });
    render(<AgricultorProtocoloPage />);

    const policultivo = await screen.findByRole("checkbox", { name: "Policultivo" });
    expect(policultivo).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Solo vivo" })).not.toBeChecked();
  });

  it("saves the selected selos", async () => {
    vi.spyOn(agricultorApi, "getAgricultorMe").mockResolvedValue({ nome: "Maria", selos: [] });
    vi.spyOn(agricultorApi, "salvarSelos").mockResolvedValue({ selos: ["boniteza"] });
    render(<AgricultorProtocoloPage />);

    const boniteza = await screen.findByRole("checkbox", { name: "Boniteza" });
    await userEvent.click(boniteza);
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(screen.getByText("Salvo!")).toBeInTheDocument());
    expect(agricultorApi.salvarSelos).toHaveBeenCalledWith(["boniteza"]);
  });

  it("shows an error when loading fails", async () => {
    vi.spyOn(agricultorApi, "getAgricultorMe").mockRejectedValue(
      new Error("Não foi possível carregar seus dados")
    );
    render(<AgricultorProtocoloPage />);
    await waitFor(() =>
      expect(screen.getByText("Não foi possível carregar seus dados")).toBeInTheDocument()
    );
  });
});
