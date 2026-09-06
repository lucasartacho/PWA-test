import { Routes, Route } from "react-router-dom";
import IndexPage from "./pages/IndexPage.jsx";
import AgricultorPage from "./pages/AgricultorPage.jsx";
import DebugPage from "./pages/DebugPage.jsx";
import OrganizacaoLoginPage from "./pages/OrganizacaoLoginPage.jsx";
import OrganizacaoCadastroPage from "./pages/OrganizacaoCadastroPage.jsx";
import OrganizacaoDashboardPage from "./pages/OrganizacaoDashboardPage.jsx";
import AgricultorFormPage from "./pages/AgricultorFormPage.jsx";
import OrganizacaoPerfilPage from "./pages/OrganizacaoPerfilPage.jsx";
import RequireOrgAuth from "./auth/RequireOrgAuth.jsx";
import OrgLayout from "./auth/OrgLayout.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<IndexPage />} />
      <Route path="/organizacao" element={<OrganizacaoLoginPage />} />
      <Route path="/organizacao/cadastro" element={<OrganizacaoCadastroPage />} />
      <Route
        element={
          <RequireOrgAuth>
            <OrgLayout />
          </RequireOrgAuth>
        }
      >
        <Route path="/organizacao/dashboard" element={<OrganizacaoDashboardPage />} />
        <Route path="/organizacao/agricultores/novo" element={<AgricultorFormPage />} />
        <Route path="/organizacao/agricultores/:id/editar" element={<AgricultorFormPage />} />
        <Route path="/organizacao/perfil" element={<OrganizacaoPerfilPage />} />
      </Route>
      <Route path="/agricultor" element={<AgricultorPage />} />
      <Route path="/debug" element={<DebugPage />} />
    </Routes>
  );
}
