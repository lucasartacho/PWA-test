import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";

export default function AgricultorPage() {
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Typography variant="h5" component="h1">
        Agricultor(a)
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Em construção — login por CPF e seleção de selos chegam num próximo sub-projeto.
      </Typography>
    </Container>
  );
}
