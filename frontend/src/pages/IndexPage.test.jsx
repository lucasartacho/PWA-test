import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import IndexPage from "./IndexPage.jsx";

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<IndexPage />} />
        <Route path="/organizacao" element={<div>Organizacao Stub</div>} />
        <Route path="/agricultor" element={<div>Agricultor Stub</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("IndexPage", () => {
  it("shows both access options", () => {
    renderWithRouter();
    expect(
      screen.getByRole("button", { name: "Associação ou Cooperativa" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Agricultor(a)" })
    ).toBeInTheDocument();
  });

  it("navigates to /organizacao when that option is clicked", async () => {
    renderWithRouter();
    await userEvent.click(
      screen.getByRole("button", { name: "Associação ou Cooperativa" })
    );
    expect(screen.getByText("Organizacao Stub")).toBeInTheDocument();
  });

  it("navigates to /agricultor when that option is clicked", async () => {
    renderWithRouter();
    await userEvent.click(screen.getByRole("button", { name: "Agricultor(a)" }));
    expect(screen.getByText("Agricultor Stub")).toBeInTheDocument();
  });
});
