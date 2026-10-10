import type { ReactNode } from 'react';
import { AppFooter } from './app-footer';
import { AppTopNav } from './app-top-nav';

/**
 * Shell da aplicação (Server Component): header global (`AppTopNav`, com
 * rota ativa via ilha client), `<main>` para a página e footer de
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
      <main className="flex-1">{children}</main>
      <AppFooter protocolText="VALCOACH // TELEMETRY MATRIX • DADOS HENRIKDEV" />
    </div>
  );
}
