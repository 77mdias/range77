import { Badge } from '@/components/ui/badge';
import { SimulatedBadge } from '@/components/ui/simulated-badge';
import { cx } from '@/lib/cx';

/**
 * PlayerHeader — identidade do jogador (Stitch/overview): avatar com
 * badge de nível, nome, badges de rank/verificação, linha de meta
 * (região • nível • pool de RR) e slot de ações.
 */

export interface PlayerHeaderProps {
  readonly name: string;
  readonly tag: string;
  /** Sigla exibida no avatar quando não há imagem (padrão: 2 primeiras letras). */
  readonly avatarSrc?: string;
  readonly level?: number;
  readonly rank?: string;
  /** Imagem oficial do elo (HenrikDev v2/mmr `images`). */
  readonly rankImageSrc?: string;
  readonly verified?: boolean;
  /** Pares label → valor da linha de meta (ex.: RR pool, servidor). */
  readonly meta?: readonly { readonly label: string; readonly value: string }[];
  /** Slot de ações (sync, compartilhar...). */
  readonly actions?: React.ReactNode;
  /** Fonte simulada → selo DADOS SIMULADOS ao lado do nome. */
  readonly simulated?: boolean;
  readonly className?: string;
}

export function PlayerHeader({
  name,
  tag,
  avatarSrc,
  level,
  rank,
  rankImageSrc,
  verified = false,
  meta,
  actions,
  simulated = false,
  className,
}: PlayerHeaderProps) {
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <section
      data-component="player-header"
      className={cx(
        'flex flex-col justify-between gap-4 border-b border-line bg-surface px-4 py-5 xl:flex-row xl:items-center',
        className,
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-4">
        <div className="relative shrink-0">
          {avatarSrc !== undefined ? (
            // eslint-disable-next-line @next/next/no-img-element -- avatar remoto de baixa prioridade
            <img
              src={avatarSrc}
              alt=""
              className="size-14 rounded-md border border-line object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex size-14 items-center justify-center rounded-md border border-line bg-surface-raised font-hud text-heading-sm font-semibold text-text-secondary"
            >
              {initials}
            </span>
          )}
          {level !== undefined ? (
            <span
              data-player-level
              className="absolute -bottom-1 -right-1 border border-line bg-accent px-1 font-hud text-label font-bold uppercase leading-tight text-text-primary"
            >
              LVL {level}
            </span>
          ) : null}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate font-display text-heading-lg uppercase leading-none tracking-tight text-text-primary">
              {name}
              <span className="text-text-secondary">#{tag}</span>
            </h1>
            {simulated ? <SimulatedBadge /> : null}
            {verified ? <Badge variant="neutral">Verificado</Badge> : null}
            {rank !== undefined ? (
              <span
                data-player-rank
                className="inline-flex items-center gap-1.5 border border-line bg-accent px-1.5 py-0.5 font-hud text-label font-bold uppercase text-text-primary"
              >
                {rankImageSrc !== undefined ? (
                  // eslint-disable-next-line @next/next/no-img-element -- ícone oficial do elo
                  <img src={rankImageSrc} alt="" className="size-4 object-contain" />
                ) : null}
                {rank}
              </span>
            ) : null}
          </div>
          {meta !== undefined && meta.length > 0 ? (
            <dl className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-hud text-label uppercase text-text-secondary">
              {meta.map((item, index) => (
                <span key={item.label} className="flex items-center gap-3">
                  {index > 0 ? (
                    <span aria-hidden="true" className="text-line">
                      •
                    </span>
                  ) : null}
                  <div className="flex items-baseline gap-1">
                    <dt>{item.label}:</dt>
                    <dd className="font-semibold text-text-primary">{item.value}</dd>
                  </div>
                </span>
              ))}
            </dl>
          ) : null}
        </div>
      </div>

      {actions !== undefined ? (
        <div className="flex shrink-0 items-center gap-2" data-player-actions>
          {actions}
        </div>
      ) : null}
    </section>
  );
}
