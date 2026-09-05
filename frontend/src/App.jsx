import { Routes, Route } from "react-router-dom";
import IndexPage from "./pages/IndexPage.jsx";
import OrganizacaoPage from "./pages/OrganizacaoPage.jsx";
import AgricultorPage from "./pages/AgricultorPage.jsx";
import DebugPage from "./pages/DebugPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<IndexPage />} />
      <Route path="/organizacao" element={<OrganizacaoPage />} />
      <Route path="/agricultor" element={<AgricultorPage />} />
      <Route path="/debug" element={<DebugPage />} />
    </Routes>
  );
}
