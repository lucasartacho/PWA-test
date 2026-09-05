import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";

export default function OrganizacaoPage() {
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Typography variant="h5" component="h1">
        Associação ou Cooperativa
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Em construção — login e cadastro chegam no próximo sub-projeto.
      </Typography>
    </Container>
  );
}
