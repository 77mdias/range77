/**
 * Setup global do Vitest — ambiente `test`.
 *
 * Nenhum segredo real é definido aqui (nem em qualquer .env): o ambiente de
 * teste roda 100% com mocks de serviços externos. O operador `??=` preserva
 * um APP_ENV explicitamente sobrescrito por suites específicas.
 */
process.env.APP_ENV ??= 'test';
