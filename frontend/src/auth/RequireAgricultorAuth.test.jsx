import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RequireAgricultorAuth from "./RequireAgricultorAuth.jsx";
import { AgricultorAuthProvider } from "./AgricultorAuthContext.jsx";
import { db } from "../db.js";

function renderProtected() {
  return render(
    <AgricultorAuthProvider>
      <MemoryRouter initialEntries={["/agricultor/inicio"]}>
        <Routes>
          <Route path="/agricultor" element={<div>Login Stub</div>} />
          <Route
            path="/agricultor/inicio"
            element={
              <RequireAgricultorAuth>
                <div>Inicio Protegido</div>
              </RequireAgricultorAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    </AgricultorAuthProvider>
  );
}

describe("RequireAgricultorAuth", () => {
  afterEach(async () => {
    await db.agricultorSession.clear();
  });

  it("shows protected content when a session exists", async () => {
    await db.agricultorSession.put({ id: "current", token: "abc-token" });
    renderProtected();
    await waitFor(() => expect(screen.getByText("Inicio Protegido")).toBeInTheDocument());
  });

  it("redirects to login when there is no session", async () => {
    renderProtected();
    await waitFor(() => expect(screen.getByText("Login Stub")).toBeInTheDocument());
  });
});
