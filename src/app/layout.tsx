import type { Metadata } from 'next';
import { Suspense } from 'react';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import { AppShell } from '@/components/layout/app-shell';
import { NavUser } from '@/components/layout/nav-user';
import { Skeleton } from '@/components/ui/skeleton';
import './globals.css';

/**
 * Protocol Precision: três famílias SELF-HOSTED via `next/font/local` e
 * expostas como variáveis CSS consumidas por `globals.css`
 * (`--font-space-grotesk` → `--font-display`, `--font-jetbrains-mono` →
 * `--font-hud`, `--font-geist` → `--font-body`).
 *
 * Por que LOCAL e não `next/font/google`: o Google Fonts é baixado em tempo
 * de BUILD — no container (sem rede para fonts.gstatic.com) o Turbopack
 * quebra o build ("Can't resolve
 * '@vercel/turbopack-next/internal/font/google/font'"). Com os woff2
 * commitados (`src/app/fonts/`, licença OFL, subset latin, eixo variável de
 * peso) o build é determinístico e offline. Risco §7.1 do plano Stitch.
 */

const spaceGrotesk = localFont({
  src: './fonts/space-grotesk-latin-var.woff2',
  weight: '300 700',
  variable: '--font-space-grotesk',
  display: 'swap',
});

const jetBrainsMono = localFont({
  src: './fonts/jetbrains-mono-latin-var.woff2',
  weight: '100 800',
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const geist = localFont({
  src: './fonts/geist-latin-var.woff2',
  weight: '100 900',
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
