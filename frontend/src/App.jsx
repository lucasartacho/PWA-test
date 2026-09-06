import { Routes, Route } from "react-router-dom";
import IndexPage from "./pages/IndexPage.jsx";
import AgricultorPage from "./pages/AgricultorPage.jsx";
import DebugPage from "./pages/DebugPage.jsx";
import OrganizacaoLoginPage from "./pages/OrganizacaoLoginPage.jsx";
import OrganizacaoCadastroPage from "./pages/OrganizacaoCadastroPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<IndexPage />} />
      <Route path="/organizacao" element={<OrganizacaoLoginPage />} />
      <Route path="/organizacao/cadastro" element={<OrganizacaoCadastroPage />} />
      <Route path="/agricultor" element={<AgricultorPage />} />
      <Route path="/debug" element={<DebugPage />} />
    </Routes>
  );
}
