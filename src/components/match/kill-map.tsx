import type { MapPoint, MatchDetail } from '@/contracts/tracker';
import { minimapFor } from '@/lib/valorant-maps';
import { projectToMinimap, type MinimapTransform } from '@/services/analytics/map-projection';
import { cx } from '@/lib/cx';

/**
 * KillMap — abates de UM round sobre o minimapa oficial (só a fonte Riot traz
 * posições). Cada abate é uma linha killer→vítima (cor do time do killer) com
 * a vítima marcada por um X; plant/defuse em losango/círculo. O `<title>` de
 * cada marcador lista as posições de todos no instante (FILHO ÚNICO em template
 * string — React 19). Mapa sem minimapa conhecido → não renderiza. Só renderiza:
 * a projeção mundo→minimapa vem de `services/analytics/map-projection`.
 */

export interface KillMapProps {
  readonly detail: MatchDetail;
  /** 1-based (prorrogação 25+ incluída). */
  readonly roundNumber: number;
  /** PUUID do jogador em foco → destaca os abates e mortes dele. */
  readonly focusPuuid?: string;
}

// Paleta do scoreboard: time do foco em acento (amarelo), adversário em tinta.
const ALLY = { fill: 'var(--color-accent)', ink: 'var(--color-ink)' };
const ENEMY = { fill: 'var(--color-ink)', ink: '#ffffff' };

/** viewBox 0..100: u/v (0..1) da análise em unidades do SVG. */
function toSvg(point: MapPoint, transform: MinimapTransform): { x: number; y: number } {
  const { u, v } = projectToMinimap(point, transform);
  return { x: u * 100, y: v * 100 };
}

function clock(ms: number | null): string {
  if (ms === null) return '—';
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function KillMap({ detail, roundNumber, focusPuuid }: KillMapProps) {
  const minimap = minimapFor(detail.mapId ?? detail.map);
  if (minimap === null) return null;

  const players = new Map(detail.scoreboard.map((row) => [row.puuid, row]));
  const nameOf = (puuid: string): string => players.get(puuid)?.name ?? puuid;
  const teamIds = [...new Set(detail.scoreboard.map((row) => row.teamId))];
  const allyTeamId =
    (focusPuuid !== undefined ? players.get(focusPuuid)?.teamId : undefined) ?? teamIds[0];
  const colorOf = (puuid: string) =>
    players.get(puuid)?.teamId === allyTeamId ? ALLY : ENEMY;
  const hasFocus = focusPuuid !== undefined && players.has(focusPuuid);
  const allyLabel = hasFocus ? 'Seu time' : `Time ${allyTeamId ?? '—'}`;
  const enemyLabel = hasFocus
    ? 'Adversário'
    : `Time ${teamIds.find((id) => id !== allyTeamId) ?? '—'}`;

  const round = detail.rounds.find((r) => r.roundNumber === roundNumber);
  const kills = detail.kills
    .filter((k) => k.roundNumber === roundNumber)
    .map((k, index) => ({ ...k, order: index + 1 }));
  const located = kills.filter((k) => k.victimLocation != null);
  const spikes = [
    round?.plant != null ? { kind: 'plant' as const, event: round.plant } : null,
    round?.defuse != null ? { kind: 'defuse' as const, event: round.defuse } : null,
  ].filter((spike) => spike !== null);

  const winner = round?.winningTeamId;
  const meta = [
    winner == null ? null : `Vitória: ${winner === allyTeamId ? allyLabel : enemyLabel}`,
    round?.plantSite != null ? `Site ${round.plantSite}` : null,
  ]
    .filter((part) => part !== null)
    .join(' • ');

  return (
    <section
      data-component="kill-map"
      data-round={roundNumber}
      className="grid gap-4 md:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-md border border-line bg-surface-recessed">
        {/* eslint-disable-next-line @next/next/no-img-element -- minimapa estático local (1024²) */}
        <img src={minimap.src} alt="" className="absolute inset-0 size-full object-contain" />
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 size-full"
          role="img"
          aria-label={`Mapa de abates do round ${roundNumber} em ${detail.map}`}
        >
          {located.map((k) => {
            const victim = toSvg(k.victimLocation as MapPoint, minimap.transform);
            const killer = k.killerLocation == null ? null : toSvg(k.killerLocation, minimap.transform);
            const focus = hasFocus && (k.killerPuuid === focusPuuid || k.victimPuuid === focusPuuid);
            const killerColor = colorOf(k.killerPuuid);
            const victimColor = colorOf(k.victimPuuid);
            const positions = (k.playerLocations ?? [])
              .map((p) => `${nameOf(p.puuid)} (${p.location.x}, ${p.location.y})`)
              .join('; ');
            const r = focus ? 2.4 : 1.7;
            return (
              <g
                key={`${k.order}`}
                data-kill={k.order}
                data-focus={focus ? 'true' : undefined}
                opacity={hasFocus && !focus ? 0.75 : 1}
              >
                <title>{`#${k.order} ${clock(k.timeInRoundMs)} — ${k.killerName} → ${k.victimName}${k.weapon === null ? '' : ` (${k.weapon})`}${positions === '' ? '' : `. Posições: ${positions}`}`}</title>
                {killer !== null ? (
                  <>
                    <line
                      x1={killer.x}
                      y1={killer.y}
                      x2={victim.x}
                      y2={victim.y}
                      stroke={killerColor.fill}
                      strokeWidth={focus ? 0.7 : 0.45}
                      strokeLinecap="round"
                    />
                    <circle
                      cx={killer.x}
                      cy={killer.y}
                      r={focus ? 1.2 : 0.9}
                      fill={killerColor.fill}
                      stroke={killerColor.ink}
                      strokeWidth={0.25}
                    />
                  </>
                ) : null}
                <circle
                  cx={victim.x}
                  cy={victim.y}
                  r={r}
                  fill={victimColor.fill}
                  stroke={focus ? 'var(--color-tertiary)' : victimColor.ink}
                  strokeWidth={focus ? 0.6 : 0.3}
                />
                <path
                  d={`M${victim.x - r / 2} ${victim.y - r / 2} L${victim.x + r / 2} ${victim.y + r / 2} M${victim.x + r / 2} ${victim.y - r / 2} L${victim.x - r / 2} ${victim.y + r / 2}`}
                  stroke={victimColor.ink}
                  strokeWidth={0.4}
                />
                <text
                  x={victim.x + r + 0.6}
                  y={victim.y + 1}
                  fontSize={2.8}
                  fontWeight="bold"
                  fill="var(--color-ink)"
                  stroke="#ffffff"
                  strokeWidth={0.5}
                  paintOrder="stroke"
                  className="font-hud"
                >
                  {String(k.order)}
                </text>
              </g>
            );
          })}

          {spikes.map(({ kind, event }) => {
            const p = toSvg(event.location, minimap.transform);
            const label = kind === 'plant' ? 'Spike plantada' : 'Spike desarmada';
            return (
              <g key={kind} data-spike={kind}>
                <title>{`${label}${event.site === null ? '' : ` no site ${event.site}`} por ${nameOf(event.playerPuuid)} — ${clock(event.timeInRoundMs)}`}</title>
                {kind === 'plant' ? (
                  <rect
                    x={p.x - 1.6}
                    y={p.y - 1.6}
                    width={3.2}
                    height={3.2}
                    transform={`rotate(45 ${p.x} ${p.y})`}
                    fill="var(--color-loss)"
                    stroke="#ffffff"
                    strokeWidth={0.4}
                  />
                ) : (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={2.6}
                    fill="none"
                    stroke="var(--color-win)"
                    strokeWidth={0.7}
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
          <h3 className="font-hud text-label font-bold uppercase text-text-primary">
            Round {roundNumber}
          </h3>
          {meta !== '' ? (
            <span className="font-hud text-label-xs uppercase text-text-secondary">{meta}</span>
          ) : null}
        </header>

        {kills.length === 0 ? (
          <p className="text-body text-text-secondary">Sem abates neste round.</p>
        ) : (
          <ol className="flex flex-col divide-y divide-line border border-line bg-surface">
            {kills.map((k) => {
              const focus = hasFocus && (k.killerPuuid === focusPuuid || k.victimPuuid === focusPuuid);
              return (
                <li
                  key={k.order}
                  className={cx(
                    'grid grid-cols-[1.5rem_2.75rem_minmax(0,1fr)] items-center gap-2 px-2 py-1.5 font-hud text-label',
                    focus && 'bg-accent/20',
                  )}
                >
                  <span className="font-bold text-text-primary">{k.order}</span>
                  <span className="text-text-secondary">{clock(k.timeInRoundMs)}</span>
                  <span className="flex min-w-0 flex-wrap items-center gap-x-1.5">
                    <span
                      aria-hidden="true"
                      className={cx('size-2 shrink-0', colorOf(k.killerPuuid) === ALLY ? 'bg-accent ring-1 ring-ink' : 'bg-ink')}
                    />
                    <span className="truncate font-semibold text-text-primary">{k.killerName}</span>
                    <span className="text-text-secondary">→</span>
                    <span className="truncate text-text-primary">{k.victimName}</span>
                    {k.weapon !== null ? (
                      <span className="text-label-xs uppercase text-text-secondary">{k.weapon}</span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        {located.length < kills.length ? (
          <p className="font-hud text-label-xs uppercase text-text-secondary">
            {`${kills.length - located.length} abate(s) sem posição registrada`}
          </p>
        ) : null}

        <footer className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-2 font-hud text-label-xs uppercase text-text-secondary">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2 bg-accent ring-1 ring-ink" /> {allyLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2 bg-ink" /> {enemyLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2 rotate-45 bg-loss" /> Plant
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2 rounded-full border-2 border-win" /> Defuse
          </span>
          {hasFocus ? (
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2 rounded-full border-2 border-tertiary" /> Envolve você
            </span>
          ) : null}
          <span>Linha = killer → vítima (X)</span>
        </footer>
      </div>
    </section>
  );
}
