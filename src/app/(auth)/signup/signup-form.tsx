'use client';

import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CheckboxRow } from '@/components/auth/checkbox-row';
import { Field } from '@/components/auth/field';
import { PasswordField } from '@/components/auth/password-field';
import { SubmitButton } from '@/components/auth/submit-button';
import {
  parseEmail,
  parseName,
  parsePassword,
  parsePasswordConfirmation,
} from '@/lib/validation/credentials';

/**
 * SignupForm — tela 8: nome, e-mail, senha, confirmação e aceite de termos.
 * A conta Riot NÃO é coletada aqui: o vínculo só nasce do RSO, depois, em
 * Configurações.
 *
 * `signUp.email` é chamado SEM `callbackURL`: o cliente do Better Auth traz
 * um `redirectPlugin` LIGADO por padrão — com `callbackURL` ele navega o
 * navegador assim que a resposta chega. A navegação é nossa, no fim de
 * `submit()`.
 */

export interface SignupFormProps {
  readonly callbackPath: string;
  readonly className?: string;
}

const EMAIL_IN_USE = 'Este e-mail já está cadastrado. Tente entrar.';
const GENERIC_SIGNUP_ERROR = 'Não foi possível criar a conta. Tente novamente.';
const TERMS_REQUIRED = 'Aceite os termos para continuar.';

export function SignupForm({ callbackPath, className }: SignupFormProps) {
  const router = useRouter();

  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const confirmationId = useId();
  const termsId = useId();
  const errorId = useId();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /** Validações em ordem; devolve a senha quando tudo passa. */
  function validate(): { ok: true; password: string } | { ok: false } {
    const checks = [
      parseName(name),
      parseEmail(email),
      parsePassword(password),
      parsePasswordConfirmation(password, confirmation),
    ];
    for (const check of checks) {
      if (!check.ok) {
        setError(check.message);
        return { ok: false };
      }
    }
    if (!acceptedTerms) {
      setError(TERMS_REQUIRED);
      return { ok: false };
    }
    return { ok: true, password: password };
  }

  async function submit(): Promise<void> {
    const base = validate();
    if (!base.ok) {
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const parsedName = parseName(name);
      const parsedEmail = parseEmail(email);
      if (!parsedName.ok || !parsedEmail.ok) {
        return;
      }

      const { authClient } = await import('@/lib/auth-client');
      // Sem `callbackURL` — ver o docblock do módulo.
      const { error: signUpError } = await authClient.signUp.email({
        name: parsedName.value,
        email: parsedEmail.value,
        password: base.password,
      });

      if (signUpError !== null && signUpError !== undefined) {
        setError(
          signUpError.code === 'USER_ALREADY_EXISTS' ? EMAIL_IN_USE : GENERIC_SIGNUP_ERROR,
        );
        return;
      }

      router.push(callbackPath);
    } catch {
      setError('Falha de rede ao contatar o servidor de autenticação.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      data-signup-form
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void submit();
      }}
      noValidate
      className={className}
    >
      <div className="flex flex-col gap-2.5">
        <Field
          id={nameId}
          name="name"
          label="01 // NOME DE OPERADOR / USUÁRIO"
          badge="OBRIGATÓRIO"
          autoComplete="name"
          placeholder="ex: NexusOperator"
          value={name}
          disabled={loading}
          onChange={(event) => setName(event.target.value)}
        />

        <Field
          id={emailId}
          name="email"
          label="02 // E-MAIL DE TRABALHO OU PESSOAL"
          badge="VERIFICÁVEL"
          type="email"
          autoComplete="email"
          placeholder="ex: player@exemplo.com"
          value={email}
          disabled={loading}
          onChange={(event) => setEmail(event.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <PasswordField
            id={passwordId}
            name="password"
            label="03 // SENHA DE ACESSO"
            badge="COMPLEXIDADE: FORTE"
            autoComplete="new-password"
            showStrength
            value={password}
            disabled={loading}
            onChange={(event) => setPassword(event.target.value)}
          />
          <PasswordField
            id={confirmationId}
            name="passwordConfirmation"
            label="04 // CONFIRMAR SENHA"
            badge="VALIDADO"
            autoComplete="new-password"
            value={confirmation}
            disabled={loading}
            onChange={(event) => setConfirmation(event.target.value)}
          />
          <p className="text-body-sm text-text-secondary">
            Confirmação de chave criptográfica para descriptografia local de VODs.
          </p>
        </div>

        <CheckboxRow
          id={termsId}
          name="terms"
          checked={acceptedTerms}
          disabled={loading}
          onChange={(event) => setAcceptedTerms(event.target.checked)}
          label={
            <>
              Concordo com os{' '}
              {/* TODO(rotas-publicas): páginas inexistentes (spec §10). */}
              <a href="#" className="underline underline-offset-2">
                Termos de Serviço
              </a>{' '}
              e a{' '}
              <a href="#" className="underline underline-offset-2">
                Política de Telemetria de Dados
              </a>{' '}
              (Compromisso irrestrito de zero vazamento de dados de scrims, composições secretas e
              callouts táticos).
            </>
          }
        />

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <SubmitButton loading={loading} className="sm:flex-1">
            CRIAR CONTA E INICIAR TELEMETRIA
          </SubmitButton>
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-md border border-line bg-surface-pressed px-3 py-2 font-hud text-label uppercase text-text-primary transition-colors duration-[var(--duration-fast)] hover:bg-surface-hover"
          >
            CANCELAR
          </a>
        </div>

        {error !== null ? (
          <p id={errorId} role="alert" className="text-body-sm text-loss">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
