import type { Metadata } from 'next';
import { CONTACT_EMAIL } from '@/lib/legal';

export const metadata: Metadata = { title: 'Privacidade — ValCoach' };

const H2 = 'font-hud text-lg uppercase text-text-primary';

/** Conteúdo estático: sem APIs dinâmicas, não precisa de Suspense. */
export default function PrivacidadePage() {
  return (
    <article className="mx-auto w-full max-w-3xl space-y-5 px-4 py-10 text-text-secondary">
      <h1 className="font-hud text-2xl uppercase text-text-primary">Política de Privacidade</h1>
      <h2 className={H2}>O que guardamos</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Conta do app (Better Auth): e-mail, nome e dados do provedor social (OAuth), além das sessões.</li>
        <li>
          Vínculo com a conta Riot: PUUID, Riot ID, região, forma de vínculo e se o perfil é
          público (começa privado).
        </li>
        <li>Jogadores que você segue (lista de acompanhamento).</li>
        <li>
          Resumos de desempenho calculados (snapshots de combate), por jogador e não por conta, usados
          pelo coach.
        </li>
        <li>
          Cache de partidas: o conteúdo bruto de cada partida aberta, que inclui dados dos demais
          participantes, é guardado por 24 horas para evitar consultas repetidas e depois expira.
        </li>
        <li>Jogadores buscados recentemente, guardados só no armazenamento local do seu navegador.</li>
      </ul>
      <h2 className={H2}>Retenção</h2>
      <p>
        Mantemos os dados enquanto a conta existir. Ao desvincular a conta Riot, apenas o vínculo
        (PUUID, Riot ID e região) é apagado; os resumos de desempenho são por jogador, não por conta, e
        não são removidos pelo desvínculo. Os recentes ficam no seu navegador até você limpá-lo.
      </p>
      <h2 className={H2}>Seu controle</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          Tornar o perfil privado: em Configurações, desligue &quot;Tornar meu perfil
          público&quot;.
        </li>
        <li>Desvincular: em Configurações, use &quot;Desvincular conta Riot&quot;.</li>
        <li>
          Apagar a conta: não há exclusão automática; é um processo manual, solicitado por e-mail
          para {CONTACT_EMAIL}. A exclusão remove a conta, o vínculo Riot e os jogadores seguidos.
          Os resumos de desempenho por jogador e o cache de partidas (que expira em 24 horas) não
          pertencem à conta e não são apagados com ela.
        </li>
      </ul>
      <h2 className={H2}>Compartilhamento</h2>
      <p>
        Não vendemos dados. Seu perfil só é visível a outras pessoas se você o tornar público.
      </p>
    </article>
  );
}
