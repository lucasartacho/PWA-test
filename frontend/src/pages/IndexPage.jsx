import { useNavigate } from "react-router-dom";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import GroupsIcon from "@mui/icons-material/Groups";
import AgricultureIcon from "@mui/icons-material/Agriculture";

const OPTIONS = [
  {
    path: "/organizacao",
    label: "Associação ou Cooperativa",
    description: "Cadastre sua organização e seus(suas) agricultores(as).",
    Icon: GroupsIcon,
  },
  {
    path: "/agricultor",
    label: "Agricultor(a)",
    description: "Acesse o Protocolo de Levantamento de Benefícios dos SAFs.",
    Icon: AgricultureIcon,
  },
];

export default function IndexPage() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Benefícios dos SAFs
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Como você quer acessar?
      </Typography>
      <Stack spacing={2}>
        {OPTIONS.map(({ path, label, description, Icon }) => (
          <Card key={path}>
            <CardActionArea
              onClick={() => navigate(path)}
              aria-label={label}
              sx={{ p: 2 }}
            >
              <CardContent
                sx={{ display: "flex", alignItems: "center", gap: 2 }}
              >
                <Icon fontSize="large" color="primary" />
                <div>
                  <Typography variant="button" component="span" sx={{ display: "block" }}>
                    {label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {description}
                  </Typography>
                </div>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Stack>
    </Container>
  );
}
