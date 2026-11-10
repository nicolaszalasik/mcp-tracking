import { chromium } from 'playwright-core';
import { config } from './config.js';
import { montarCookie, PERFIL_CHROME, salvarSessao } from './session.js';

const TEMPO_LIMITE_MS = 3 * 60 * 1000;

const estaLogado = async cookie => {
  const resposta = await fetch(`${config.baseUrl}/api/events/1`, {
    headers: { Cookie: cookie, Accept: 'application/json' },
    redirect: 'manual',
  });
  return ![301, 302, 401, 403].includes(resposta.status);
};

const abrirChrome = async () => {
  try {
    return await chromium.launchPersistentContext(PERFIL_CHROME, {
      channel: 'chrome',
      headless: false,
    });
  } catch (erro) {
    throw new Error(
      `Não consegui abrir o Google Chrome (${erro.message.split('\n')[0]}). Instale o Chrome ou use TC_COOKIE.`,
    );
  }
};

export const fazerLogin = async () => {
  const contexto = await abrirChrome();
  try {
    const pagina = contexto.pages()[0] ?? (await contexto.newPage());
    await pagina.goto(`${config.baseUrl}/login`);

    const host = new URL(config.baseUrl).host;
    await pagina.waitForURL(
      url =>
        url.host === host &&
        !['/login', '/authorization'].some(rota =>
          url.pathname.startsWith(rota),
        ),
      { timeout: TEMPO_LIMITE_MS },
    );

    const cookie = montarCookie(await contexto.cookies(config.baseUrl));
    if (!(await estaLogado(cookie))) {
      throw new Error('Login concluído, mas a central não aceitou a sessão.');
    }
    await salvarSessao(cookie);
  } finally {
    await contexto.close();
  }
};
