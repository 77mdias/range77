import type { MatchDetail } from '@/contracts/tracker';
import { classifyTeamBuy, type BuyType } from '@/services/analytics/buy-type';
import { agentIconSrc } from '@/lib/valorant-assets';
import { cx } from '@/lib/cx';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';

/**
 * RoundEconomy — compra de UM time round a round (só a fonte Riot traz
 * economia): tipo de compra do time (`classifyTeamBuy`) e, por jogador,
 * arma/armadura, valor do loadout, gasto e sobra. Sem `detail.economy` → não
 * renderiza (nada de placeholder inventado).
 */

export interface RoundEconomyProps {
  readonly detail: MatchDetail;
  readonly teamId: string;
  /** Rótulo do time (ex.: "Time aliado"); padrão "Time {teamId}". */
  readonly label?: string;
  /** PUUID em foco → coluna destacada. */
  readonly focusPuuid?: string;
}

const BUY_LABEL: Record<BuyType, string> = {
  pistol: 'Pistol',
  eco: 'Eco',
  force: 'Force',
  full: 'Full buy',
};

const BUY_CHIP: Record<BuyType, string> = {
  pistol: 'border border-line bg-surface text-text-primary',
  eco: 'bg-surface-highest text-text-secondary',
  force: 'bg-ink text-surface',
  full: 'bg-accent text-on-accent',
};

const credits = (value: number): string => value.toLocaleString('pt-BR');

export function RoundEconomy({ detail, teamId, label, focusPuuid }: RoundEconomyProps) {
  const economy = detail.economy ?? [];
  if (economy.length === 0) return null;

  const players = detail.scoreboard.filter((row) => row.teamId === teamId);
  const rounds = [...detail.rounds]
    .sort((a, b) => a.roundNumber - b.roundNumber)
    .filter((round) =>
      economy.some((e) => e.teamId === teamId && e.roundNumber === round.roundNumber),
    );
  if (players.length === 0 || rounds.length === 0) return null;

  return (
    <section
      data-component="round-economy"
      data-team={teamId}
      className="flex min-w-0 flex-col gap-2"
    >
      <h3 className="flex items-center gap-2 font-hud text-label font-bold uppercase text-text-primary">
        <span aria-hidden="true" className={cx('size-2.5', players.some((p) => p.puuid === focusPuuid) ? 'bg-accent ring-1 ring-ink' : 'bg-ink')} />
        {label ?? `Time ${teamId}`}
      </h3>
      <div className="max-h-[32rem] overflow-y-auto border border-line bg-surface">
        <Table className="min-w-[46rem]">
          <TableHead>
            <TableRow>
              <TableHeaderCell className="w-12">Rd</TableHeaderCell>
              <TableHeaderCell className="w-24">Compra</TableHeaderCell>
              {players.map((player) => {
                const icon = agentIconSrc(player.agent);
                return (
                  <TableHeaderCell
                    key={player.puuid}
                    className={cx(player.puuid === focusPuuid && 'bg-accent/30 text-text-primary')}
                  >
                    <span className="flex items-center gap-1.5 normal-case">
                      {icon !== null ? (
                        // eslint-disable-next-line @next/next/no-img-element -- ícone local do agente
                        <img src={icon} alt="" className="size-5 shrink-0" />
                      ) : null}
                      <span className="truncate font-semibold text-text-primary">{player.name}</span>
                    </span>
                  </TableHeaderCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {rounds.map((round) => {
              const buy = classifyTeamBuy(economy, teamId, round.roundNumber);
              return (
                <TableRow key={round.roundNumber} data-buy-type={buy} className="h-auto">
                  <TableCell numeric className="text-left font-semibold">
                    {round.roundNumber}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cx(
                        'inline-block whitespace-nowrap px-1.5 py-0.5 font-hud text-label-xs font-semibold uppercase',
                        BUY_CHIP[buy],
                      )}
                    >
                      {BUY_LABEL[buy]}
                    </span>
                  </TableCell>
                  {players.map((player) => {
                    const entry = economy.find(
                      (e) => e.roundNumber === round.roundNumber && e.puuid === player.puuid,
                    );
                    return (
                      <TableCell
                        key={player.puuid}
                        className={cx('py-1.5', player.puuid === focusPuuid && 'bg-accent/10')}
                      >
                        {entry === undefined ? (
                          <span className="text-text-secondary">—</span>
                        ) : (
                          <span className="flex flex-col whitespace-nowrap font-hud leading-tight">
                            <span className="text-label font-semibold text-text-primary">
                              {`${entry.weapon ?? '—'}${entry.armor === null ? '' : ` + ${entry.armor.replace(/ Shields$/, '')}`}`}
                            </span>
                            <span className="text-label-xs text-text-secondary">
                              {`loadout ${credits(entry.loadoutValue)} · gasto ${credits(entry.spent)} · sobra ${credits(entry.remaining)}`}
                            </span>
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
