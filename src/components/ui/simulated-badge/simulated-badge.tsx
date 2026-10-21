/**
 * SimulatedBadge — selo "DADOS SIMULADOS" exibido junto à identidade do
 * jogador/partida sempre que a fonte de dados é o mock (Riot reviewer nunca
 * deve confundir dado simulado com real). Apresentação pura.
 */
export function SimulatedBadge() {
  return (
    <span
      data-simulated-badge
      className="inline-flex items-center border border-line bg-accent px-1.5 py-0.5 font-hud text-label-xs uppercase text-on-accent"
    >
      DADOS SIMULADOS
    </span>
  );
}
