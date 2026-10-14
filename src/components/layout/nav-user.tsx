import Link from 'next/link';
import { StatusDot } from '@/components/ui/status-dot';
import { getUserRiotStore, type UserRiotAccountRow } from '@/lib/db/user-riot-store';
import { getSession } from '@/lib/session';

/**
 * NavUser — slot de perfil do header global (server), fiel ao cluster do
 * Stitch: linha superior com `NOME#TAG` (label mono uppercase) e linha
 * inferior com ponto-live + região; à direita, avatar circular com a
 * inicial. Sem dado de elo no store, a segunda linha mostra a REGIÃO —
 * nunca inventamos rank. Estados sem perfil: "Entrar", convite para
 * conectar o Riot ID e o chip neutro de indisponível (mesma linguagem
 * visual do design system).
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
      className="flex items-center gap-1"
      aria-label={`Perfil de ${linked.displayName}#${linked.tagKey} (${linked.region.toUpperCase()})`}
    >
      <span className="hidden text-right sm:block">
        <span className="block font-hud text-label uppercase leading-none text-text-primary">
          {linked.displayName}#{linked.tagKey}
        </span>
        <span className="mt-0.75 flex items-center justify-end gap-0.75 font-hud text-label-xs uppercase leading-tight text-text-secondary">
          <StatusDot variant="live" className="border border-line" />
          {linked.region.toUpperCase()}
        </span>
      </span>
      <span
        aria-hidden="true"
        className="flex size-8 items-center justify-center rounded-full border border-line bg-surface-raised font-hud text-label uppercase text-text-primary"
      >
        {linked.displayName.charAt(0).toUpperCase()}
      </span>
    </Link>
  );
}
