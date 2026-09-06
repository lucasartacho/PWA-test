import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "./AuthContext.jsx";
import { db } from "../db.js";

function Probe() {
  const { session, login, logout } = useAuth();
  return (
    <div>
      <span>{session === undefined ? "carregando" : session ? "logado" : "deslogado"}</span>
      <button onClick={() => login({ access: "a", refresh: "b" })}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

describe("AuthContext", () => {
  afterEach(async () => {
    await db.session.clear();
  });

  it("começa deslogado quando não há sessão salva", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText("deslogado")).toBeInTheDocument());
  });

  it("login salva a sessão no Dexie e atualiza o estado", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText("deslogado")).toBeInTheDocument());
    await userEvent.click(screen.getByText("login"));
    await waitFor(() => expect(screen.getByText("logado")).toBeInTheDocument());
    const stored = await db.session.get("current");
    expect(stored.access).toBe("a");
  });

  it("logout limpa a sessão do Dexie", async () => {
    await db.session.put({ id: "current", access: "a", refresh: "b" });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText("logado")).toBeInTheDocument());
    await userEvent.click(screen.getByText("logout"));
    await waitFor(() => expect(screen.getByText("deslogado")).toBeInTheDocument());
    const stored = await db.session.get("current");
    expect(stored).toBeUndefined();
  });
});
