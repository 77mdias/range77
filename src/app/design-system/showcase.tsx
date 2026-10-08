'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChamferBox } from '@/components/ui/chamfer-box';
import { MatchRow } from '@/components/ui/match-row';
import { SearchBar, type SearchQuery } from '@/components/ui/search-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkline } from '@/components/ui/sparkline';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState, ErrorState } from '@/components/ui/states';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table';
import { Tabs } from '@/components/ui/tabs';

/**
 * Styleguide viva (fase 1b): renderiza tokens, tipografia, chamfers e
 * TODOS os componentes em seus estados. Client Component porque inclui
 * exemplos interativos (handlers/estado).
 */

const PRIMITIVE_SWATCHES: readonly { readonly name: string; readonly varName: string }[] = [
  { name: 'void', varName: '--color-void' },
  { name: 'void-raised', varName: '--color-void-raised' },
  { name: 'void-hover', varName: '--color-void-hover' },
  { name: 'steel-line', varName: '--color-steel-line' },
  { name: 'steel-dim', varName: '--color-steel-dim' },
  { name: 'bone', varName: '--color-bone' },
  { name: 'bone-dim', varName: '--color-bone-dim' },
  { name: 'blood', varName: '--color-blood' },
  { name: 'blood-hover', varName: '--color-blood-hover' },
  { name: 'blood-dark', varName: '--color-blood-dark' },
  { name: 'win', varName: '--color-win' },
  { name: 'loss', varName: '--color-loss' },
];

const SEMANTIC_SWATCHES: readonly { readonly name: string; readonly className: string }[] = [
  { name: 'surface', className: 'bg-surface' },
  { name: 'surface-raised', className: 'bg-surface-raised' },
  { name: 'surface-hover', className: 'bg-surface-hover' },
  { name: 'line', className: 'bg-line' },
  { name: 'text-primary', className: 'bg-text-primary' },
  { name: 'text-secondary', className: 'bg-text-secondary' },
  { name: 'accent', className: 'bg-accent' },
  { name: 'accent-hover', className: 'bg-accent-hover' },
  { name: 'win', className: 'bg-win' },
  { name: 'loss', className: 'bg-loss' },
];

const TYPE_SCALE: readonly { readonly label: string; readonly className: string; readonly font: string }[] =
  [
    { label: 'display-xl', className: 'text-display-xl', font: 'font-display' },
    { label: 'display-lg', className: 'text-display-lg', font: 'font-display' },
    { label: 'display-md', className: 'text-display-md', font: 'font-display' },
    { label: 'heading-lg', className: 'text-heading-lg', font: 'font-display' },
    { label: 'heading-sm', className: 'text-heading-sm', font: 'font-display' },
    { label: 'body-lg', className: 'text-body-lg', font: 'font-body' },
    { label: 'body', className: 'text-body', font: 'font-body' },
    { label: 'label', className: 'text-label uppercase tracking-wide', font: 'font-hud' },
  ];

const SCOREBOARD: readonly {
  readonly player: string;
  readonly k: number;
  readonly d: number;
  readonly a: number;
  readonly acs: number;
}[] = [
  { player: 'TenZ', k: 24, d: 14, a: 6, acs: 287 },
  { player: 'Derke', k: 19, d: 17, a: 4, acs: 232 },
  { player: 'Boaster', k: 12, d: 18, a: 11, acs: 178 },
];

function Section({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="border-t border-line py-10 first:border-t-0">
      <h2 className="font-display text-heading-lg uppercase text-text-primary">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function DesignSystemShowcase() {
  const [searchQuery, setSearchQuery] = useState<SearchQuery | null>(null);

  return (
    <div data-design-system className="mx-auto w-full max-w-6xl px-4 py-10">
      <header className="pb-8">
        <p className="text-label uppercase text-accent">Design System · fase 1b</p>
        <h1 className="font-display text-display-lg text-text-primary">STYLEGUIDE VIVA</h1>
        <p className="mt-2 max-w-2xl text-body-lg text-text-secondary">
          Tokens, tipografia, chamfers e todos os componentes em seus estados. Rota disponível
          apenas fora de produção.
        </p>
      </header>

      <Section title="Paleta · primitivos">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {PRIMITIVE_SWATCHES.map((swatch) => (
            <div key={swatch.name} className="border border-line">
              <div className="h-16" style={{ background: `var(${swatch.varName})` }} />
              <div className="bg-surface-raised px-3 py-2">
                <p className="font-hud text-body text-text-primary">{swatch.name}</p>
                <p className="font-hud text-label text-text-secondary">{swatch.varName}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Paleta · semânticos">
        <div className="flex flex-wrap gap-3">
          {SEMANTIC_SWATCHES.map((swatch) => (
            <div key={swatch.name} className="w-32">
              <div className={`h-12 border border-line ${swatch.className}`} />
              <p className="mt-1 font-hud text-label text-text-secondary">{swatch.name}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tipografia">
        <div className="space-y-4">
          {TYPE_SCALE.map((type) => (
            <div key={type.label} className="flex items-baseline gap-4 border-b border-line pb-2">
              <span className="w-28 shrink-0 font-hud text-label uppercase text-text-secondary">
                {type.label}
              </span>
              <span className={`${type.font} ${type.className} text-text-primary`}>
                Valorant · 1234
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Chamfer">
        <div className="flex flex-wrap items-end gap-6">
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <div key={size} className="space-y-2">
              <p className="font-hud text-label uppercase text-text-secondary">chamfer-{size}</p>
              <ChamferBox size={size} bordered className="shadow-hard">
                <div className="bg-surface-raised px-6 py-4 font-hud text-body text-text-primary">
                  {size}
                </div>
              </ChamferBox>
            </div>
          ))}
          <div className="space-y-2">
            <p className="font-hud text-label uppercase text-text-secondary">sem borda</p>
            <ChamferBox size="md">
              <div className="bg-surface-raised px-6 py-4 font-hud text-body text-text-primary">
                clip-path
              </div>
            </ChamferBox>
          </div>
        </div>
      </Section>

      <Section title="Button">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
          </div>
        </div>
      </Section>

      <Section title="Badge">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="win">Win</Badge>
          <Badge variant="loss">Loss</Badge>
          <Badge variant="accent">Accent</Badge>
          <Badge variant="neutral">Immortal 2</Badge>
        </div>
      </Section>

      <Section title="Card & StatCard">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="K/D" value="1.34" delta={0.12} />
          <StatCard label="ACS" value="248" delta={-15} deltaSuffix="pp" />
          <StatCard
            label="HS%"
            value="27.4"
            delta={3.1}
            deltaSuffix="%"
            sparkline={<Sparkline points={[18, 22, 20, 25, 24, 28]} />}
          />
          <StatCard
            label="Tendência"
            value="—"
            sparkline={<Sparkline points={[30, 28, 29, 24, 22, 18]} />}
          />
        </div>

        <div className="mt-4">
          <Card label="Composição" action={<Button variant="ghost" size="sm">Ver tudo</Button>}>
            <p className="text-body text-text-secondary">
              Card com header (label uppercase + slot de ação) e corpo.
            </p>
          </Card>
        </div>
      </Section>

      <Section title="Table">
        <Card label="Scoreboard">
          <Table aria-label="Exemplo de scoreboard">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Jogador</TableHeaderCell>
                <TableHeaderCell numeric>K</TableHeaderCell>
                <TableHeaderCell numeric>D</TableHeaderCell>
                <TableHeaderCell numeric>A</TableHeaderCell>
                <TableHeaderCell numeric>ACS</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {SCOREBOARD.map((row) => (
                <TableRow key={row.player}>
                  <TableCell>{row.player}</TableCell>
                  <TableCell numeric>{row.k}</TableCell>
                  <TableCell numeric>{row.d}</TableCell>
                  <TableCell numeric>{row.a}</TableCell>
                  <TableCell numeric>{row.acs}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </Section>

      <Section title="Tabs">
        <Tabs
          ariaLabel="Exemplo de abas"
          items={[
            {
              id: 'overview',
              label: 'Visão geral',
              content: <p className="py-4 text-body text-text-secondary">Painel de visão geral.</p>,
            },
            {
              id: 'matches',
              label: 'Partidas',
              content: <p className="py-4 text-body text-text-secondary">Painel de partidas.</p>,
            },
            {
              id: 'agents',
              label: 'Agentes',
              content: <p className="py-4 text-body text-text-secondary">Painel de agentes.</p>,
            },
          ]}
        />
      </Section>

      <Section title="SearchBar">
        <div className="max-w-2xl">
          <SearchBar onSubmit={setSearchQuery} />
          {searchQuery !== null ? (
            <p className="mt-3 font-hud text-body text-text-secondary">
              Última busca: {searchQuery.region} · {searchQuery.name}#{searchQuery.tag}
            </p>
          ) : null}
        </div>
      </Section>

      <Section title="MatchRow">
        <div className="border border-line">
          <MatchRow
            map="Ascent"
            result="win"
            kills={24}
            deaths={14}
            assists={6}
            acs={287}
            hsPercentage={31}
            playedAt="2026-10-06T18:00:00.000Z"
            now={new Date('2026-10-08T18:00:00.000Z')}
            href="/matches/example-1"
          />
          <MatchRow
            map="Haven"
            result="loss"
            kills={11}
            deaths={19}
            assists={3}
            acs={164}
            playedAt="2026-10-07T12:00:00.000Z"
            now={new Date('2026-10-08T18:00:00.000Z')}
            className="border-t border-line"
          />
        </div>
      </Section>

      <Section title="Skeleton">
        <div className="max-w-md space-y-3">
          <Skeleton height={16} width="60%" />
          <Skeleton height={40} />
          <Skeleton height={40} width="80%" />
        </div>
      </Section>

      <Section title="Estados">
        <div className="grid gap-4 md:grid-cols-2">
          <EmptyState
            title="Sem partidas"
            description="Nenhuma partida ranqueada encontrada para este jogador."
            action={<Button variant="secondary" size="sm">Atualizar</Button>}
          />
          <ErrorState
            error={{
              error: {
                code: 'MATCH_NOT_FOUND',
                message: 'Partida não encontrada.',
                hint: 'Confira o match ID e a região e tente novamente.',
              },
            }}
          />
        </div>
      </Section>
    </div>
  );
}
