import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FeatureModuleCard } from '@/components/home';

describe('FeatureModuleCard', () => {
  it('renderiza ID, ícone, título, descrição e rodapé stat', () => {
    const html = renderToStaticMarkup(
      <FeatureModuleCard
        moduleId="MOD_01"
        icon="terminal"
        title="Histórico telemétrico compacto"
        description="Timeline round a round com classificação econômica."
        statLabel="Detecção de duelos"
        statValue="100% exato"
      />,
    );
    expect(html).toContain('data-component="feature-module-card"');
    expect(html).toContain('data-module="MOD_01"');
    expect(html).toContain('Histórico telemétrico compacto');
    expect(html).toContain('100% exato');
    expect(html).toContain('data-icon="terminal"');
  });
});
