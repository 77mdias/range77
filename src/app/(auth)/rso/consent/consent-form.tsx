'use client';

import { useTransition } from 'react';
import { authorizeRso, denyRso } from '@/app/actions/rso';
import { Button } from '@/components/ui';

/** Botões Autorizar/Negar — as Server Actions redirecionam sozinhas. */
export function ConsentForm({ state, region }: { readonly state: string; readonly region: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-wrap gap-3">
      <Button loading={pending} onClick={() => startTransition(() => authorizeRso(state, region))}>
        Autorizar
      </Button>
      <Button variant="secondary" disabled={pending} onClick={() => startTransition(() => denyRso())}>
        Negar
      </Button>
    </div>
  );
}
