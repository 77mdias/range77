import { ChamferBox } from '@/components/ui/chamfer-box';
import { SearchForm } from './search-form';

/**
 * Home (fase 2): hero display + busca FUNCIONAL (navega para o perfil) +
 * faixa de features.
 */

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

        {/* Busca funcional: valida o Riot ID e navega para /players/... */}
        <div className="w-full max-w-2xl pt-4">
          <SearchForm />
        </div>
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
