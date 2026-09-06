import { Outlet, useNavigate, Link as RouterLink } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { useAuth } from "./AuthContext.jsx";

export default function OrgLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/organizacao");
  }

  return (
    <>
      <AppBar position="static">
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="h6">Protocolo de Benefícios dos SAFs</Typography>
          <div>
            <Button color="inherit" component={RouterLink} to="/organizacao/perfil">
              Perfil
            </Button>
            <Button color="inherit" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </Toolbar>
      </AppBar>
      <Outlet />
    </>
  );
}
