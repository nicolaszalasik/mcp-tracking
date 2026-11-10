# mcp-tracking-central

MCP para criar e editar eventos na Tracking Central da OLX, sem abrir a tela.

## Tools

| Tool | O que faz |
| --- | --- |
| `login` | Abre o Chrome para entrar na central e salva a sessão |
| `listar_destinos` | Lista os destinos (`GET /api/destinations`) |
| `buscar_eventos` | Busca eventos por trecho do nome e devolve id, nome e time |
| `ver_evento` | Mostra um evento e o schema atual pelo id |
| `criar_evento` | Cria um ou vários eventos (`POST /api/events`) |
| `adicionar_campo_evento` | Adiciona campos opcionais a um evento existente (`GET` + `PUT`) |

As tools que gravam (`criar_evento` e `adicionar_campo_evento`) **só mostram a prévia** por padrão. Elas gravam na central apenas com `confirmar: true`, depois de você aprovar a prévia.

O nome do evento segue `{eventType}-a360_{objectName}-{objectDetail}`. O prefixo `a360_` é adicionado se faltar. Todo evento recebe `userGuid`, `organizationGuid` e `temaExperiencia`, e nenhum campo é obrigatório.

## Instalação

```bash
git clone https://github.com/nicolaszalasik/mcp-tracking.git ~/mcp-tracking
cd ~/mcp-tracking
npm install
claude mcp add tracking-central --scope user -- node ~/mcp-tracking/src/server.js
```

Reinicie o Claude Code. Na primeira vez, peça para rodar a tool `login`: abre o Google Chrome, você entra com a conta Microsoft da OLX e a sessão fica salva em `~/.config/mcp-tracking-central/session.json` (permissão 600). Quando expirar, o MCP avisa para rodar `login` de novo.

Sem Chrome, defina `TC_COOKIE` (header `Cookie` copiado do DevTools). Ele tem prioridade sobre a sessão salva. Nunca commite nem cole esse valor em chats.

## Tags e time

`criar_evento` aceita `tags` e `ownerTeamId`. Se você não informar, o Claude pergunta antes de criar. `TC_TAGS` e `TC_OWNER_TEAM_ID` são só os padrões.

## Variáveis de ambiente

| Variável | Padrão |
| --- | --- |
| `TC_COOKIE` | opcional (padrão: sessão do `login`) |
| `TC_BASE_URL` | `https://tracking-central-beta.tracking.prod.olxbr.io` |
| `TC_OWNER_TEAM_ID` | `77` |
| `TC_TAGS` | `altimus,web` |
| `TC_DESTINATION` | `datalake-olx` |
| `TC_DESTINATION_ID` | resolvido pelo nome via `/api/destinations` |
| `TC_OBJECT_PREFIX` | `a360_` |

## Testes

```bash
npm test
```

Os testes cobrem a montagem dos payloads. Eles não chamam a central.
