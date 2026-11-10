import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const DIRETORIO = join(homedir(), '.config', 'mcp-tracking-central');
export const ARQUIVO_SESSAO = join(DIRETORIO, 'session.json');
export const PERFIL_CHROME = join(DIRETORIO, 'chrome-profile');

export const montarCookie = cookies =>
  cookies.map(({ name, value }) => `${name}=${value}`).join('; ');

export const salvarSessao = async cookie => {
  await mkdir(DIRETORIO, { recursive: true, mode: 0o700 });
  await writeFile(ARQUIVO_SESSAO, JSON.stringify({ cookie }), { mode: 0o600 });
  await chmod(ARQUIVO_SESSAO, 0o600);
};

export const lerSessao = async () => {
  try {
    const { cookie } = JSON.parse(await readFile(ARQUIVO_SESSAO, 'utf8'));
    return cookie || '';
  } catch {
    return '';
  }
};
