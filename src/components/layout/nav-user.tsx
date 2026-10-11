import Link from 'next/link';
import { getUserRiotStore } from '@/lib/db/user-riot-store';
import { getSession } from '@/lib/session';

/**
 * NavUser — slot autenticado do header global (server). Resolve a sessão e,
 * quando houver Riot ID vinculado, mostra o chip do jogador CONECTADO
 * (`NOME#TAG • REGIÃO`) apontando para o perfil — nunca inventado: sem
 * sessão vira "Entrar"; com sessão sem vínculo, convite para conectar.
 *
 * Dinâmico por natureza (auth + DB): sempre dentro de <Suspense> no layout
 * (regra do Cache Components — `headers()` lança o sinal antes do DB).
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

  const linked = await getUserRiotStore().get(session.user.id);
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
