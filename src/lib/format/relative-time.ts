/**
 * Formatação de tempo relativo em pt-BR, determinística (recebe o `now`
 * injetável) — usada em listas de partidas. Não depende de Intl para
 * manter o resultado estável em qualquer runtime/timezone.
 */

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/** Aceita ISO string, epoch ms ou Date; `now` default: agora. */
export function formatRelativeTime(
  input: string | number | Date | null | undefined,
  now: Date | number = Date.now(),
): string {
  if (input === null || input === undefined) {
    return '';
  }

  const date = input instanceof Date ? input : new Date(input);
  const timestamp = date.getTime();
  if (Number.isNaN(timestamp)) {
    return '';
  }

  const nowMs = now instanceof Date ? now.getTime() : now;
  const diff = Math.floor((nowMs - timestamp) / 1000);

  // Datas futuras (ou < 1 min) são colapsadas em "agora" — evita "há -2 min".
  if (diff < MINUTE) {
    return 'agora';
  }
  if (diff < HOUR) {
    return `há ${Math.floor(diff / MINUTE)} min`;
  }
  if (diff < DAY) {
    return `há ${Math.floor(diff / HOUR)} h`;
  }
  if (diff < MONTH) {
    return `há ${Math.floor(diff / DAY)} d`;
  }
  if (diff < YEAR) {
    const months = Math.floor(diff / MONTH);
    return months === 1 ? 'há 1 mês' : `há ${months} meses`;
  }
  const years = Math.floor(diff / YEAR);
  return years === 1 ? 'há 1 ano' : `há ${years} anos`;
}
