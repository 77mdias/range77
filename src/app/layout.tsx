import type { Metadata } from 'next';
import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { Geist, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import { AppShell } from '@/components/layout/app-shell';
import { NavUser } from '@/components/layout/nav-user';
import { Skeleton } from '@/components/ui/skeleton';
import './globals.css';

/**
 * Protocol Precision: três famílias carregadas via `next/font/google` e
 * expostas como variáveis CSS consumidas por `globals.css`
 * (`--font-space-grotesk` → `--font-display`, `--font-jetbrains-mono` →
 * `--font-hud`, `--font-geist` → `--font-body`).
 */

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const geist = Geist({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-geist',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ValCoach — Tracker & Coach de Valorant',
  description:
    'Analytics de combate, evolução temporal e hooks de coaching para jogadores de Valorant.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${spaceGrotesk.variable} ${jetBrainsMono.variable} ${geist.variable}`}
    >
      <body className="font-body">
        <AppShell
          user={
            <Suspense fallback={<Skeleton width={128} height={30} />}>
              <NavUser />
            </Suspense>
          }
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
