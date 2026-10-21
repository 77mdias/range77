/**
 * SimulatedBanner — faixa global exibida quando o app roda com dados
 * simulados. Texto exato exigido pelo plano (não parafrasear).
 */
export const SIMULATED_BANNER_TEXT =
  'Protótipo aguardando a Production API Key da Riot — todos os dados de partida são simulados.';

export function SimulatedBanner({ visible }: { readonly visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      data-simulated-banner
      role="status"
      className="border-b border-line bg-accent px-4 py-1.5 text-center font-hud text-label-xs uppercase text-on-accent"
    >
      {SIMULATED_BANNER_TEXT}
    </div>
  );
}
