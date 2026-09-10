import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import { getAgricultorMe } from "../auth/agricultorApi.js";
import { rotuloSelo } from "../selos.js";

export default function AgricultorInicioPage() {
  const [nome, setNome] = useState(null);
  const [selos, setSelos] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getAgricultorMe()
      .then((dados) => {
        setNome(dados.nome);
        setSelos(dados.selos ?? []);
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      {error && <Typography color="error">{error}</Typography>}
      <Typography variant="h5" component="h1" gutterBottom>
        {nome ? `Olá, ${nome}!` : "Bem-vindo(a)!"}
      </Typography>
      {selos.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}>
          {selos.map((chave) => (
            <Chip key={chave} label={rotuloSelo(chave)} color="primary" />
          ))}
        </Box>
      )}
      <Stack spacing={2} sx={{ mt: 4 }}>
        <Button variant="contained" onClick={() => navigate("/agricultor/protocolo")}>
          Protocolo
        </Button>
      </Stack>
    </Container>
  );
}
