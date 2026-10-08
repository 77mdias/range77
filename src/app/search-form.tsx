'use client';

import { useRouter } from 'next/navigation';
import { SearchBar } from '@/components/ui/search-bar';
import type { SearchQuery } from '@/components/ui/search-bar';

/**
 * SearchForm — wiring client-side da busca: valida o Riot ID no SearchBar e
 * navega para o perfil (`/players/[region]/[name]/[tag]`). A home permanece
 * um Server Component; só este ilha é interativa.
 */

export function SearchForm() {
  const router = useRouter();

  function handleSubmit(query: SearchQuery): void {
    router.push(
      `/players/${query.region}/${encodeURIComponent(query.name)}/${encodeURIComponent(query.tag)}`,
    );
  }

  return <SearchBar onSubmit={handleSubmit} />;
}
