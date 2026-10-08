import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table';

/**
 * SUITE TDD — Table: estrutura semântica, header sticky, densidade e
 * alinhamento numérico (font-hud / text-right).
 */

const SAMPLE = (
  <Table aria-label="Scoreboard">
    <TableHead>
      <TableRow>
        <TableHeaderCell>Jogador</TableHeaderCell>
        <TableHeaderCell numeric>K</TableHeaderCell>
      </TableRow>
    </TableHead>
    <TableBody>
      <TableRow>
        <TableCell>TenZ</TableCell>
        <TableCell numeric>24</TableCell>
      </TableRow>
    </TableBody>
  </Table>
);

describe('Table', () => {
  it('renderiza table com header/body semânticos', () => {
    const html = renderToStaticMarkup(SAMPLE);
    expect(html).toContain('<table');
    expect(html).toContain('<thead');
    expect(html).toContain('<tbody');
    expect(html).toContain('aria-label="Scoreboard"');
  });

  it('célula de header tem scope=col e é sticky', () => {
    const html = renderToStaticMarkup(SAMPLE);
    expect(html).toContain('scope="col"');
    expect(html).toContain('sticky top-0');
  });

  it('célula numérica alinha à direita em font-hud (header e corpo)', () => {
    const html = renderToStaticMarkup(SAMPLE);
    expect(html).toContain('text-right font-hud');
    expect(html).toContain('text-right');
  });

  it('linhas têm altura de 40px e hover de superfície', () => {
    const html = renderToStaticMarkup(SAMPLE);
    expect(html).toContain('h-10');
    expect(html).toContain('hover:bg-surface-hover');
  });

  it('corpo usa divisórias entre linhas', () => {
    expect(renderToStaticMarkup(SAMPLE)).toContain('divide-y divide-line');
  });
});
