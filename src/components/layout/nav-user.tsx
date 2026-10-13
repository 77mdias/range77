import Link from 'next/link';
import { getUserRiotStore, type UserRiotAccountRow } from '@/lib/db/user-riot-store';
import { getSession } from '@/lib/session';

/**
 * NavUser — slot autenticado do header global (server). Resolve a sessão e,
 * quando houver Riot ID vinculado, mostra o chip do jogador CONECTADO
 * (`NOME#TAG • REGIÃO`) apontando para o perfil — nunca inventado: sem
 * sessão vira "Entrar"; com sessão sem vínculo, convite para conectar.
 *
 * Dinâmico por natureza (auth + DB): sempre dentro de <Suspense> no layout
 * (regra do Cache Components — `headers()` lança o sinal antes do DB).
 *
 * FAIL-SOFT: a leitura do vínculo é "best-effort". Uma falha de
 * infraestrutura (ex.: Neon indisponível) NÃO pode derrubar o shell global —
 * sem este catch o erro vira exceção não capturada no <Suspense> do layout
 * raiz e, em dev, dispara full-reload em loop (RuntimeErrorHandler).
 */
export async function NavUser() {
  const session = await getSession();

  if (session === null) {
    return (
      <Link
        href="/login"
        className="rounded-md border border-line bg-surface-raised px-3 py-1.5 font-hud text-label uppercase text-text-primary transition-colors duration-[var(--duration-fast)] hover:bg-surface-hover"
      >
        Entrar
      </Link>
    );
  }

  let linked: UserRiotAccountRow | null;
  try {
    linked = await getUserRiotStore().get(session.user.id);
  } catch (error) {
    // Diagnóstico no servidor; o cliente só vê o chip neutro de indisponível.
    console.error('[NavUser] falha ao ler o Riot ID vinculado', error);
    return (
      <span
        data-nav-unavailable
        className="rounded-md border border-line bg-surface-raised px-3 py-1.5 font-hud text-label uppercase text-text-secondary"
      >
        Conta indisponível
      </span>
    );
  }

  if (linked === null) {
    return (
      <Link
        href="/dashboard/settings"
        data-nav-connect-riot
        className="rounded-md border border-line bg-surface-raised px-3 py-1.5 font-hud text-label uppercase text-text-secondary transition-colors duration-[var(--duration-fast)] hover:bg-surface-hover hover:text-text-primary"
      >
        Conectar Riot ID
      </Link>
    );
  }

  return (
    <Link
      href={`/players/${linked.region}/${encodeURIComponent(linked.nameKey)}/${linked.tagKey}`}
      data-nav-player-chip
      className="flex items-center gap-2 rounded-md border border-line bg-surface-raised px-3 py-1.5 font-hud text-label uppercase text-text-primary transition-colors duration-[var(--duration-fast)] hover:bg-surface-hover"
    >
      <span aria-hidden="true" className="size-2 bg-accent" />
      {linked.displayName}
      <span className="text-text-secondary">#{linked.tagKey}</span>
      <span className="text-text-secondary">• {linked.region.toUpperCase()}</span>
    </Link>
  );
}
