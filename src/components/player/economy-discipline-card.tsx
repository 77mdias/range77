import type { BuyType } from '@/services/analytics/buy-type';
import type { EconomyDiscipline } from '@/services/analytics/economy-discipline';
import { Card } from '@/components/ui/card';

/**
 * EconomyDisciplineCard — resultado pronto de `computeEconomyDiscipline`:
 * quebras de economia do jogador (contagens absolutas) e win% do time por
 * tipo de compra. Só renderiza.
 */

export interface EconomyDisciplineCardProps {
  readonly discipline: EconomyDiscipline;
}

const BUYS: readonly { key: BuyType; label: string }[] = [
  { key: 'pistol', label: 'Pistol' },
  { key: 'eco', label: 'Eco' },
  { key: 'force', label: 'Force' },
  { key: 'full', label: 'Full buy' },
];

export function EconomyDisciplineCard({ discipline }: EconomyDisciplineCardProps) {
  const stats = [
    { key: 'forced', value: discipline.forcedWhileTeamSaved, label: 'Forçou com o time em eco' },
    { key: 'saved', value: discipline.savedWhileTeamBought, label: 'Salvou com o time comprando' },
  ];

  return (
    <div data-component="economy-discipline">
      <Card label="Disciplina econômica" action={<span className="font-hud text-label text-text-secondary">{`${discipline.rounds} rounds`}</span>}>
        <div className="flex flex-col gap-5">
          <dl className="grid grid-cols-2 gap-3">
            {stats.map((stat) => (
              <div key={stat.key} className="flex flex-col gap-1 border border-line bg-surface p-3">
                <dt className="text-label uppercase text-text-secondary">{stat.label}</dt>
                <dd data-stat={stat.key} className="font-hud text-heading-lg font-bold text-text-primary">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-col gap-2">
            <h3 className="text-label uppercase text-text-secondary">Win% do time por compra</h3>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {BUYS.map(({ key, label }) => {
                const rate = discipline.winRateByBuy[key];
                return (
                  <li
                    key={key}
                    data-buy={key}
                    className="flex flex-col gap-0.5 border border-line bg-surface px-3 py-2"
                  >
                    <span className="font-hud text-label-xs uppercase text-text-secondary">{label}</span>
                    <span className="font-hud text-heading-sm font-semibold text-text-primary">
                      {rate === null ? '—' : `${Math.round(rate * 100)}%`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
