import { config } from './config.js';

const SCHEMA_DRAFT = 'http://json-schema.org/draft-04/schema#';

export const comPrefixo = objectName =>
  objectName.startsWith(config.prefixoObjeto)
    ? objectName
    : `${config.prefixoObjeto}${objectName}`;

export const identificador = ({ eventType, objectName, objectDetail }) => [
  eventType,
  comPrefixo(objectName),
  objectDetail,
];

export const nomeEvento = evento => identificador(evento).join('-');

export const montarSchema = (extras = []) => {
  const propriedades = {};
  [...config.camposPadrao, ...extras].forEach(
    ({ nome, descricao, tipo = 'string' }) => {
      propriedades[nome] = { description: descricao, type: tipo };
    },
  );
  return { type: 'object', $schema: SCHEMA_DRAFT, properties: propriedades };
};

export const montarEvento = ({
  destinationId,
  descricao,
  quandoDispara,
  campos,
  tags,
  ownerTeamId,
  ...identidade
}) => ({
  owner_team_id: ownerTeamId ?? config.ownerTeamId,
  description: descricao,
  triggered_when: quandoDispara ?? descricao,
  tags: tags?.length ? tags : config.tags,
  name: nomeEvento(identidade),
  event_destinations: [
    {
      id: null,
      destination_id: destinationId,
      schema: montarSchema(campos),
      destination_identifier: identificador(identidade),
      has_custom_table: false,
    },
  ],
  context_fields: [],
});

export const lista = resposta => {
  if (Array.isArray(resposta)) return resposta;
  const interna = resposta?.data ?? resposta?.results ?? resposta?.items;
  return Array.isArray(interna) ? interna : [];
};

const nomeDaTag = tag => (typeof tag === 'string' ? tag : tag?.name);

// A central devolve as tags agrupadas em tag_types; as de tipos ocultos
// (ex.: destination/lurker) são geridas por ela e não entram no PUT.
export const tagsDoEvento = evento => {
  if (Array.isArray(evento.tags)) {
    return evento.tags.map(nomeDaTag).filter(Boolean);
  }
  return (evento.tag_types ?? [])
    .filter(tipo => tipo.should_appear_in_ui !== false)
    .flatMap(tipo => tipo.tags ?? [])
    .map(tag => tag.value)
    .filter(Boolean);
};

export const lerSchema = schema =>
  typeof schema === 'string' ? JSON.parse(schema) : schema;

export const adicionarCampos = (schema, novos) => {
  const atual = lerSchema(schema) ?? {};
  const propriedades = { ...(atual.properties ?? {}) };
  const repetidos = novos.filter(({ nome }) => nome in propriedades);
  if (repetidos.length) {
    throw new Error(
      `Campo já existe no schema: ${repetidos.map(({ nome }) => nome).join(', ')}`,
    );
  }
  novos.forEach(({ nome, descricao, tipo = 'string' }) => {
    propriedades[nome] = { description: descricao, type: tipo };
  });
  return { ...atual, properties: propriedades };
};

export const montarEdicao = (evento, destinos, novos) => {
  const destinosEditados = destinos.map(destino => ({
    id: destino.id,
    destination_id: destino.destination_id,
    schema: adicionarCampos(destino.schema, novos),
    destination_identifier: destino.destination_identifier,
    has_custom_table: destino.has_custom_table ?? false,
  }));

  return {
    owner_team_id: evento.owner_team_id ?? evento.owner_team?.id,
    description: evento.description,
    triggered_when: evento.triggered_when,
    tags: tagsDoEvento(evento),
    name: evento.name,
    event_destinations: destinosEditados,
    context_fields: evento.context_fields ?? [],
  };
};
