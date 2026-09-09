import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AgricultorProtocoloPage from "./AgricultorProtocoloPage.jsx";
import * as agricultorApi from "../auth/agricultorApi.js";
import { db } from "../db.js";

describe("AgricultorProtocoloPage", () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await db.agricultorSelosPendentes.clear();
  });

  it("loads existing selos and reflects them as checked", async () => {
    vi.spyOn(agricultorApi, "getAgricultorMe").mockResolvedValue({
      nome: "Maria",
      selos: ["policultivo"],
    });
    render(<AgricultorProtocoloPage />);

    const policultivo = screen.getByRole("checkbox", { name: "Policultivo" });
    await waitFor(() => expect(policultivo).toBeChecked());
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

  it("renders the checkboxes immediately even when the initial load fails offline", async () => {
    vi.spyOn(agricultorApi, "getAgricultorMe").mockRejectedValue(new TypeError("Failed to fetch"));
    render(<AgricultorProtocoloPage />);

    expect(screen.getByRole("checkbox", { name: "Boniteza" })).not.toBeChecked();
    expect(screen.queryByText(/não foi possível/i)).not.toBeInTheDocument();
    await waitFor(() => expect(agricultorApi.getAgricultorMe).toHaveBeenCalled());
  });

  it("saves locally and warns instead of erroring when offline", async () => {
    vi.spyOn(agricultorApi, "getAgricultorMe").mockResolvedValue({ nome: "Maria", selos: [] });
    const salvarSelosSpy = vi.spyOn(agricultorApi, "salvarSelos");
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);

    render(<AgricultorProtocoloPage />);

    const boniteza = await screen.findByRole("checkbox", { name: "Boniteza" });
    await userEvent.click(boniteza);
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(screen.getByText(/você está offline/i)).toBeInTheDocument()
    );
    expect(salvarSelosSpy).not.toHaveBeenCalled();
    const pendente = await db.agricultorSelosPendentes.get("current");
    expect(pendente.selos).toEqual(["boniteza"]);
  });

  it("shows a pending banner on load and uploads on demand", async () => {
    await db.agricultorSelosPendentes.put({ id: "current", selos: ["boniteza"] });
    vi.spyOn(agricultorApi, "getAgricultorMe").mockResolvedValue({ nome: "Maria", selos: [] });
    vi.spyOn(agricultorApi, "salvarSelos").mockResolvedValue({ selos: ["boniteza"] });

    render(<AgricultorProtocoloPage />);

    const boniteza = await screen.findByRole("checkbox", { name: "Boniteza" });
    expect(boniteza).toBeChecked();
    expect(
      screen.getByText(/alterações salvas neste dispositivo que ainda não foram enviadas/i)
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Enviar agora" }));

    await waitFor(() => expect(screen.getByText("Salvo!")).toBeInTheDocument());
    expect(agricultorApi.salvarSelos).toHaveBeenCalledWith(["boniteza"]);
    expect(await db.agricultorSelosPendentes.get("current")).toBeUndefined();
  });
});
