import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgricultorAuthProvider, useAgricultorAuth } from "./AgricultorAuthContext.jsx";
import { db } from "../db.js";

function Probe() {
  const { session, login, logout } = useAgricultorAuth();
  return (
    <div>
      <span>{session === undefined ? "carregando" : session ? "logado" : "deslogado"}</span>
      <button onClick={() => login({ token: "abc-token" })}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

describe("AgricultorAuthContext", () => {
  afterEach(async () => {
    await db.agricultorSession.clear();
  });

  it("começa deslogado quando não há sessão salva", async () => {
    render(
      <AgricultorAuthProvider>
        <Probe />
      </AgricultorAuthProvider>
    );
    await waitFor(() => expect(screen.getByText("deslogado")).toBeInTheDocument());
  });

  it("login salva o token no Dexie e atualiza o estado", async () => {
    render(
      <AgricultorAuthProvider>
        <Probe />
      </AgricultorAuthProvider>
    );
    await waitFor(() => expect(screen.getByText("deslogado")).toBeInTheDocument());
    await userEvent.click(screen.getByText("login"));
    await waitFor(() => expect(screen.getByText("logado")).toBeInTheDocument());
    const stored = await db.agricultorSession.get("current");
    expect(stored.token).toBe("abc-token");
  });

  it("logout limpa a sessão do Dexie", async () => {
    await db.agricultorSession.put({ id: "current", token: "abc-token" });
    render(
      <AgricultorAuthProvider>
        <Probe />
      </AgricultorAuthProvider>
    );
    await waitFor(() => expect(screen.getByText("logado")).toBeInTheDocument());
    await userEvent.click(screen.getByText("logout"));
    await waitFor(() => expect(screen.getByText("deslogado")).toBeInTheDocument());
    const stored = await db.agricultorSession.get("current");
    expect(stored).toBeUndefined();
  });

  it("cai pra deslogado se a leitura do Dexie falhar", async () => {
    vi.spyOn(db.agricultorSession, "get").mockRejectedValueOnce(new Error("boom"));
    render(
      <AgricultorAuthProvider>
        <Probe />
      </AgricultorAuthProvider>
    );
    await waitFor(() => expect(screen.getByText("deslogado")).toBeInTheDocument());
    vi.restoreAllMocks();
  });
});
