'use client';

import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { HENRIKDEV_AFFINITIES, type HenrikDevAffinity } from '@/contracts/henrikdev';
import { parseRiotId } from '@/lib/validation/riot-id';

/**
 * NavSearch — busca rápida do header (Stitch): campo `Player#Tag` + badge
 * de região (chip mono com hairline preta). Enter navega DIRETO para o
 * perfil do jogador — é um atalho; o fluxo completo com modal de ingestão
 * vive na home. Riot ID inválido mostra alerta inline e não navega.
 *
 * Fiel ao Stitch: some abaixo de `md` (o header não tem menu mobile) e o
 * badge de região é um `<select>` estilizado como chip (`appearance-none`).
 */

/** Rótulos curtos para o badge de região do header (chip de 2–5 letras). */
const REGION_LABELS: Record<HenrikDevAffinity, string> = {
  br: 'BR',
  latam: 'LATAM',
  na: 'NA',
  eu: 'EMEA',
  kr: 'KR',
  ap: 'AP',
};

export type SearchTargetResult =
  | { readonly ok: true; readonly href: string }
  | { readonly ok: false; readonly message: string };

/** Puro: converte `região + "Nome#Tag"` na rota do perfil (ou erro). */
export function resolveSearchTarget(
  region: HenrikDevAffinity,
  raw: string,
): SearchTargetResult {
  const parsed = parseRiotId(raw);
  if (!parsed.ok) {
    return parsed;
  }
  return {
    ok: true,
    href: `/players/${region}/${encodeURIComponent(parsed.value.name)}/${encodeURIComponent(
      parsed.value.tag,
    )}`,
  };
}

export function NavSearch() {
  const router = useRouter();
  const inputId = useId();
  const regionId = useId();
  const errorId = useId();

  const [riotId, setRiotId] = useState('');
  const [region, setRegion] = useState<HenrikDevAffinity>('br');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const target = resolveSearchTarget(region, riotId);
    if (!target.ok) {
      setError(target.message);
      return;
    }
    setError(null);
    router.push(target.href);
  }

  return (
    <form data-nav-search onSubmit={handleSubmit} noValidate className="relative hidden md:block">
      <div className="flex items-center rounded-md border border-line bg-surface-raised px-1.5 py-0.75">
        <label htmlFor={inputId} className="sr-only">
          Buscar jogador (Nome#Tag)
        </label>
        <Icon name="search" size="sm" className="mr-0.75 text-text-secondary" />
        <input
          id={inputId}
          name="riot-id"
          type="text"
          autoComplete="off"
          value={riotId}
          onChange={(event) => setRiotId(event.target.value)}
          placeholder="Player#Tag (ex: Tenz#0001)"
          aria-invalid={error !== null ? true : undefined}
          aria-describedby={error !== null ? errorId : undefined}
          className="w-44 bg-transparent font-body text-body-sm text-text-primary placeholder:text-text-secondary focus:outline-none"
        />
        <label htmlFor={regionId} className="sr-only">
          Região
        </label>
        <select
          id={regionId}
          name="region"
          value={region}
          onChange={(event) => setRegion(event.target.value as HenrikDevAffinity)}
          className="cursor-pointer appearance-none rounded-md border border-line bg-surface-pressed px-0.75 font-hud text-label-xs uppercase text-text-primary"
        >
          {HENRIKDEV_AFFINITIES.map((affinity) => (
            <option key={affinity} value={affinity}>
              {REGION_LABELS[affinity]}
            </option>
          ))}
        </select>
      </div>

      {error !== null ? (
        <p
          id={errorId}
          role="alert"
          className="absolute top-full right-0 z-50 mt-1 rounded-md border border-line bg-surface px-1.5 py-0.75 font-hud text-label-xs uppercase text-loss shadow-hard-2"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}
