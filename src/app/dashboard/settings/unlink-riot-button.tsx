'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { unlinkRiotAccount } from '@/app/actions/user-riot';

/**
 * Desvincular o Riot ID (Server Action via useTransition). A revalidação
 * das settings acontece no servidor (`revalidatePath`).
 */
export function UnlinkRiotButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      loading={isPending}
      disabled={isPending}
      onClick={() => {
        startTransition(() => {
          void unlinkRiotAccount();
        });
      }}
    >
      Desvincular
    </Button>
  );
}
