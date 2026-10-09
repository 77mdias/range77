'use client';

import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { HENRIKDEV_AFFINITIES, type HenrikDevAffinity } from '@/contracts/henrikdev';
import { cx } from '@/lib/cx';
import { parseRiotId } from '@/lib/validation/riot-id';

/**
 * SearchBar — seleção de região + campo `Nome#Tag` com validação
 * client-side. Emite `{ region, name, tag }` via `onSubmit` apenas quando
 * o Riot ID é válido; caso contrário mostra o erro inline (`role="alert"`).
 * A navegação real para o perfil é feita pelo pai (fase 2).
 */

export interface SearchQuery {
  readonly region: HenrikDevAffinity;
  readonly name: string;
  readonly tag: string;
}

export interface SearchBarProps {
  readonly onSubmit: (query: SearchQuery) => void;
  readonly defaultRegion?: HenrikDevAffinity;
  /** Valor inicial do campo, no formato `Nome#Tag`. */
  readonly defaultValue?: string;
  /** Rótulo do botão de submit (padrão "Buscar"). */
  readonly submitLabel?: string;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly className?: string;
}

export function SearchBar({
  onSubmit,
  defaultRegion = 'br',
  defaultValue = '',
  submitLabel = 'Buscar',
  disabled = false,
  loading = false,
  className,
}: SearchBarProps) {
  const regionId = useId();
  const riotIdId = useId();
  const errorId = useId();

  const [region, setRegion] = useState<HenrikDevAffinity>(defaultRegion);
  const [riotId, setRiotId] = useState<string>(defaultValue);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const parsed = parseRiotId(riotId);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    setError(null);
    onSubmit({ region, ...parsed.value });
  }

  return (
    <form
      data-search-bar
      onSubmit={handleSubmit}
      noValidate
      className={cx('w-full', className)}
    >
      <div className="flex w-full flex-col gap-3 sm:flex-row">
        <div className="flex flex-1">
          <label htmlFor={regionId} className="sr-only">
            Região
          </label>
          <select
            id={regionId}
            name="region"
            value={region}
            disabled={disabled || loading}
            onChange={(event) => setRegion(event.target.value as HenrikDevAffinity)}
            className={cx(
              'h-12 w-28 rounded-l-md border border-line bg-surface px-3',
              'font-hud text-body text-text-primary',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {HENRIKDEV_AFFINITIES.map((affinity) => (
              <option key={affinity} value={affinity}>
                {affinity.toUpperCase()}
              </option>
            ))}
          </select>

          <label htmlFor={riotIdId} className="sr-only">
            Riot ID (Nome#Tag)
          </label>
          <input
            id={riotIdId}
            name="riot-id"
            type="text"
            autoComplete="off"
            value={riotId}
            disabled={disabled || loading}
            onChange={(event) => setRiotId(event.target.value)}
            placeholder="Nome#Tag"
            aria-invalid={error !== null ? true : undefined}
            aria-describedby={error !== null ? errorId : undefined}
            className={cx(
              'h-12 min-w-0 flex-1 rounded-r-md border border-l-0 border-line bg-surface px-4',
              'text-body text-text-primary placeholder:text-text-secondary',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          />
        </div>

        <Button type="submit" loading={loading} disabled={disabled}>
          {submitLabel}
        </Button>
      </div>

      {error !== null ? (
        <p id={errorId} role="alert" className="mt-2 w-full text-body text-loss">
          {error}
        </p>
      ) : null}
    </form>
  );
}
