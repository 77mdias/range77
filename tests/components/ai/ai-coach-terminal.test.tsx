import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AiCoachTerminal } from '@/components/ai';
import { CoachingTip } from '@/components/ui';

describe('AiCoachTerminal', () => {
  it('renderiza status, título, score strip e corpo', () => {
    const html = renderToStaticMarkup(
      <AiCoachTerminal
        status="Layer 3 online"
        title="Protocol advice"
        scoreLine="Backend Score: 87/100 • 3-Layer"
      >
        <CoachingTip title="Dica">Treine retakes.</CoachingTip>
      </AiCoachTerminal>,
    );
    expect(html).toContain('data-component="ai-coach-terminal"');
    expect(html).toContain('Layer 3 online');
    expect(html).toContain('Protocol advice');
    expect(html).toContain('Backend Score: 87/100 • 3-Layer');
    expect(html).toContain('animate-pulse');
    expect(html).toContain('Treine retakes.');
  });
});
