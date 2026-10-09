'use client';

import { createAuthClient } from 'better-auth/react';

/**
 * Cliente Better Auth (React/nanostores). Mesma origem do servidor —
 * baseURL é opcional; os hooks reativos (useSession) e as mutations
 * (signIn.social, signOut) falam com /api/auth/*.
 */

export const authClient = createAuthClient();
