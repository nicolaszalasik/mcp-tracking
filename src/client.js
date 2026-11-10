import { config } from './config.js';
import { lerSessao } from './session.js';

const MENSAGEM_SESSAO =
  'Sessão da Tracking Central ausente ou expirada. Rode a tool `login` para entrar de novo.';

export const requisitar = async (
  metodo,
  caminho,
  corpo,
  { publico = false } = {},
) => {
  const cookie = publico ? '' : config.cookie || (await lerSessao());
  if (!publico && !cookie) throw new Error(MENSAGEM_SESSAO);

  const resposta = await fetch(`${config.baseUrl}${caminho}`, {
    method: metodo,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(cookie && { Cookie: cookie }),
      Origin: config.baseUrl,
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
    redirect: 'manual',
  });

  const redirecionou = resposta.status >= 300 && resposta.status < 400;
  if (redirecionou || [401, 403].includes(resposta.status)) {
    throw new Error(MENSAGEM_SESSAO);
  }

  const texto = await resposta.text();
  if (!resposta.ok) {
    throw new Error(
      `Tracking Central respondeu ${resposta.status} em ${metodo} ${caminho}: ${texto.slice(0, 500)}`,
    );
  }

  try {
    return texto ? JSON.parse(texto) : null;
  } catch {
    throw new Error(
      `Resposta não é JSON em ${metodo} ${caminho}: ${texto.slice(0, 200)}`,
    );
  }
};
