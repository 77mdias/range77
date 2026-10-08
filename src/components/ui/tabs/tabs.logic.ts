/**
 * Lógica pura de navegação por teclado das Tabs (roving tabindex).
 * Isolada do componente para ser testada sem DOM e manter a convenção
 * ARIA `tablist` (setas circulam, Home/End vão aos extremos).
 */

/** Teclas suportadas; qualquer outra retorna `null` (não previne default). */
export function getNextTabIndex(
  currentIndex: number,
  count: number,
  key: string,
): number | null {
  if (count <= 0 || currentIndex < 0) {
    return null;
  }

  switch (key) {
    case 'ArrowRight':
      return (currentIndex + 1) % count;
    case 'ArrowLeft':
      return (currentIndex - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}
