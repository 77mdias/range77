import { PRIVATE_PROFILE_MESSAGE } from '@/contracts/access';
import { EmptyState } from './empty-state';

/** Estado neutro de perfil sem consentimento (mesmo visual do EmptyState). */
export function PrivateProfileState() {
  return (
    <div data-state="private-profile">
      <EmptyState title={PRIVATE_PROFILE_MESSAGE} />
    </div>
  );
}
