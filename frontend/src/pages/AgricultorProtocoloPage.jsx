import { useEffect, useState } from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import { getAgricultorMe, salvarSelos } from "../auth/agricultorApi.js";
import { SELOS } from "../selos.js";

export default function AgricultorProtocoloPage() {
  const [selecionados, setSelecionados] = useState(null);
  const [error, setError] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    getAgricultorMe()
      .then((dados) => setSelecionados(dados.selos))
      .catch((err) => setError(err.message));
  }, []);

  function toggleSelo(chave) {
    setSalvo(false);
    setSelecionados((prev) =>
      prev.includes(chave) ? prev.filter((s) => s !== chave) : [...prev, chave]
    );
  }

  async function handleSalvar() {
    setError(null);
    setSalvando(true);
    try {
      await salvarSelos(selecionados);
      setSalvo(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Selos de benefício
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {salvo && <Alert severity="success">Salvo!</Alert>}
      {selecionados && (
        <>
          <FormGroup>
            {SELOS.map(([chave, rotulo]) => (
              <FormControlLabel
                key={chave}
                control={
                  <Checkbox
                    checked={selecionados.includes(chave)}
                    onChange={() => toggleSelo(chave)}
                  />
                }
                label={rotulo}
              />
            ))}
          </FormGroup>
          <Stack sx={{ mt: 2 }}>
            <Button variant="contained" onClick={handleSalvar} disabled={salvando}>
              Salvar
            </Button>
          </Stack>
        </>
      )}
    </Container>
  );
}
