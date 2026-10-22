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
            window.location.assign(await authorizeRso(state, region));
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
