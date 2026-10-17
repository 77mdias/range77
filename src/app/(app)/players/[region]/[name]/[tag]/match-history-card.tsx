import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import type { MatchSummary, RrHistoryPoint } from '@/contracts/tracker';
import { agentRole } from '@/lib/agent-roles';
import { cx } from '@/lib/cx';
import { formatRelativeTime } from '@/lib/format/relative-time';
import { agentIconSrc } from '@/lib/valorant-assets';

/**
 * MatchHistoryCard — card denso do registro de partidas (Histórico Completo,
 * Stitch): faixa lateral de resultado, badge VITÓRIA/DERROTA, agente + papel,
 * placar/mapa, ΔRR (quando o MMR history cobre) e grade telemétrica
 * (K/D/A · ACS · HS% · FK/FD · rounds). Campos sem suporte no contrato ficam
 * `—` (nada é fabricado). A ação "Ver análise profunda" é o link real para
 * `/matches/[matchId]`.
 */

export interface MatchHistoryCardProps {
  readonly match: MatchSummary;
  readonly region: string;
  /** Riot ID do jogador buscado → link leva a perspectiva `?player=`. */
  readonly player: { readonly name: string; readonly tag: string };
  /** ΔRR da partida (mmr-history); ausente quando não há elo no payload. */
  readonly rrDelta?: number;
  /** Ponto de RR pós-partida (tier + rr) para a legenda do ΔRR. */
  readonly rrPoint?: RrHistoryPoint;
  /** Injetável para testes determinísticos de tempo relativo. */
  readonly now?: Date | number;
}

/** Duração MM:SS a partir de milissegundos; 0 → `—`. */
function formatDuration(gameLengthMs: number): string {
  if (gameLengthMs <= 0) {
    return '—';
  }
  const totalSeconds = Math.round(gameLengthMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}M ${String(seconds).padStart(2, '0')}S`;
}

function TelemetryCell({
  label,
  children,
  accent,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
  readonly accent?: 'positive' | 'negative';
}) {
  return (
    <div className="flex flex-col pl-2">
      <span className="font-hud text-label-xs uppercase text-text-secondary">{label}</span>
      <span
        className={cx(
          'font-hud text-label font-bold',
          accent === 'positive' && 'text-win',
          accent === 'negative' && 'text-loss',
          accent === undefined && 'text-text-primary',
        )}
      >
        {children}
      </span>
    </div>
  );
}

export function MatchHistoryCard({
  match,
  region,
  player,
  rrDelta,
  rrPoint,
  now,
}: MatchHistoryCardProps) {
  const win = match.result === 'win';
  const role = match.agent === null ? null : agentRole(match.agent);
  const iconSrc = match.agent === null ? null : agentIconSrc(match.agent);
  const relative = formatRelativeTime(match.startedAt, now);
  const kd = match.deaths === 0 ? match.kills : match.kills / match.deaths;
  const href = `/matches/${match.matchId}?region=${region}&player=${encodeURIComponent(
    `${player.name}#${player.tag}`,
  )}`;

  const firstBloods = match.firstBloods;
  const firstDeaths = match.firstDeaths;
  const hasFirstBloods = typeof firstBloods === 'number' && typeof firstDeaths === 'number';
  const firstBloodDiff = hasFirstBloods ? (firstBloods as number) - (firstDeaths as number) : 0;

  return (
    <article
      data-component="match-history-card"
      data-result={match.result}
      data-agent={match.agent ?? ''}
      data-map={match.map}
      className="relative rounded-md border border-line bg-surface-raised p-3 transition-colors duration-[var(--duration-fast)] ease-out-expo hover:bg-surface"
    >
      <span
        aria-hidden="true"
        className={cx('absolute inset-y-0 left-0 w-1 rounded-l', win ? 'bg-line' : 'bg-loss')}
      />

      <div className="flex flex-col gap-2 pl-1">
        {/* Linha 1 — resultado, agente, placar/mapa e ΔRR */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span
              className={cx(
                'rounded-sm border border-line px-2 py-0.5 font-hud text-label font-bold uppercase tracking-wider',
                win ? 'bg-accent text-text-primary' : 'bg-surface-highest text-text-primary',
              )}
            >
              {win ? 'Vitória' : 'Derrota'}
            </span>

            <span className="flex items-center gap-1.5">
              <span className="relative size-8 shrink-0 overflow-hidden rounded-full border border-line bg-surface-highest">
                {iconSrc !== null ? (
                  // eslint-disable-next-line @next/next/no-img-element -- ícone local do agente
                  <img src={iconSrc} alt="" className="size-full object-cover" />
                ) : (
                  <span aria-hidden="true" className="block size-full bg-surface-high" />
                )}
              </span>
              <span className="flex flex-col">
                <span className="font-display text-heading-sm uppercase leading-tight text-text-primary">
                  {match.agent ?? '—'}
                </span>
                <span className="font-hud text-label-xs uppercase leading-none text-text-secondary">
                  {role ?? 'Sem papel'}
                </span>
              </span>
            </span>

            <span className="flex items-baseline gap-2 border-l border-line pl-3">
              <span className="font-display text-heading-lg font-bold text-text-primary">
                {match.score.us} - {match.score.them}
              </span>
              <span className="font-hud text-label font-semibold uppercase text-text-primary">
                {match.map}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="font-hud text-label-xs uppercase text-text-secondary">
                {formatDuration(match.gameLengthMs)} • {match.queue.toUpperCase()}
              </div>
              <div className="font-hud text-label-xs uppercase text-text-secondary">{relative}</div>
            </div>

            {rrDelta !== undefined ? (
              <div className="rounded-md border border-line bg-surface px-3 py-1 text-right shadow-hard-1">
                <div
                  className={cx(
                    'font-display text-heading-sm font-bold',
                    rrDelta >= 0 ? 'text-text-primary' : 'text-loss',
                  )}
                >
                  {rrDelta >= 0 ? `+${rrDelta}` : rrDelta} RR
                </div>
                {rrPoint !== undefined ? (
                  <div className="font-hud text-label-xs uppercase text-text-secondary">
                    {rrPoint.tier} • {rrPoint.rr} RR
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* Linha 2 — grade telemétrica */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 rounded-md border border-line bg-surface p-2 sm:grid-cols-5">
          <TelemetryCell label="K / D / A">
            {match.kills} / {match.deaths} / {match.assists}{' '}
            <span className="font-normal text-text-secondary">({kd.toFixed(2)})</span>
          </TelemetryCell>
          <TelemetryCell label="ACS (Score)">{match.acs}</TelemetryCell>
          <TelemetryCell label="Headshot %">
            {match.hsPercentage === null ? '—' : `${match.hsPercentage}%`}
          </TelemetryCell>
          <TelemetryCell
            label="First blood / death"
            accent={!hasFirstBloods ? undefined : firstBloodDiff > 0 ? 'positive' : firstBloodDiff < 0 ? 'negative' : undefined}
          >
            {hasFirstBloods
              ? `${firstBloods} / ${firstDeaths} (${firstBloodDiff >= 0 ? '+' : ''}${firstBloodDiff})`
              : '—'}
          </TelemetryCell>
          <TelemetryCell label="Rounds">{match.roundsPlayed}</TelemetryCell>
        </div>

        {/* Linha 3 — ação */}
        <div className="flex items-center justify-between gap-3 border-t border-line pt-2">
          <span className="font-hud text-label-xs uppercase text-text-secondary">
            {match.season ?? 'Temporada —'}
          </span>
          <Link
            href={href}
            data-match-deep-link
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1 font-hud text-label font-bold uppercase text-text-primary shadow-hard-1 transition-colors duration-[var(--duration-fast)] hover:bg-accent"
          >
            Ver análise profunda
            <Icon name="arrow-right" size="xs" />
          </Link>
        </div>
      </div>
    </article>
  );
}
