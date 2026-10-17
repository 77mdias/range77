import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { NavUser } from '@/components/layout/nav-user';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Layout do route group `(app)` — shell da aplicação (header fixo + footer de
 * telemetria). As telas de auth vivem em `(auth)` e NÃO passam por aqui.
 *
 * `NavUser` (auth/env/DB) é dinâmico: sempre dentro de `<Suspense>` (Cache
 * Components). O try/catch fail-soft dele mora em `nav-user.tsx` — não
 * duplicar aqui.
 */
export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      user={
        <Suspense fallback={<Skeleton width={168} height={32} />}>
          <NavUser />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  );
}
