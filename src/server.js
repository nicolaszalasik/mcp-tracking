#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { requisitar } from './client.js';
import { config } from './config.js';
import { lista, montarEdicao, montarEvento, nomeEvento } from './eventos.js';
import { fazerLogin } from './login.js';

const campoSchema = z.object({
  nome: z.string().describe('Nome do campo, ex.: tipoRejeicao'),
  descricao: z.string().describe('Descrição do campo, sem dado pessoal'),
  tipo: z
    .enum(['string', 'number', 'integer', 'boolean'])
    .default('string')
    .describe('Tipo do campo; nunca é obrigatório'),
});

const confirmarSchema = z
  .boolean()
  .default(false)
  .describe(
    'false (padrão): só mostra o que seria enviado. true: grava na central. Só use true depois do usuário aprovar a prévia.',
  );

const texto = conteudo => ({
  content: [
    {
      type: 'text',
      text:
        typeof conteudo === 'string'
          ? conteudo
          : JSON.stringify(conteudo, null, 2),
    },
  ],
});

const falha = erro => ({
  isError: true,
  content: [{ type: 'text', text: erro.message }],
});

const executar = async acao => {
  try {
    return texto(await acao());
  } catch (erro) {
    return falha(erro);
  }
};

const resolverDestino = async () => {
  if (config.destinoId) return config.destinoId;

  const destinos = lista(
    await requisitar('GET', '/api/destinations', undefined, { publico: true }),
  );
  const alvo = config.destino.toLowerCase();
  const encontrado = destinos.find(destino =>
    Object.values(destino).some(
      valor => typeof valor === 'string' && valor.toLowerCase() === alvo,
    ),
  );
  if (!encontrado) {
    throw new Error(
      `Destino "${config.destino}" não encontrado. Defina TC_DESTINATION_ID. Destinos: ${JSON.stringify(destinos)}`,
    );
  }
  return encontrado.id;
};

const servidor = new McpServer({ name: 'tracking-central', version: '1.0.0' });

servidor.registerTool(
  'login',
  {
    description:
      'Abre o Google Chrome para o usuário entrar na Tracking Central (login Microsoft da OLX) e guarda a sessão. Use quando outra tool disser que a sessão expirou. Aguarda até 3 minutos.',
  },
  () =>
    executar(async () => {
      await fazerLogin();
      return 'Login feito. Sessão salva.';
    }),
);

servidor.registerTool(
  'listar_destinos',
  { description: 'Lista os destinos disponíveis na Tracking Central.' },
  () =>
    executar(() =>
      requisitar('GET', '/api/destinations', undefined, { publico: true }),
    ),
);

servidor.registerTool(
  'buscar_eventos',
  {
    description:
      'Busca eventos na Tracking Central por trecho do nome (ex.: botao_fechar). Devolve id, nome, time e se está ativo. Use antes de criar, para evitar duplicado, e para achar o id de um evento.',
    inputSchema: {
      termo: z.string().min(2).describe('Trecho do nome do evento'),
    },
  },
  ({ termo }) =>
    executar(async () => {
      const consulta = new URLSearchParams({
        search_terms: termo,
        page: '1',
        per_page: '50',
      });
      const eventos = lista(await requisitar('GET', `/api/events?${consulta}`));
      return eventos.map(({ id, name, owner_team_name: time, enabled }) => ({
        id,
        name,
        time,
        enabled,
      }));
    }),
);

servidor.registerTool(
  'ver_evento',
  {
    description:
      'Mostra um evento da Tracking Central (dados e schema atual) pelo id numérico.',
    inputSchema: { id: z.number().int().describe('Id do evento') },
  },
  ({ id }) =>
    executar(async () => ({
      evento: await requisitar('GET', `/api/events/${id}`),
      event_destinations: await requisitar(
        'GET',
        `/api/events/${id}/event_destinations`,
      ),
    })),
);

servidor.registerTool(
  'criar_evento',
  {
    description:
      'Cria eventos de tracking na Tracking Central. O nome segue {eventType}-{prefixo}{objectName}-{objectDetail}, e o prefixo a360_ é adicionado se faltar. Os campos userGuid, organizationGuid e temaExperiencia entram sempre. Tags e time: se o usuário não informou, PERGUNTE a ele antes de chamar (os padrões vêm de TC_TAGS e TC_OWNER_TEAM_ID e podem não servir). Por padrão só mostra a prévia.',
    inputSchema: {
      tags: z
        .array(z.string())
        .optional()
        .describe(
          'Tags dos eventos, ex.: ["altimus","web"]. Pergunte ao usuário.',
        ),
      ownerTeamId: z
        .number()
        .int()
        .optional()
        .describe('Id do time dono dos eventos. Pergunte ao usuário.'),
      eventos: z
        .array(
          z.object({
            eventType: z.string().describe('click, view, scroll...'),
            objectName: z.string(),
            objectDetail: z.string(),
            descricao: z.string(),
            quandoDispara: z
              .string()
              .optional()
              .describe('Quando o evento dispara; padrão = descrição'),
            campos: z.array(campoSchema).default([]),
          }),
        )
        .min(1),
      confirmar: confirmarSchema,
    },
  },
  ({ eventos, tags, ownerTeamId, confirmar }) =>
    executar(async () => {
      const destinationId = await resolverDestino();
      const payload = {
        events: eventos.map(evento =>
          montarEvento({ ...evento, tags, ownerTeamId, destinationId }),
        ),
      };
      if (!confirmar) {
        return {
          previa: true,
          eventos: eventos.map(nomeEvento),
          tags: payload.events[0].tags,
          owner_team_id: payload.events[0].owner_team_id,
          payload,
        };
      }
      return requisitar('POST', '/api/events', payload);
    }),
);

servidor.registerTool(
  'adicionar_campo_evento',
  {
    description:
      'Adiciona campos opcionais ao schema de um evento existente (lê o evento, mantém o resto igual e envia PUT). Por padrão só mostra a prévia.',
    inputSchema: {
      id: z.number().int().describe('Id do evento'),
      campos: z.array(campoSchema).min(1),
      confirmar: confirmarSchema,
    },
  },
  ({ id, campos, confirmar }) =>
    executar(async () => {
      const evento = await requisitar('GET', `/api/events/${id}`);
      const destinos = lista(
        await requisitar('GET', `/api/events/${id}/event_destinations`),
      );
      if (!destinos.length) {
        throw new Error(`Evento ${id} não tem event_destinations.`);
      }
      const payload = montarEdicao(evento, destinos, campos);
      if (!confirmar) {
        return {
          previa: true,
          evento: payload.name,
          camposAdicionados: campos.map(({ nome }) => nome),
          payload,
        };
      }
      return requisitar('PUT', `/api/events/${id}`, payload);
    }),
);

await servidor.connect(new StdioServerTransport());
