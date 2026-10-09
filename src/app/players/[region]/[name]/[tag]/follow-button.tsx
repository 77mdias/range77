'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { followPlayer, unfollowPlayer } from '@/app/actions/tracked-players';

/**
 * Seguir / deixar de seguir no perfil público (Server Actions via
 * useTransition). O estado local reflete a intenção otimista; falhas
 * revertem e aparecem como mensagem inline.
 */

export interface FollowButtonProps {
  readonly region: string;
  readonly name: string;
  readonly tag: string;
  readonly initialFollowing: boolean;
}

export function FollowButton({ region, name, tag, initialFollowing }: FollowButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [following, setFollowing] = useState(initialFollowing);
  const [error, setError] = useState<string | null>(null);

  function toggle(): void {
    const next = !following;
    setFollowing(next);
    setError(null);
    startTransition(() => {
      const action = next ? followPlayer({ region, name, tag }) : unfollowPlayer({ region, name, tag });
      void action.then((result) => {
        if (!result.ok) {
          setFollowing(!next);
          setError(result.message);
        }
      });
    });
  }

  return (
    <div data-follow-button className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant={following ? 'secondary' : 'primary'}
        size="sm"
        loading={isPending}
        disabled={isPending}
        onClick={toggle}
      >
        {following ? 'Seguindo ✓' : 'Seguir'}
      </Button>
      {error !== null ? (
        <p role="alert" className="text-label text-loss">
          {error}
        </p>
      ) : null}
    </div>
  );
}
