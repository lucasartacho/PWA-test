import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import { loginAgricultor } from "../auth/agricultorApi.js";
import { ApiValidationError } from "../api.js";
import { formatCPF, onlyDigits } from "../format.js";
import { useAgricultorAuth } from "../auth/AgricultorAuthContext.jsx";

export default function AgricultorLoginPage() {
  const [cpf, setCpf] = useState("");
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const { login } = useAgricultorAuth();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);
    try {
      const tokens = await loginAgricultor({ cpf: onlyDigits(cpf) });
      await login(tokens);
      navigate("/agricultor/inicio");
    } catch (err) {
      if (err instanceof ApiValidationError) {
        setFieldErrors(err.fields);
        // Field-specific errors (e.g. cpf) already render on the field itself via
        // helperText; only surface a top-level Alert for errors with no matching field
        // so the message isn't shown twice.
        if (!err.fields.cpf) {
          setError(err.message);
        }
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="xs" sx={{ py: 8 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Protocolo de Levantamento de Benefícios dos SAFs
      </Typography>
      <Button onClick={() => setMostrarModal(true)} sx={{ mb: 2 }}>
        Como fazer? / O que é?
      </Button>
      <form onSubmit={handleSubmit}>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="CPF"
            value={cpf}
            onChange={(e) => setCpf(formatCPF(e.target.value))}
            required
            fullWidth
            inputMode="numeric"
            error={Boolean(fieldErrors.cpf)}
            helperText={fieldErrors.cpf?.[0] ?? "Coloque seu CPF para entrar no sistema"}
          />
          <Button type="submit" variant="contained" disabled={loading}>
            Entrar
          </Button>
        </Stack>
      </form>
      <Dialog open={mostrarModal} onClose={() => setMostrarModal(false)}>
        <DialogTitle>Protocolo de Levantamento de Benefícios dos SAFs</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Prezado(a) agricultor(a), bem-vindo(a) ao Protocolo de Levantamento de Benefícios dos
            Sistemas Agroflorestais (SAFs)! Este Protocolo é destinado a você, agricultor(a)
            familiar que participa de associação ou cooperativa e que tem sistemas agroflorestais
            de base agroecológica em seu sítio. Com este sistema será possível registrar os
            benefícios do seu SAF e criar um arquivo para imprimir em rótulos ou embalagens,
            comunicando os benefícios dos SAFs aos consumidores de seus produtos.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMostrarModal(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
