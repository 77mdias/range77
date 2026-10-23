'use client';

import { useTransition } from 'react';
import { authorizeRso, denyRso } from '@/app/actions/rso';
import { Button } from '@/components/ui';

/**
 * Autorizar: navegação de documento para a URL devolvida (o callback precisa
 * de um GET real do navegador para o Set-Cookie valer). Negar redireciona.
 */
export function ConsentForm({ state, region }: { readonly state: string; readonly region: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            // Falha de transporte não pode deixar o botão preso em pending.
            const target = await authorizeRso(state, region).catch(
              () => '/dashboard/settings?rso=error',
            );
            window.location.assign(target);
          })
        }
      >
        Autorizar
      </Button>
      <Button variant="secondary" disabled={pending} onClick={() => startTransition(() => denyRso())}>
        Negar
      </Button>
    </div>
  );
}
