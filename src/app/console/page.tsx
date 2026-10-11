import { ConsoleView } from './console-view';

/**
 * PÁGINA: /console (tela Stitch "Console API & IA Coaching Assistant").
 *
 * Ferramenta de observabilidade da pipeline 3-layer + documentação viva
 * dos endpoints da aplicação. Server Component sem fetch no topo: toda a
 * interação (layer tabs, sandbox do coach, health check) vive na ilha
 * client `ConsoleView`. Não há `params`/`searchParams` — sem `instant`.
 */

export const metadata = {
  title: 'VALCOACH — Console API',
  description: 'Inspeção da pipeline 3-layer e catálogo dos endpoints da aplicação.',
};

export default function ConsolePage() {
  return <ConsoleView />;
}
