import type { Metadata } from 'next';
import { CONTACT_EMAIL, RIOT_LEGAL_NOTICE } from '@/lib/legal';

export const metadata: Metadata = { title: 'Termos de Uso — ValCoach' };

/** Conteúdo estático: sem APIs dinâmicas, não precisa de Suspense. */
export default function TermosPage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-10 text-text-secondary">
      <h1 className="font-hud text-2xl uppercase text-text-primary">Termos de Uso</h1>
      <p>
        O ValCoach é um projeto independente de análise de desempenho em VALORANT. Ao usar o
        serviço você concorda com estes termos.
      </p>
      <h2 className="font-hud text-lg uppercase text-text-primary">Protótipo e dados simulados</h2>
      <p>
        Enquanto aguardamos a Production API Key da Riot, todos os dados de partida são
        simulados e identificados com o selo DADOS SIMULADOS. Nada aqui representa o
        desempenho real de nenhum jogador.
      </p>
      <h2 className="font-hud text-lg uppercase text-text-primary">Sua conta</h2>
      <p>
        Você é responsável pelo acesso à sua conta. Só é possível vincular a própria conta
        Riot, por meio do Riot Sign-On, e o perfil só fica público se você ativar essa opção.
      </p>
      <h2 className="font-hud text-lg uppercase text-text-primary">Uso aceitável</h2>
      <p>
        Não use o serviço para assediar jogadores, extrair dados em massa ou contornar os
        limites de uso. Podemos suspender contas que violem estas regras.
      </p>
      <h2 className="font-hud text-lg uppercase text-text-primary">Aviso legal da Riot Games</h2>
      <p>{RIOT_LEGAL_NOTICE}</p>
      <h2 className="font-hud text-lg uppercase text-text-primary">Contato</h2>
      <p>{CONTACT_EMAIL}</p>
    </main>
  );
}
