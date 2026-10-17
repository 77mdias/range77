'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { unfollowPlayer } from '@/app/actions/tracked-players';

/**
 * Deixar de seguir (Server Action via useTransition). A revalidação do
 * dashboard acontece no servidor (`revalidatePath('/dashboard')`).
 */

export interface UnfollowButtonProps {
  readonly region: string;
  readonly name: string;
  readonly tag: string;
  readonly className?: string;
}

export function UnfollowButton({ region, name, tag, className }: UnfollowButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      loading={isPending}
      disabled={isPending}
      className={className}
      onClick={() => {
        startTransition(() => {
          void unfollowPlayer({ region, name, tag });
        });
      }}
    >
      Deixar de seguir
    </Button>
  );
}
