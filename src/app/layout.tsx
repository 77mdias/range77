import type { Metadata } from 'next';
import { Bebas_Neue, Inter, Rajdhani } from 'next/font/google';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import './globals.css';

/**
 * Papéis de fonte (tokens do design system — globals.css):
 *   --font-display → Bebas Neue (display condensada; substitui Tungsten)
 *   --font-hud     → Rajdhani 500/600/700 (HUD/números, tabular-nums)
 *   --font-body    → Inter 400/500/600 (corpo)
 * next/font auto-hospeda os arquivos (zero FOUC/flash de rede) e injeta as
 * variáveis CSS no <body>.
 */
const displayFont = Bebas_Neue({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
  display: 'swap',
});

const hudFont = Rajdhani({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-hud',
  display: 'swap',
});

const bodyFont = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'VALCOACH — Tracker & Coach de Valorant',
  description:
    'Analytics de combate, evolução temporal e hooks de coaching para jogadores de Valorant.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body
        suppressHydrationWarning
        className={`${displayFont.variable} ${hudFont.variable} ${bodyFont.variable} font-body`}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
