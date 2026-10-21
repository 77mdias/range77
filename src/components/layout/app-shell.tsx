import type { ReactNode } from 'react';
import { AppFooter } from './app-footer';
import { AppTopNav } from './app-top-nav';
import { SimulatedBanner } from './simulated-banner';

/**
 * Shell da aplicação (Server Component): header global FIXO (`AppTopNav`,
 * com rota ativa via ilha client — estrutura do Stitch: `fixed top-0 z-50`),
 * `<main>` compensado com `pt-14` (altura exata do header) e footer de
 * telemetria (`AppFooter`). O fundo do canvas fica no `body`.
 */

export interface AppShellProps {
  readonly children: ReactNode;
  /** Slot de usuário (avatar/login) — preenchido quando houver sessão. */
  readonly user?: ReactNode;
  /** Fonte de dados simulada → banner global (calculado no layout). */
  readonly simulated?: boolean;
}

export function AppShell({ children, user, simulated = false }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppTopNav user={user} />
      <main className="flex-1 pt-14">
        <SimulatedBanner visible={simulated} />
        {children}
      </main>
      <AppFooter protocolText={`VALCOACH // TELEMETRY MATRIX • ${simulated ? 'DADOS SIMULADOS' : 'DADOS HENRIKDEV'}`} />
    </div>
  );
}
