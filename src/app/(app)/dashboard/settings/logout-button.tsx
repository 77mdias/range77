'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';

/**
 * Logout (client → authClient.signOut) + navegação para a home.
 */

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function signOut(): Promise<void> {
    setIsPending(true);
    try {
      await authClient.signOut();
      router.push('/');
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      loading={isPending}
      disabled={isPending}
      onClick={() => void signOut()}
    >
      Sair
    </Button>
  );
}
