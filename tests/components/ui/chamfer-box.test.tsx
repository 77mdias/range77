import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChamferBox } from '@/components/ui/chamfer-box';

/**
 * SUITE TDD — primitiva de canto chanfrado (assinatura visual do sistema).
 * O contrato é verificado no HTML estático: componente é um Server
 * Component puro (sem hooks/estado), renderizável via react-dom/server.
 */

describe('ChamferBox', () => {
  it('renderiza um div com o clip do tamanho padrão (md)', () => {
    expect(renderToStaticMarkup(<ChamferBox>X</ChamferBox>)).toBe(
      '<div class="chamfer-md">X</div>',
    );
  });

  it('aplica o clip dos tamanhos sm e lg', () => {
    expect(renderToStaticMarkup(<ChamferBox size="sm">X</ChamferBox>)).toBe(
      '<div class="chamfer-sm">X</div>',
    );
    expect(renderToStaticMarkup(<ChamferBox size="lg">X</ChamferBox>)).toBe(
      '<div class="chamfer-lg">X</div>',
    );
  });

  it('renderiza o elemento customizado via `as`', () => {
    expect(renderToStaticMarkup(<ChamferBox as="section">X</ChamferBox>)).toBe(
      '<section class="chamfer-md">X</section>',
    );
  });

  it('mescla className extra no elemento externo', () => {
    expect(renderToStaticMarkup(<ChamferBox className="extra">X</ChamferBox>)).toBe(
      '<div class="chamfer-md extra">X</div>',
    );
  });

  it('bordered usa a técnica aninhada: externo com cor da linha + interno com superfície, ambos com o mesmo clip', () => {
    expect(renderToStaticMarkup(<ChamferBox bordered>X</ChamferBox>)).toBe(
      '<div class="chamfer-md chamfer-box-bordered"><div class="chamfer-md chamfer-box-inner">X</div></div>',
    );
  });

  it('bordered mescla className apenas no elemento externo', () => {
    const html = renderToStaticMarkup(
      <ChamferBox bordered className="extra">
        X
      </ChamferBox>,
    );
    expect(html).toBe(
      '<div class="chamfer-md chamfer-box-bordered extra"><div class="chamfer-md chamfer-box-inner">X</div></div>',
    );
  });

  it('repassa style (ex.: --chamfer-inner-bg) para o elemento externo', () => {
    const html = renderToStaticMarkup(
      <ChamferBox bordered style={{ '--chamfer-inner-bg': 'var(--color-surface-raised)' }}>
        X
      </ChamferBox>,
    );
    expect(html).toBe(
      '<div class="chamfer-md chamfer-box-bordered" style="--chamfer-inner-bg:var(--color-surface-raised)"><div class="chamfer-md chamfer-box-inner">X</div></div>',
    );
  });
});
