import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RiotCallout } from '@/components/auth/riot-callout';

describe('RiotCallout', () => {
  it('a variante rso traz a marca R e o badge de homologação', () => {
    const html = renderToStaticMarkup(
      <RiotCallout variant="rso" title="Riot Games Sign-On (RSO) - Oficial" badge="[AGUARDANDO KEY PROD RIOT V9]">
        Em homologação.
      </RiotCallout>,
    );
    expect(html).toContain('data-riot-callout="rso"');
    expect(html).toContain('#D32936');
    expect(html).toContain('[AGUARDANDO KEY PROD RIOT V9]');
    expect(html).toContain('Em homologação.');
  });

  it('a variante status usa ponto pulsante e não usa badge', () => {
    const html = renderToStaticMarkup(
      <RiotCallout variant="status" title="STATUS HOMOLOGAÇÃO RIOT GAMES OAUTH DIRECT">
        Em processo.
      </RiotCallout>,
    );
    expect(html).toContain('data-riot-callout="status"');
    expect(html).toContain('animate-pulse');
    expect(html).not.toContain('#D32936');
  });
});
