import { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import Link from "@mui/material/Link";
import { loginOrganizacao } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function OrganizacaoLoginPage() {
  const [cnpj, setCnpj] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tokens = await loginOrganizacao({ cnpj, password });
      await login(tokens);
      navigate("/organizacao/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="xs" sx={{ py: 8 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Associação ou Cooperativa
      </Typography>
      <form onSubmit={handleSubmit}>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="CNPJ"
            value={cnpj}
            onChange={(e) => setCnpj(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
          />
          <Button type="submit" variant="contained" disabled={loading}>
            Entrar
          </Button>
          <Link component={RouterLink} to="/organizacao/cadastro">
            Não tem conta? Cadastre-se
          </Link>
        </Stack>
      </form>
    </Container>
  );
}
