'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/ui/search-bar';
import { linkRiotAccount } from '@/app/actions/user-riot';

/**
 * Vincular o Riot ID do usuário logado (Server Action via useTransition).
 * A SearchBar valida `Nome#Tag` no cliente; o servidor revalida (afinidade
 * + parseRiotId) e persiste via store. Erros voltam no `message` inline.
 */

export function LinkRiotForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div data-link-riot-form className="flex flex-col gap-2">
      <SearchBar
        defaultRegion="br"
        submitLabel="Vincular"
        loading={isPending}
        disabled={isPending}
        onSubmit={(query) => {
          setError(null);
          startTransition(async () => {
            const result = await linkRiotAccount({
              region: query.region,
              name: query.name,
              tag: query.tag,
            });
            if (!result.ok) {
              setError(result.message);
            }
          });
        }}
      />

      {error !== null ? (
        <p role="alert" className="text-body text-loss">
          {error}
        </p>
      ) : null}
    </div>
  );
}
