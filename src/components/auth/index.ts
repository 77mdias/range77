/**
 * Barrel dos componentes das telas de autenticação.
 * `ui/` = design system genérico; `auth/` = só o chrome e os blocos de auth.
 */
export { AuthDivider, type AuthDividerProps } from './auth-divider';
export { AuthFooter, type AuthFooterProps } from './auth-footer';
export { AuthHeader } from './auth-header';
export { AuthTabs } from './auth-tabs';
export { AuthTerminal, type AuthTerminalProps } from './auth-terminal';
export { CheckboxRow, type CheckboxRowProps } from './checkbox-row';
export { Field, FIELD_CONTROL_CLASS, type FieldProps } from './field';
export { InfoRow, type InfoRowProps } from './info-row';
export { PasswordField, type PasswordFieldProps } from './password-field';
export { resolveCallbackPath } from './resolve-callback-path';
export { RiotCallout, type RiotCalloutProps, type RiotCalloutVariant } from './riot-callout';
export { SsoButtons, type SsoButtonsProps } from './sso-buttons';
export { StatStrip, type StatStripItem, type StatStripProps } from './stat-strip';
export { SubmitButton, type SubmitButtonProps } from './submit-button';
export { TelemetryPanel, type TelemetryPanelProps } from './telemetry-panel';
export { TelemetryStrip, type TelemetryStripProps } from './telemetry-strip';
