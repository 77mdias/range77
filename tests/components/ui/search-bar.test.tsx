// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SearchBar } from '@/components/ui/search-bar';

/**
 * SUITE TDD — SearchBar: emissão do contrato { region, name, tag },
 * validação client-side e estado de erro.
 */

afterEach(cleanup);

function getForm(container: HTMLElement): HTMLFormElement {
  const form = container.querySelector('form');
  if (form === null) {
    throw new Error('form não encontrado');
  }
  return form;
}

describe('SearchBar', () => {
  it('emite { region, name, tag } quando o Riot ID é válido', () => {
    const onSubmit = vi.fn();
    const { container } = render(<SearchBar onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText('Nome#Tag'), {
      target: { value: 'TenZ#1234' },
    });
    fireEvent.submit(getForm(container));

    expect(onSubmit).toHaveBeenCalledWith({ region: 'br', name: 'TenZ', tag: '1234' });
  });

  it('reflete a região selecionada', () => {
    const onSubmit = vi.fn();
    const { container } = render(<SearchBar onSubmit={onSubmit} defaultRegion="na" />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'eu' } });
    fireEvent.change(screen.getByPlaceholderText('Nome#Tag'), {
      target: { value: 'TenZ#EU1' },
    });
    fireEvent.submit(getForm(container));

    expect(onSubmit).toHaveBeenCalledWith({ region: 'eu', name: 'TenZ', tag: 'EU1' });
  });

  it('mostra erro e NÃO emite quando falta a #', () => {
    const onSubmit = vi.fn();
    const { container } = render(<SearchBar onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText('Nome#Tag'), { target: { value: 'TenZ' } });
    fireEvent.submit(getForm(container));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('Nome#Tag');
  });

  it('mostra erro quando a tag é inválida', () => {
    const onSubmit = vi.fn();
    const { container } = render(<SearchBar onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText('Nome#Tag'), {
      target: { value: 'TenZ#toolong1' },
    });
    fireEvent.submit(getForm(container));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('alfanuméricos');
  });

  it('pré-preenche o valor inicial e lista as 6 regiões', () => {
    render(<SearchBar onSubmit={vi.fn()} defaultValue="TenZ#1234" />);
    expect((screen.getByPlaceholderText('Nome#Tag') as HTMLInputElement).value).toBe('TenZ#1234');

    const options = screen.getAllByRole('option');
    expect(options.map((option) => (option as HTMLOptionElement).value)).toEqual([
      'eu',
      'na',
      'ap',
      'kr',
      'latam',
      'br',
    ]);
  });

  it('permite customizar o rótulo do botão de submit (submitLabel)', () => {
    render(<SearchBar onSubmit={vi.fn()} submitLabel="Vincular" />);

    expect(screen.getByRole('button', { name: 'Vincular' })).toBeTruthy();
  });
});
