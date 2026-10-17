/**
 * Política de sessão — fonte única da promessa "manter sessão por 30 dias"
 * (checkbox do login, Stitch tela 7). Consumida pelo `createAuth` (servidor)
 * e pela copy do formulário (cliente), para que a promessa exibida nunca
 * divirja da validade real do cookie.
 *
 * Better Auth: `session.expiresIn` na lib recebe SEGUNDOS; default 7 dias.
 */

/** Dias de validade da sessão persistente. */
export const SESSION_TTL_DAYS = 30;

/** Mesma validade em segundos — o que o Better Auth consome. */
export const SESSION_TTL_SECONDS = SESSION_TTL_DAYS * 24 * 60 * 60;
