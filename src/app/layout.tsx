import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import './globals.css';

/**
 * Direção visual v2 (DESIGN.md): fonte = system stack, definida em
 * `globals.css` (`--font-display`/`--font-hud`/`--font-body`). Sem next/font —
 * a marca não usa fontes custom.
 */

export const metadata: Metadata = {
  title: 'ValCoach — Tracker & Coach de Valorant',
  description:
    'Analytics de combate, evolução temporal e hooks de coaching para jogadores de Valorant.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-body">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
