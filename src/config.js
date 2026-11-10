const ler = (nome, padrao) => process.env[nome]?.trim() || padrao;

export const config = {
  baseUrl: ler(
    'TC_BASE_URL',
    'https://tracking-central-beta.tracking.prod.olxbr.io',
  ).replace(/\/$/, ''),
  cookie: ler('TC_COOKIE', ''),
  ownerTeamId: Number(ler('TC_OWNER_TEAM_ID', '77')),
  tags: ler('TC_TAGS', 'altimus,web')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean),
  destino: ler('TC_DESTINATION', 'datalake-olx'),
  destinoId: Number(ler('TC_DESTINATION_ID', '0')) || null,
  prefixoObjeto: ler('TC_OBJECT_PREFIX', 'a360_'),
  camposPadrao: [
    { nome: 'userGuid', descricao: 'guid do usuario' },
    { nome: 'organizationGuid', descricao: 'guid da organizacao' },
    { nome: 'temaExperiencia', descricao: 'tema da experiencia' },
  ],
};
