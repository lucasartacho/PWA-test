import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogActions from "@mui/material/DialogActions";
import { getPerfil, atualizarPerfil, excluirPerfil } from "../auth/organizacaoApi.js";
import { ApiValidationError } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function OrganizacaoPerfilPage() {
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    getPerfil()
      .then((dados) =>
        setForm({
          nome: dados.nome,
          razao_social: dados.razao_social,
          exclusivamente_agricultura_familiar: dados.exclusivamente_agricultura_familiar ? "sim" : "nao",
        })
      )
      .catch((err) => setError(err.message));
  }, []);

  function setField(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    try {
      await atualizarPerfil({
        nome: form.nome,
        razao_social: form.razao_social,
        exclusivamente_agricultura_familiar: form.exclusivamente_agricultura_familiar === "sim",
      });
    } catch (err) {
      setError(err.message);
      if (err instanceof ApiValidationError) {
        setFieldErrors(err.fields);
      }
    }
  }

  function fieldProps(field) {
    const message = fieldErrors[field]?.[0];
    return message ? { error: true, helperText: message } : {};
  }

  async function handleExcluir() {
    try {
      await excluirPerfil();
      await logout();
      navigate("/organizacao");
    } catch (err) {
      setError(err.message);
      setConfirmandoExclusao(false);
    }
  }

  if (form === null) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        {error && <Alert severity="error">{error}</Alert>}
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Perfil da organização
      </Typography>
      <form onSubmit={handleSubmit}>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Nome da Associação"
            value={form.nome}
            onChange={setField("nome")}
            fullWidth
            {...fieldProps("nome")}
          />
          <TextField
            label="Razão Social"
            value={form.razao_social}
            onChange={setField("razao_social")}
            fullWidth
            {...fieldProps("razao_social")}
          />
          <TextField
            select
            label="Exclusivamente da agricultura familiar?"
            value={form.exclusivamente_agricultura_familiar}
            onChange={setField("exclusivamente_agricultura_familiar")}
            fullWidth
          >
            <MenuItem value="sim">Sim</MenuItem>
            <MenuItem value="nao">Não</MenuItem>
          </TextField>
          <Button type="submit" variant="contained">
            Salvar
          </Button>
          <Button color="error" onClick={() => setConfirmandoExclusao(true)}>
            Excluir organização
          </Button>
        </Stack>
      </form>
      <Dialog open={confirmandoExclusao} onClose={() => setConfirmandoExclusao(false)}>
        <DialogTitle>Excluir a organização e todos os agricultores cadastrados?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setConfirmandoExclusao(false)}>Cancelar</Button>
          <Button color="error" onClick={handleExcluir}>
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
