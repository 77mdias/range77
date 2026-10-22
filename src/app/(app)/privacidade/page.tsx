import type { Metadata } from 'next';
import { CONTACT_EMAIL } from '@/lib/legal';

export const metadata: Metadata = { title: 'Privacidade — ValCoach' };

const H2 = 'font-hud text-lg uppercase text-text-primary';

/** Conteúdo estático: sem APIs dinâmicas, não precisa de Suspense. */
export default function PrivacidadePage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-10 text-text-secondary">
      <h1 className="font-hud text-2xl uppercase text-text-primary">Política de Privacidade</h1>
      <h2 className={H2}>O que guardamos</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Conta do app (Better Auth): e-mail, nome e dados do provedor social (OAuth), além das sessões.</li>
        <li>
          Vínculo com a conta Riot: PUUID, Riot ID, região, forma de vínculo e se o perfil é
          público (começa privado).
        </li>
        <li>Jogadores que você segue (lista de acompanhamento).</li>
        <li>Resumos de desempenho calculados (snapshots de combate) usados pelo coach.</li>
        <li>Jogadores buscados recentemente, guardados só no armazenamento local do seu navegador.</li>
      </ul>
      <h2 className={H2}>Retenção</h2>
      <p>
        Mantemos os dados enquanto a conta existir. Ao desvincular a conta Riot, o vínculo é
        apagado. Os recentes ficam no seu navegador até você limpá-lo.
      </p>
      <h2 className={H2}>Seu controle</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          Tornar o perfil privado: em Configurações, desligue &quot;Tornar meu perfil
          público&quot;.
        </li>
        <li>Desvincular: em Configurações, use &quot;Desvincular conta Riot&quot;.</li>
        <li>
          Apagar a conta: solicite pelo e-mail de contato {CONTACT_EMAIL} (TODO do dono: definir o
          endereço real). A exclusão remove também vínculo e jogadores seguidos.
        </li>
      </ul>
      <h2 className={H2}>Compartilhamento</h2>
      <p>
        Não vendemos dados. Seu perfil só é visível a outras pessoas se você o tornar público.
      </p>
    </main>
  );
}
