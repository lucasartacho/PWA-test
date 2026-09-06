import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import MenuItem from "@mui/material/MenuItem";
import { cadastrarOrganizacao, loginOrganizacao } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function OrganizacaoCadastroPage() {
  const [form, setForm] = useState({
    nome: "",
    razao_social: "",
    cnpj: "",
    exclusivamente_agricultura_familiar: "",
    password: "",
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function setField(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await cadastrarOrganizacao({
        nome: form.nome,
        razao_social: form.razao_social,
        cnpj: form.cnpj,
        exclusivamente_agricultura_familiar: form.exclusivamente_agricultura_familiar === "sim",
        password: form.password,
      });
      const tokens = await loginOrganizacao({ cnpj: form.cnpj, password: form.password });
      await login(tokens);
      navigate("/organizacao/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Bem-vindo(a) ao Protocolo de Levantamento de Benefícios dos Sistemas Agroflorestais (SAFs)!
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Este Protocolo é destinado a agricultores(as) familiares organizados em associações ou
        cooperativas e que trabalham com sistemas agroflorestais de base agroecológica.
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Para terem acesso ao Protocolo, a associação ou cooperativa precisa fazer o cadastro e
        também cadastrar os(as) agricultores(as).
      </Typography>
      <form onSubmit={handleSubmit}>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Nome da Associação"
            value={form.nome}
            onChange={setField("nome")}
            required
            fullWidth
            InputLabelProps={{ required: false }}
          />
          <TextField
            label="Razão Social da Associação"
            value={form.razao_social}
            onChange={setField("razao_social")}
            required
            fullWidth
            InputLabelProps={{ required: false }}
          />
          <TextField
            label="CNPJ"
            value={form.cnpj}
            onChange={setField("cnpj")}
            required
            fullWidth
            InputLabelProps={{ required: false }}
          />
          <TextField
            select
            label="Esta associação ou cooperativa é exclusivamente da agricultura familiar?"
            value={form.exclusivamente_agricultura_familiar}
            onChange={setField("exclusivamente_agricultura_familiar")}
            required
            fullWidth
            InputLabelProps={{ required: false }}
          >
            <MenuItem value="sim">Sim</MenuItem>
            <MenuItem value="nao">Não</MenuItem>
          </TextField>
          <TextField
            label="Definição de senha"
            type="password"
            value={form.password}
            onChange={setField("password")}
            required
            fullWidth
            InputLabelProps={{ required: false }}
          />
          <Button type="submit" variant="contained" disabled={loading}>
            Cadastrar
          </Button>
        </Stack>
      </form>
    </Container>
  );
}
