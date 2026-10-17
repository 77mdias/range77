'use client';

import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { CheckboxRow } from '@/components/auth/checkbox-row';
import { Field } from '@/components/auth/field';
import { PasswordField } from '@/components/auth/password-field';
import { SubmitButton } from '@/components/auth/submit-button';
import { SESSION_TTL_DAYS } from '@/lib/session-policy';
import { parseEmail, parsePassword } from '@/lib/validation/credentials';

/**
 * LoginForm — tela 7: e-mail + senha + "manter sessão" (30 dias) via
 * `signIn.email`. Validação client-side com o mesmo módulo puro dos limites do
 * servidor; qualquer recusa do servidor vira um erro GENÉRICO (não revelamos
 * se o e-mail existe — evita enumeração de contas).
 *
 * TODO(reset-senha): "Esqueceu a senha?" exige provider de e-mail (spec §2 e
 * §10). `#` até a fase própria existir.
 */

export interface LoginFormProps {
  readonly callbackPath: string;
  readonly className?: string;
}

const GENERIC_ERROR = 'E-mail ou senha incorretos.';

export function LoginForm({ callbackPath, className }: LoginFormProps) {
  const emailId = useId();
  const passwordId = useId();
  const rememberId = useId();
  const errorId = useId();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function fail(message: string): void {
    setError(message);
  }

  async function submit(): Promise<void> {
    const parsedEmail = parseEmail(email);
    if (!parsedEmail.ok) {
      fail(parsedEmail.message);
      return;
    }
    const parsedPassword = parsePassword(password);
    if (!parsedPassword.ok) {
      fail(parsedPassword.message);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const { authClient } = await import('@/lib/auth-client');
      // `rememberMe` governa o cookie: `true` → persistente por
      // SESSION_TTL_SECONDS; `false` → cookie de sessão (morre ao fechar).
      const { error: signInError } = await authClient.signIn.email({
        email: parsedEmail.value,
        password: parsedPassword.value,
        rememberMe,
        callbackURL: callbackPath,
      });
      if (signInError !== null && signInError !== undefined) {
        fail(GENERIC_ERROR);
      }
    } catch {
      fail('Falha de rede ao contatar o servidor de autenticação.');
    } finally {
      setLoading(false);
    }
  }

  const invalid = error !== null ? { 'aria-invalid': true, 'aria-describedby': errorId } : {};

  return (
    <form
      data-email-login
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void submit();
      }}
      noValidate
      className={className}
    >
      <div className="flex flex-col gap-2">
        <Field
          id={emailId}
          name="email"
          label="E-mail"
          hint="RFC 822"
          type="email"
          autoComplete="email"
          placeholder="agente@valorant.coach"
          value={email}
          disabled={loading}
          onChange={(event) => setEmail(event.target.value)}
          icon="send"
          {...invalid}
        />

        <PasswordField
          id={passwordId}
          name="password"
          label="Senha de Acesso"
          autoComplete="current-password"
          value={password}
          disabled={loading}
          onChange={(event) => setPassword(event.target.value)}
          {...invalid}
          // O rótulo à direita do campo de senha é o link de reset, não um hint.
          hint={undefined}
        />

        <div className="flex items-center justify-between gap-2 font-hud text-label-xs uppercase">
          <Link
            href="#"
            className="text-text-secondary transition-colors duration-[var(--duration-fast)] hover:text-text-primary"
          >
            Esqueceu a senha?
          </Link>
          <span className="text-text-secondary">
            {`SESSÃO: ${SESSION_TTL_DAYS} DIAS`}
          </span>
        </div>

        <CheckboxRow
          id={rememberId}
          name="rememberMe"
          label={`Manter sessão segura neste terminal (${SESSION_TTL_DAYS} dias)`}
          hint="PERSISTENT_AUTH"
          checked={rememberMe}
          disabled={loading}
          onChange={(event) => setRememberMe(event.target.checked)}
        />

        <SubmitButton loading={loading}>ENTRAR NO VALORANT.COACH</SubmitButton>

        {error !== null ? (
          <p id={errorId} role="alert" className="text-body-sm text-loss">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
