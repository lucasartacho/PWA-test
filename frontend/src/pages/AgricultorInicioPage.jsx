import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { getAgricultorMe } from "../auth/agricultorApi.js";

export default function AgricultorInicioPage() {
  const [nome, setNome] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getAgricultorMe()
      .then((dados) => setNome(dados.nome))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      {error && <Typography color="error">{error}</Typography>}
      <Typography variant="h5" component="h1" gutterBottom>
        {nome ? `Olá, ${nome}!` : "Bem-vindo(a)!"}
      </Typography>
      <Stack spacing={2} sx={{ mt: 4 }}>
        <Button variant="contained" onClick={() => navigate("/agricultor/protocolo")}>
          Protocolo
        </Button>
      </Stack>
    </Container>
  );
}
