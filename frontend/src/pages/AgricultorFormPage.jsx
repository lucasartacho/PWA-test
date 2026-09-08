import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import { cadastrarAgricultor, obterAgricultor, atualizarAgricultor } from "../auth/organizacaoApi.js";
import { ApiValidationError } from "../api.js";
import { formatCPF, onlyDigits } from "../format.js";

const CAMPOS_SIM_NAO = [
  ["associado_ou_cooperado", "O(A) agricultor(a) é associado ou cooperado?"],
  ["agricultor_familiar", "É agricultor(a) familiar?"],
  ["tem_saf", "O(A) agricultor(a) tem sistema agroflorestal (SAF) em sua propriedade/sítio?"],
  ["usa_agrotoxico", "O(A) agricultor(a) usa algum tipo de agrotóxico na propriedade?"],
];

const FORM_VAZIO = {
  nome: "",
  cpf: "",
  associado_ou_cooperado: "",
  agricultor_familiar: "",
  tem_saf: "",
  usa_agrotoxico: "",
};

export default function AgricultorFormPage() {
  const { id } = useParams();
  const isEdicao = Boolean(id);
  const [form, setForm] = useState(FORM_VAZIO);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isEdicao) return;
    obterAgricultor(id)
      .then((dados) =>
        setForm({
          nome: dados.nome,
          cpf: formatCPF(dados.cpf),
          associado_ou_cooperado: dados.associado_ou_cooperado ? "sim" : "nao",
          agricultor_familiar: dados.agricultor_familiar ? "sim" : "nao",
          tem_saf: dados.tem_saf ? "sim" : "nao",
          usa_agrotoxico: dados.usa_agrotoxico ? "sim" : "nao",
        })
      )
      .catch((err) => setError(err.message));
  }, [id, isEdicao]);

  function setField(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  function setCpfField(event) {
    setForm((prev) => ({ ...prev, cpf: formatCPF(event.target.value) }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);
    const payload = {
      nome: form.nome,
      cpf: onlyDigits(form.cpf),
      associado_ou_cooperado: form.associado_ou_cooperado === "sim",
      agricultor_familiar: form.agricultor_familiar === "sim",
      tem_saf: form.tem_saf === "sim",
      usa_agrotoxico: form.usa_agrotoxico === "sim",
    };
    try {
      if (isEdicao) {
        await atualizarAgricultor(id, payload);
      } else {
        await cadastrarAgricultor(payload);
      }
      navigate("/organizacao/dashboard");
    } catch (err) {
      setError(err.message);
      if (err instanceof ApiValidationError) {
        setFieldErrors(err.fields);
      }
    } finally {
      setLoading(false);
    }
  }

  function fieldProps(field) {
    const message = fieldErrors[field]?.[0];
    return message ? { error: true, helperText: message } : {};
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        {isEdicao ? "Editar agricultor(a)" : "Cadastrar agricultor(a)"}
      </Typography>
      <form onSubmit={handleSubmit}>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Nome do(a) Agricultor(a)"
            value={form.nome}
            onChange={setField("nome")}
            required
            fullWidth
            {...fieldProps("nome")}
          />
          <TextField
            label="CPF do(a) agricultor(a)"
            value={form.cpf}
            onChange={setCpfField}
            required
            fullWidth
            inputMode="numeric"
            {...fieldProps("cpf")}
          />
          {CAMPOS_SIM_NAO.map(([campo, rotulo]) => (
            <TextField
              key={campo}
              select
              label={rotulo}
              value={form[campo]}
              onChange={setField(campo)}
              required
              fullWidth
            >
              <MenuItem value="sim">Sim</MenuItem>
              <MenuItem value="nao">Não</MenuItem>
            </TextField>
          ))}
          <Button type="submit" variant="contained" disabled={loading}>
            {isEdicao ? "Salvar" : "Cadastrar"}
          </Button>
        </Stack>
      </form>
    </Container>
  );
}
