import Link from 'next/link';
import { headers } from 'next/headers';
import { StatusDot } from '@/components/ui/status-dot';
import { getUserRiotStore, type UserRiotAccountRow } from '@/lib/db/user-riot-store';
import { getSessionFromHeaders, type SessionView } from '@/lib/session';

/**
 * NavUser — slot de perfil do header global (server), fiel ao cluster do
 * Stitch: linha superior com `NOME#TAG` (label mono uppercase) e linha
 * inferior com ponto-live + região; à direita, avatar circular com a
 * inicial. Sem dado de elo no store, a segunda linha mostra a REGIÃO —
 * nunca inventamos rank. Estados sem perfil: "Entrar", convite para
 * conectar o Riot ID, "Reconecte com Riot" (vínculo legado) e o chip
 * neutro de indisponível (mesma linguagem
 * visual do design system).
 *
 * Dinâmico por natureza (auth + DB): sempre dentro de <Suspense> no layout
 * (regra do Cache Components).
 *
 * FAIL-SOFT: tanto a leitura da SESSÃO (auth/env/DB) quanto a do vínculo são
 * "best-effort". Uma falha de infraestrutura (ex.: BETTER_AUTH_SECRET ausente
 * ou Neon indisponível) NÃO pode derrubar o shell global — sem estes catches o
 * erro vira exceção não capturada no <Suspense> do layout raiz e, em dev,
 * dispara full-reload em loop (RuntimeErrorHandler).
 *
 * `headers()` fica FORA do try/catch: em prerender ele lança o sinal de
 * "dinâmico" que o Cache Components usa para abrir o hole — capturá-lo
 * desligaria o slot. Só auth/DB entram no catch.
 */

const UNAVAILABLE_CHIP_CLASS =
  'rounded-md border border-line bg-surface-raised px-3 py-1.5 font-hud text-label uppercase text-text-secondary';

/** Chip neutro para qualquer falha fail-soft (sessão ou vínculo). */
function NavUnavailable() {
  return (
    <span data-nav-unavailable className={UNAVAILABLE_CHIP_CLASS}>
      Conta indisponível
    </span>
  );
}

export async function NavUser() {
  const resolvedHeaders = await headers();

  let session: SessionView | null;
  try {
    session = await getSessionFromHeaders(resolvedHeaders);
  } catch (error) {
    // Diagnóstico no servidor; o cliente só vê o chip neutro de indisponível.
    console.error('[NavUser] falha ao ler a sessão', error);
    return <NavUnavailable />;
  }

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
    return <NavUnavailable />;
  }

  if (linked === null) {
    return (
      <Link
        href="/dashboard/settings"
        data-nav-connect-riot
        className="rounded-md border border-line bg-surface-raised px-3 py-1.5 font-hud text-label uppercase text-text-secondary transition-colors duration-[var(--duration-fast)] hover:bg-surface-hover hover:text-text-primary"
      >
        Entrar com Riot
      </Link>
    );
  }

  // Riot ID digitado antes do RSO não é consentimento: pede reconexão.
  if (linked.linkedVia === 'legacy') {
    return (
      <Link
        href="/dashboard/settings"
        data-nav-reconnect-riot
        className="rounded-md border border-line bg-surface-raised px-3 py-1.5 font-hud text-label uppercase text-text-secondary transition-colors duration-[var(--duration-fast)] hover:bg-surface-hover hover:text-text-primary"
      >
        Reconecte com Riot
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
