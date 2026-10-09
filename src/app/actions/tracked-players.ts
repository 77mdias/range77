'use server';

import {
  followPlayer as followPlayerCore,
  unfollowPlayer as unfollowPlayerCore,
  type ActionResult,
  type FollowPlayerInput,
} from '@/services/tracker/tracked-players-service';
import { getSession } from '@/lib/session';

/**
 * SERVER ACTIONS de jogadores seguidos.
 *
 * Delegam para o serviço injetável com as dependências de produção
 * (getSession real). O import é barato: o store nasce lazy no primeiro uso.
 */

export async function followPlayer(input: FollowPlayerInput): Promise<ActionResult> {
  return followPlayerCore({ getSession }, input);
}

export async function unfollowPlayer(input: FollowPlayerInput): Promise<ActionResult> {
  return unfollowPlayerCore({ getSession }, input);
}
