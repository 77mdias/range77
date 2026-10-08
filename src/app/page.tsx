import { ChamferBox } from '@/components/ui/chamfer-box';
import { cx } from '@/lib/cx';

/**
 * Home provisória (fase 1a): hero display + barra de busca PLACEHOLDER
 * (a navegação para o perfil entra na fase 2) + faixa de features.
 */

const REGIONS = ['eu', 'na', 'ap', 'kr', 'latam', 'br'] as const;

const FEATURES: readonly { readonly title: string; readonly description: string }[] = [
  {
    title: 'Análise de Combate',
    description:
      'KDR, ACS, HS%, KAST e first bloods/drys das últimas partidas — as métricas que decidem rounds.',
  },
  {
    title: 'Evolução Temporal',
    description:
      'Compare janelas de partidas e acompanhe tendências: o seu jogo está melhorando ou piorando?',
  },
  {
    title: 'Hooks de Coaching',
    description:
      'Insights acionáveis gerados do seu perfil estatístico — o que treinar na próxima sessão.',
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4">
      <section className="flex flex-col items-center gap-6 py-20 text-center md:py-28">
        <p className="text-label uppercase text-accent">Tracker público · coach estatístico</p>

        <h1 className="font-display text-display-md text-text-primary sm:text-display-lg md:text-display-xl">
          ANALISE. EVOLUA. <span className="text-accent">DOMINE.</span>
        </h1>

        <p className="max-w-2xl text-body-lg text-text-secondary">
          Analytics de combate, evolução temporal e hooks de coaching para jogadores de Valorant.
        </p>

        {/* PLACEHOLDER da fase 2 — busca ainda não navega para o perfil. */}
        <form data-search-placeholder className="flex w-full max-w-xl flex-col gap-3 pt-4 sm:flex-row">
          <div className="flex flex-1">
            <label htmlFor="search-region" className="sr-only">
              Região
            </label>
            <select
              id="search-region"
              name="region"
              defaultValue="br"
              className={cx(
                'h-12 w-28 border border-line bg-surface-raised px-3',
                'font-hud text-body uppercase text-text-primary',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent',
              )}
            >
              {REGIONS.map((region) => (
                <option key={region} value={region}>
                  {region.toUpperCase()}
                </option>
              ))}
            </select>

            <label htmlFor="search-riot-id" className="sr-only">
              Riot ID (nome#tag)
            </label>
            <input
              id="search-riot-id"
              name="riot-id"
              type="text"
              autoComplete="off"
              placeholder="Nome#Tag"
              className={cx(
                'h-12 min-w-0 flex-1 border border-l-0 border-line bg-surface-raised px-4',
                'text-body text-text-primary placeholder:text-text-secondary',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent',
              )}
            />
          </div>

          {/* PLACEHOLDER da fase 2 — o <Button> chega na fase 1b. */}
          <button
            type="button"
            className={cx(
              'h-12 bg-accent px-8 text-body-lg font-semibold uppercase tracking-wide',
              'font-hud text-on-accent shadow-hard',
              'transition-all duration-[var(--duration-fast)] ease-out-expo',
              'hover:bg-accent-hover active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
            )}
          >
            Buscar
          </button>
        </form>
      </section>

      <section aria-label="Funcionalidades" className="grid gap-4 pb-20 sm:grid-cols-3 md:pb-28">
        {FEATURES.map((feature) => (
          <ChamferBox key={feature.title} bordered>
            <div className="p-6 text-left">
              <h2 className="font-display text-heading-sm text-text-primary">{feature.title}</h2>
              <p className="mt-2 text-body text-text-secondary">{feature.description}</p>
            </div>
          </ChamferBox>
        ))}
      </section>
    </div>
  );
}
