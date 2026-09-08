# Design

Referência de decisões visuais e de UX do PWA-test. Complementa o
[CLAUDE.md](CLAUDE.md) (que cobre estilo de trabalho/código): aqui registramos
o *porquê* de escolhas de UI, não o código em si.

## Fonte de verdade

O fluxo e o layout de cada tela vêm do Figma **"Fluxo do Protocolo de
Benefícios"**. As specs em `docs/superpowers/specs/` decompõem esse fluxo em
fatias verticais e registram decisões de UX tomadas durante a implementação
de cada uma — este arquivo consolida essas decisões por tema, para não
precisar reler todas as specs a cada nova tela.

## Sistema de design

- **Biblioteca:** Material UI (MUI), com tema customizado em
  [`frontend/src/theme.js`](frontend/src/theme.js).
- **Ícones:** ícones nativos do Material Design (`@mui/icons-material`).
  Ilustrações customizadas são explicitamente adiadas (ver Empty states).

## Paleta de cores

Tons de verde a bege claro — remete a agricultura familiar/agrofloresta
sem cair em verde "corporativo" genérico. Verde carrega a identidade
principal (ações, marca); bege compõe o fundo, dando uma sensação mais
orgânica/terrosa do que o cinza padrão do MUI.

| Token | Hex | Uso |
|---|---|---|
| `primary.main` | `#4B7355` | Verde floresta — botões, links, elementos de marca |
| `primary.light` | `#7FA487` | Verde sálvia — hover, estados secundários de destaque |
| `primary.dark` | `#2F4D37` | Verde escuro — texto sobre fundo claro que precise reforçar a marca |
| `secondary.main` | `#A98B5D` | Bege terroso — call-to-action secundário, badges de selo |
| `secondary.light` | `#C9AF88` | Bege claro — variação leve do secundário |
| `background.default` | `#F5F0E6` | Bege claro — fundo geral das telas |
| `background.paper` | `#FBF8F2` | Quase branco quente — cards, formulários |
| `text.primary` | `#2B2A26` | Marrom-acinzentado escuro — mais quente que preto puro |
| `text.secondary` | `#5C5A52` | Marrom-acinzentado médio — legendas, texto de apoio |

Contraste: `primary.main` (#4B7355) sobre `background.default` (#F5F0E6)
passa em AA para texto grande/ícones; texto de corpo deve usar
`text.primary` sobre `background.paper`, não cor sobre cor.

## Convenções estabelecidas

- **Empty states:** usam um ícone MUI (ex.: `Inventory2OutlinedIcon`) com
  mensagem + call-to-action, nunca uma ilustração customizada — decisão
  para não bloquear a fatia vertical em trabalho de ilustração antes de
  validar o fluxo real.
- **Dados não implementados ainda não são simulados:** quando uma feature
  futura ainda não existe (ex.: preenchimento do Protocolo), a tela mostra
  um texto fixo e honesto (ex.: "Ainda não preenchido") em vez de inventar
  dado. Evita telas que parecem prontas mas mentem sobre o estado real do
  sistema.
- **Rotas por perfil:** cada perfil de usuário tem seu próprio prefixo de
  rota (`/organizacao/...`), com uma tela de login pública e as demais
  protegidas (redirecionam para o login do perfil se não houver sessão
  válida).
- **Páginas ficam em `frontend/src/pages/`**, um componente por rota,
  nomeados `<Nome>Page.jsx` (ver `OrganizacaoPage.jsx`,
  `AgricultorPage.jsx`).

- **Mobile-first:** é um webapp (PWA), então layout e componentes são
  desenhados primeiro para telas pequenas e depois adaptados para telas
  maiores — não o contrário. Ver [briefing.md](briefing.md).

## Decisões pendentes

- Tipografia customizada (hoje é o default do MUI — só a paleta foi
  definida).
- Ilustração customizada para empty states (adiada, ver acima).
- Breakpoints específicos do design responsivo (mobile-first já é
  decisão, mas os pontos de quebra ainda não foram definidos).

Atualize esta seção conforme as decisões forem tomadas, movendo o item para
"Convenções estabelecidas" com o motivo da escolha.
