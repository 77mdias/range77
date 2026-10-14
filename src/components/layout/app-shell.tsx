import type { ReactNode } from 'react';
import { AppFooter } from './app-footer';
import { AppTopNav } from './app-top-nav';

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
}

export function AppShell({ children, user }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppTopNav user={user} />
      <main className="flex-1 pt-14">{children}</main>
      <AppFooter protocolText="VALCOACH // TELEMETRY MATRIX • DADOS HENRIKDEV" />
    </div>
  );
}
