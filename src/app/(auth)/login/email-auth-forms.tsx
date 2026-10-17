'use client';

import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { cx } from '@/lib/cx';
import {
  parseEmail,
  parsePassword,
  parseName,
} from '@/lib/validation/credentials';

/**
 * SignupForm — cadastro manual (nome + email + senha) via Better Auth
 * `signUp.email`. O `parseName` aqui dá feedback imediato; o servidor
 * revalida tudo (fonte única: `credentials.ts`).
 */

export interface SignupFormProps {
  readonly callbackPath: string;
  readonly className?: string;
}

const EMAIL_IN_USE = 'Este e-mail já está cadastrado. Tente entrar.';

export function SignupForm({ callbackPath, className }: SignupFormProps) {
  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void submit();
  }

  async function submit(): Promise<void> {
    const parsedName = parseName(name);
    if (!parsedName.ok) {
      setError(parsedName.message);
      return;
    }
    const parsedEmail = parseEmail(email);
    if (!parsedEmail.ok) {
      setError(parsedEmail.message);
      return;
    }
    const parsedPassword = parsePassword(password);
    if (!parsedPassword.ok) {
      setError(parsedPassword.message);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const { authClient } = await import('@/lib/auth-client');
      const { error: signUpError } = await authClient.signUp.email({
        name: parsedName.value,
        email: parsedEmail.value,
        password: parsedPassword.value,
        callbackURL: callbackPath,
      });
      if (signUpError !== null && signUpError !== undefined) {
        setError(
          signUpError.code === 'USER_ALREADY_EXISTS'
            ? EMAIL_IN_USE
            : 'Não foi possível criar a conta. Tente novamente.',
        );
      }
    } catch {
      setError('Falha de rede ao contatar o servidor de autenticação.');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = cx(
    'h-12 w-full rounded-md border border-line bg-surface px-4',
    'text-body text-text-primary placeholder:text-text-secondary',
    'disabled:cursor-not-allowed disabled:opacity-50',
  );

  return (
    <form
      data-signup-form
      onSubmit={handleSubmit}
      noValidate
      className={cx('flex w-full flex-col gap-3', className)}
    >
      <div className="flex flex-col gap-2 text-left">
        <label htmlFor={nameId} className="text-label uppercase text-text-secondary">
          Nome
        </label>
        <input
          id={nameId}
          name="name"
          type="text"
          autoComplete="name"
          value={name}
          disabled={loading}
          onChange={(event) => setName(event.target.value)}
          placeholder="Como quer ser chamado"
          aria-invalid={error !== null ? true : undefined}
          aria-describedby={error !== null ? errorId : undefined}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2 text-left">
        <label htmlFor={emailId} className="text-label uppercase text-text-secondary">
          E-mail
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          disabled={loading}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nome@dominio.com"
          aria-invalid={error !== null ? true : undefined}
          aria-describedby={error !== null ? errorId : undefined}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2 text-left">
        <label htmlFor={passwordId} className="text-label uppercase text-text-secondary">
          Senha
        </label>
        <input
          id={passwordId}
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          disabled={loading}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={`Mínimo de 8 caracteres`}
          aria-invalid={error !== null ? true : undefined}
          aria-describedby={error !== null ? errorId : undefined}
          className={inputClass}
        />
      </div>

      <Button type="submit" loading={loading} disabled={loading}>
        Criar conta
      </Button>

      {error !== null ? (
        <p id={errorId} role="alert" className="text-body text-loss">
          {error}
        </p>
      ) : null}
    </form>
  );
}
