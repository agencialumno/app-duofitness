// Ponto de extensão para autenticação (fase 2). Hoje todo mundo é anônimo e a
// proteção é só x-app-key + rate limit. Quando entrar login (ex: JWT próprio ou
// provedor externo), implemente Authenticator e injete em createApp({ auth }).
import type { Context } from 'hono';

export interface AuthContext {
  /** null = anônimo */
  userId: string | null;
}

export interface Authenticator {
  authenticate(c: Context): Promise<AuthContext>;
}

export const anonymousAuthenticator: Authenticator = {
  async authenticate() {
    return { userId: null };
  },
};
