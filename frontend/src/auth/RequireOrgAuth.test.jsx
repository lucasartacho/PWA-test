import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RequireOrgAuth from "./RequireOrgAuth.jsx";
import { AuthProvider } from "./AuthContext.jsx";
import { db } from "../db.js";

function renderProtected() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/organizacao/dashboard"]}>
        <Routes>
          <Route path="/organizacao" element={<div>Login Stub</div>} />
          <Route
            path="/organizacao/dashboard"
            element={
              <RequireOrgAuth>
                <div>Dashboard Protegido</div>
              </RequireOrgAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe("RequireOrgAuth", () => {
  afterEach(async () => {
    await db.session.clear();
  });

  it("shows protected content when a session exists", async () => {
    await db.session.put({ id: "current", access: "a", refresh: "b" });
    renderProtected();
    await waitFor(() => expect(screen.getByText("Dashboard Protegido")).toBeInTheDocument());
  });

  it("redirects to login when there is no session", async () => {
    renderProtected();
    await waitFor(() => expect(screen.getByText("Login Stub")).toBeInTheDocument());
  });
});
