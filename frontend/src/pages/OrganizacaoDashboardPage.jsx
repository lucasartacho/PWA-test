import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { listarAgricultores, excluirAgricultor } from "../auth/organizacaoApi.js";

export default function OrganizacaoDashboardPage() {
  const [agricultores, setAgricultores] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const dados = await listarAgricultores();
      setAgricultores(dados);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id) {
    await excluirAgricultor(id);
    load();
  }

  if (agricultores === null && !error) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Box role="status" sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress aria-label="Carregando agricultores" />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      {error && <Typography color="error">{error}</Typography>}
      {agricultores &&
        (agricultores.length === 0 ? (
          <Stack spacing={2} alignItems="center" sx={{ py: 8 }}>
            <Inventory2OutlinedIcon sx={{ fontSize: 64 }} color="disabled" />
            <Typography variant="h6">Nenhum(a) agricultor(a) cadastrado(a) ainda</Typography>
            <Button component={RouterLink} to="/organizacao/agricultores/novo" variant="contained">
              Cadastrar agricultor(a)
            </Button>
          </Stack>
        ) : (
          <>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h5">Agricultores(as)</Typography>
              <Button component={RouterLink} to="/organizacao/agricultores/novo" variant="contained">
                Cadastrar agricultor(a)
              </Button>
            </Stack>
            <List>
              {agricultores.map((agricultor) => (
                <ListItem
                  key={agricultor.id}
                  secondaryAction={
                    <>
                      <IconButton
                        component={RouterLink}
                        to={`/organizacao/agricultores/${agricultor.id}/editar`}
                        aria-label={`Editar ${agricultor.nome}`}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(agricultor.id)} aria-label={`Excluir ${agricultor.nome}`}>
                        <DeleteIcon />
                      </IconButton>
                    </>
                  }
                >
                  <ListItemText primary={agricultor.nome} secondary="Protocolo: Ainda não preenchido" />
                </ListItem>
              ))}
            </List>
          </>
        ))}
    </Container>
  );
}
