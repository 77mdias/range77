'use client';

import { useId, useState, useTransition } from 'react';
import { CheckboxRow } from '@/components/auth/checkbox-row';
import { setProfilePublic } from '@/app/actions/user-riot';

/**
 * Toggle "Tornar meu perfil público" (Server Action via useTransition).
 * Otimista: marca na hora e desfaz se o servidor recusar.
 */
export function ProfilePublicToggle({ initialValue }: { readonly initialValue: boolean }) {
  const id = useId();
  const [checked, setChecked] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div data-profile-public-toggle className="flex flex-col gap-1">
      <CheckboxRow
        id={id}
        name="profilePublic"
        label="Tornar meu perfil público"
        hint="Desligado, ninguém além de você vê seu perfil e suas partidas."
        checked={checked}
        disabled={isPending}
        onChange={(event) => {
          const next = event.target.checked;
          setChecked(next);
          setError(null);
          startTransition(async () => {
            const result = await setProfilePublic(next);
            if (!result.ok) {
              setChecked(!next);
              setError(result.message);
            }
          });
        }}
      />
      {error !== null ? (
        <p role="alert" className="text-body-sm text-loss">
          {error}
        </p>
      ) : null}
    </div>
  );
}
