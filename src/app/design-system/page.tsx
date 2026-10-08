import { notFound } from 'next/navigation';
import { loadAppEnv } from '@/config/env';
import { DesignSystemShowcase } from './showcase';

/**
 * Rota /design-system — styleguide viva do design system.
 *
 * Gate: só existe fora de produção. O ambiente é lido SERVER-SIDE via
 * `loadAppEnv()`; em `prod` chamamos `notFound()` (404). O conteúdo
 * interativo (exemplos com estado/eventos) vive em um Client Component.
 */

export const metadata = {
  title: 'VALCOACH — Design System',
  description: 'Styleguide viva: tokens, tipografia, chamfers e componentes.',
};

export default function DesignSystemPage() {
  const env = loadAppEnv();
  if (env.APP_ENV === 'prod') {
    notFound();
  }

  return <DesignSystemShowcase />;
}
