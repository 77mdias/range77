import type { ReactNode } from 'react';
import { AuthFooter } from '@/components/auth/auth-footer';
import { AuthHeader } from '@/components/auth/auth-header';

/**
 * Layout do route group `(auth)` — chrome próprio do terminal de autenticação
 * (Stitch 7/8). Não usa AppShell: o `NavUser` mostraria "Conta indisponível"
 * para quem ainda não entrou.
 *
 * Sem acesso a request (auth/env/DB) aqui: nenhum `<Suspense>` é necessário.
 * Route group não compõe a URL — `/login` e `/signup` seguem iguais.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AuthHeader />
      {/* `flex-col` + `pt-14` (altura do header fixo) para o filho poder
          centralizar verticalmente com `justify-center`. */}
      <main className="flex flex-1 flex-col pt-14">{children}</main>
      <AuthFooter />
    </div>
  );
}
