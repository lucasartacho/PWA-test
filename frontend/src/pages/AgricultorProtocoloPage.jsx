import { useEffect, useState } from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { getAgricultorMe, salvarSelos } from "../auth/agricultorApi.js";
import { SELOS } from "../selos.js";
import { db } from "../db.js";

const PENDENTE_ID = "current";

export default function AgricultorProtocoloPage() {
  const [selecionados, setSelecionados] = useState([]);
  const [error, setError] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [pendente, setPendente] = useState(false);
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" && !navigator.onLine
  );

  useEffect(() => {
    function handleOnline() {
      setOffline(false);
    }
    function handleOffline() {
      setOffline(true);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    db.agricultorSelosPendentes.get(PENDENTE_ID).then((registro) => {
      if (registro) {
        setSelecionados(registro.selos);
        setPendente(true);
      }
      getAgricultorMe()
        .then((dados) => {
          if (!registro) {
            setSelecionados(dados.selos);
          }
        })
        .catch((err) => {
          if (!(err instanceof TypeError)) {
            setError(err.message);
          }
        });
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  function toggleSelo(chave) {
    setSalvo(false);
    setSelecionados((prev) =>
      prev.includes(chave) ? prev.filter((s) => s !== chave) : [...prev, chave]
    );
  }

  async function salvarLocalmente(selos) {
    await db.agricultorSelosPendentes.put({ id: PENDENTE_ID, selos });
    setPendente(true);
    setSalvo(false);
  }

  async function handleSalvar() {
    setError(null);
    setSalvando(true);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await salvarLocalmente(selecionados);
      setSalvando(false);
      return;
    }

    try {
      await salvarSelos(selecionados);
      await db.agricultorSelosPendentes.delete(PENDENTE_ID);
      setPendente(false);
      setSalvo(true);
    } catch (err) {
      if (err instanceof TypeError) {
        await salvarLocalmente(selecionados);
      } else {
        setError(err.message);
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Selos de benefício
      </Typography>
      {offline ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Você está offline. Suas respostas serão salvas neste dispositivo e enviadas quando a
          internet voltar.
        </Alert>
      ) : (
        pendente && (
          <Alert
            severity="info"
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={handleSalvar}>
                Enviar agora
              </Button>
            }
          >
            Você tem alterações salvas neste dispositivo que ainda não foram enviadas.
          </Alert>
        )
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {salvo && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Salvo!
        </Alert>
      )}
      <FormGroup>
        {SELOS.map(([chave, rotulo]) => (
          <FormControlLabel
            key={chave}
            control={
              <Checkbox checked={selecionados.includes(chave)} onChange={() => toggleSelo(chave)} />
            }
            label={rotulo}
          />
        ))}
      </FormGroup>
      <Button variant="contained" onClick={handleSalvar} disabled={salvando} sx={{ mt: 2 }}>
        Salvar
      </Button>
    </Container>
  );
}
