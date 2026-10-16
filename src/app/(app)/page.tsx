import { SystemStatusBar } from '@/components/layout/system-status-bar';
import { HomeLanding } from './home-landing';

/**
 * Home (tela Stitch "Busca de Jogador & Apresentação do Ecossistema"):
 * faixa de status tática + landing completa (hero de busca com modal de
 * ingestão, arquitetura 3-layer, módulos e status ao vivo) na ilha
 * `HomeLanding`. Server Component — sem fetch na raiz.
 */

export default function HomePage() {
  return (
    <div>
      <SystemStatusBar
        message="Motor tático v4.2 • Powered by MiniMax AI • 3-layer telemetry pipeline"
        statuses={[
          { icon: 'target', label: 'Latência: <150ms' },
          { icon: 'shield', label: 'Riot v9.11 compliant' },
        ]}
      />
      <HomeLanding />
    </div>
  );
}
