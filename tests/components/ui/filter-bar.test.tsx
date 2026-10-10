import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  FilterBar,
  FilterCheckbox,
  FilterLabel,
  FilterSelect,
} from '@/components/ui/filter-bar';

describe('FilterBar', () => {
  it('renderiza o trilho de filtros com o chip de rótulo', () => {
    const html = renderToStaticMarkup(
      <FilterBar>
        <FilterLabel>Filtros ativos:</FilterLabel>
      </FilterBar>,
    );
    expect(html).toContain('data-component="filter-bar"');
    expect(html).toContain('Filtros ativos:');
    expect(html).toContain('data-icon="filter"');
  });

  it('FilterSelect marca a opção ativa', () => {
    const html = renderToStaticMarkup(
      <FilterSelect
        label="Temporada"
        value="v25"
        onChange={() => {}}
        options={[
          { value: 'v25', label: 'Episódio 25' },
          { value: 'v24', label: 'Episódio 24' },
        ]}
      />,
    );
    expect(html).toContain('data-component="filter-select"');
    expect(html).toContain('value="v25"');
    expect(html).toContain('Episódio 24');
  });

  it('FilterCheckbox reflete checked', () => {
    expect(
      renderToStaticMarkup(
        <FilterCheckbox label="Mínimo de 3 jogos" checked onChange={() => {}} />,
      ),
    ).toContain('checked=""');
    expect(
      renderToStaticMarkup(
        <FilterCheckbox label="Mínimo de 3 jogos" checked={false} onChange={() => {}} />,
      ),
    ).not.toContain('checked=""');
  });
});
