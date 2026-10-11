'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { AgentCard, BenchmarkBar, MapCard } from '@/components/agents';
import {
  AiCallout,
  AiCoachTerminal,
  AiQueryForm,
  ChatInputBar,
  ChatMessage,
  CodeViewer,
  LayerTabs,
  PipelineFlow,
  PipelineStepCard,
} from '@/components/ai';
import {
  DemoProfileGrid,
  FeatureModuleCard,
  LiveStatusStrip,
  SearchConsole,
  SearchIngestionModal,
  type DemoProfile,
} from '@/components/home';
import { SystemStatusBar } from '@/components/layout/system-status-bar';
import { RrTrendChart } from '@/components/charts';
import {
  MatchMetaBar,
  MvpCallout,
  RoundDiagnosis,
  RoundSelector,
  RoundTimeline,
  ScoreBanner,
  ScoreboardTable,
  TacticalMap,
  WeaponCard,
  type RoundCellData,
} from '@/components/match';
import { MatchHistoryTable, PlayerHeader } from '@/components/player';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  CoachingTip,
  FilterBar,
  FilterCheckbox,
  FilterLabel,
  FilterSelect,
  Icon,
  InfoCallout,
  InsightList,
  KpiMetric,
  KpiTile,
  ProgressBar,
  SectionHeader,
  StatusDot,
  TagLabel,
  WinProbabilityBar,
} from '@/components/ui';
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
 * Styleguide viva: renderiza tokens, tipografia, formas e TODOS os
 * componentes em seus estados. Client Component porque inclui exemplos
 * interativos (handlers/estado).
 */

const PRIMITIVE_SWATCHES: readonly { readonly name: string; readonly varName: string }[] = [
  { name: 'canvas', varName: '--color-canvas' },
  { name: 'canvas-soft', varName: '--color-canvas-soft' },
  { name: 'surface-lowest', varName: '--color-surface-lowest' },
  { name: 'surface-low', varName: '--color-surface-low' },
  { name: 'surface-high', varName: '--color-surface-high' },
  { name: 'hairline', varName: '--color-hairline' },
  { name: 'line-soft', varName: '--color-line-soft' },
  { name: 'ink', varName: '--color-ink' },
  { name: 'ink-soft', varName: '--color-ink-soft' },
  { name: 'ink-mute', varName: '--color-ink-mute' },
  { name: 'primary', varName: '--color-primary' },
  { name: 'primary-ink', varName: '--color-primary-ink' },
  { name: 'win', varName: '--color-win' },
  { name: 'loss', varName: '--color-loss' },
];

const SEMANTIC_SWATCHES: readonly { readonly name: string; readonly className: string }[] = [
  { name: 'surface', className: 'bg-surface' },
  { name: 'surface-raised', className: 'bg-surface-raised' },
  { name: 'surface-recessed', className: 'bg-surface-recessed' },
  { name: 'surface-hover', className: 'bg-surface-hover' },
  { name: 'line', className: 'bg-line' },
  { name: 'text-primary', className: 'bg-text-primary' },
  { name: 'text-secondary', className: 'bg-text-secondary' },
  { name: 'accent', className: 'bg-accent' },
  { name: 'accent-ink', className: 'bg-accent-ink' },
  { name: 'accent-hover', className: 'bg-accent-hover' },
  { name: 'win', className: 'bg-win' },
  { name: 'loss', className: 'bg-loss' },
];

const TYPE_SCALE: readonly { readonly label: string; readonly className: string; readonly font: string }[] =
  [
    { label: 'display-xl', className: 'text-display-xl', font: 'font-display' },
    { label: 'display-xl-mobile', className: 'text-display-xl-mobile', font: 'font-display' },
    { label: 'display-lg', className: 'text-display-lg', font: 'font-display' },
    { label: 'headline-lg', className: 'text-headline-lg', font: 'font-display' },
    { label: 'headline-md', className: 'text-headline-md', font: 'font-display' },
    { label: 'heading-sm', className: 'text-heading-sm', font: 'font-display' },
    { label: 'body-lg', className: 'text-body-lg', font: 'font-body' },
    { label: 'body-md', className: 'text-body-md', font: 'font-body' },
    { label: 'body-sm', className: 'text-body-sm', font: 'font-body' },
    { label: 'label-md', className: 'text-label-md uppercase', font: 'font-hud' },
    { label: 'label-sm', className: 'text-label-sm uppercase', font: 'font-hud' },
    { label: 'label-xs', className: 'text-label-xs uppercase', font: 'font-hud' },
  ];

const RADIUS_SCALE: readonly { readonly token: string; readonly className: string }[] = [
  { token: 'rounded-xs', className: 'rounded-xs' },
  { token: 'rounded-sm', className: 'rounded-sm' },
  { token: 'rounded-md', className: 'rounded-md' },
  { token: 'rounded-lg', className: 'rounded-lg' },
  { token: 'rounded-xl', className: 'rounded-xl' },
  { token: 'rounded-2xl', className: 'rounded-2xl' },
  { token: 'rounded-full', className: 'rounded-full' },
];

const SHADOW_SCALE: readonly { readonly token: string; readonly className: string }[] = [
  { token: 'shadow-hard-1', className: 'shadow-hard-1' },
  { token: 'shadow-hard-2', className: 'shadow-hard-2' },
  { token: 'shadow-hard-3', className: 'shadow-hard-3' },
  { token: 'shadow-hard-4', className: 'shadow-hard-4' },
  { token: 'shadow-hard-6', className: 'shadow-hard-6' },
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

const SHOWCASE_HISTORY: readonly {
  readonly id: string;
  readonly agent: string;
  readonly map: string;
  readonly result: 'win' | 'loss';
  readonly scoreTeam: number;
  readonly scoreEnemy: number;
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
  readonly kd: number;
  readonly acs: number;
  readonly hsPercentage: number;
  readonly rrDelta: number;
}[] = [
  {
    id: 'demo-1',
    agent: 'Jett',
    map: 'Ascent',
    result: 'win',
    scoreTeam: 13,
    scoreEnemy: 9,
    kills: 24,
    deaths: 14,
    assists: 6,
    kd: 1.71,
    acs: 287,
    hsPercentage: 31,
    rrDelta: 22,
  },
  {
    id: 'demo-2',
    agent: 'Omen',
    map: 'Haven',
    result: 'loss',
    scoreTeam: 9,
    scoreEnemy: 13,
    kills: 11,
    deaths: 19,
    assists: 3,
    kd: 0.58,
    acs: 164,
    hsPercentage: 18,
    rrDelta: -18,
  },
];

const SHOWCASE_TEAMS = [
  {
    name: 'Time aliado',
    label: 'Time aliado',
    won: true,
    isViewerTeam: true,
    roundsWon: 13,
    avgRating: 1.18,
    econRating: 74.2,
    totalDamage: 15820,
    players: [
      {
        name: 'TenZ',
        tag: 'BR1',
        rank: 'Ascendant 3',
        agent: 'Jett',
        acs: 287,
        kills: 24,
        deaths: 14,
        assists: 6,
        kdDiff: 10,
        adr: 184.2,
        hsPercentage: 31,
        kastPercentage: 82,
        firstBloods: 4,
        firstDeaths: 1,
        isViewer: true,
      },
      {
        name: 'Derke',
        rank: 'Ascendant 2',
        agent: 'Raze',
        acs: 232,
        kills: 19,
        deaths: 17,
        assists: 4,
        kdDiff: 2,
        adr: 142,
        hsPercentage: 28,
        kastPercentage: 77,
        firstBloods: 2,
        firstDeaths: 2,
      },
    ],
  },
  {
    name: 'Time adversário',
    label: 'Time adversário',
    won: false,
    roundsWon: 9,
    avgRating: 0.96,
    econRating: 61.5,
    totalDamage: 12844,
    players: [
      {
        name: 'Boaster',
        rank: 'Ascendant 1',
        agent: 'Astra',
        acs: 178,
        kills: 12,
        deaths: 18,
        assists: 11,
        kdDiff: -6,
        adr: 128.5,
        hsPercentage: 14,
        kastPercentage: 73,
        firstBloods: 1,
        firstDeaths: 3,
      },
    ],
  },
] as const;

const SHOWCASE_ROUNDS: readonly RoundCellData[] = [
  { number: 1, outcome: 'win-defense', economy: 'pistol' },
  { number: 2, outcome: 'win-defense', economy: 'eco' },
  { number: 3, outcome: 'loss', economy: 'buy', flagged: true },
  { number: 4, outcome: 'win-attack', economy: 'full' },
  { number: 5, outcome: 'loss', economy: 'buy' },
  { number: 6, outcome: 'win-attack', economy: 'full', flagged: true },
  { number: 7, outcome: 'loss', economy: 'eco' },
  { number: 8, outcome: 'win-attack', economy: 'buy' },
];

function Section({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="border-t border-line py-10 first:border-t-0">
      <h2 className="font-display text-heading-lg text-text-primary">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function DesignSystemShowcase() {
  const [searchQuery, setSearchQuery] = useState<SearchQuery | null>(null);
  const [roundId, setRoundId] = useState('round-4');
  const [layerId, setLayerId] = useState('l3');
  const [season, setSeason] = useState('e26');
  const [minGames, setMinGames] = useState(true);
  const [chatLog, setChatLog] = useState<readonly string[]>([]);
  const [ingestionOpen, setIngestionOpen] = useState(false);
  const [ingestionTarget, setIngestionTarget] = useState('twmz#tower');

  const DEMO_PROFILES: readonly DemoProfile[] = [
    { riotId: 'twmz#tower', regionChip: 'BR', rank: 'Diamond 2', rr: '10 RR', highlighted: true },
  ];

  return (
    <div data-design-system className="w-full px-4 py-10 md:px-6 xl:px-8">
      <header className="pb-8">
        <p className="text-label uppercase text-text-secondary">Design System</p>
        <h1 className="font-display text-display-lg text-text-primary">STYLEGUIDE VIVA</h1>
        <p className="mt-2 max-w-2xl text-body-lg text-text-secondary">
          Tokens, tipografia, formas e todos os componentes em seus estados. Rota disponível
          apenas fora de produção.
        </p>
      </header>

      <Section title="Paleta · primitivos">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {PRIMITIVE_SWATCHES.map((swatch) => (
            <div key={swatch.name} className="overflow-hidden rounded-md border border-line">
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
              <div className={`h-12 rounded-md border border-line ${swatch.className}`} />
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

      <Section title="Formas">
        <div className="flex flex-wrap items-end gap-4">
          {RADIUS_SCALE.map((radius) => (
            <div key={radius.token} className="space-y-2">
              <div className={`h-20 w-28 border border-line bg-surface-raised ${radius.className}`} />
              <p className="font-hud text-label uppercase text-text-secondary">{radius.token}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Elevação · sombra dura">
        <div className="flex flex-wrap items-end gap-5">
          {SHADOW_SCALE.map((shadow) => (
            <div key={shadow.token} className="space-y-2">
              <div
                className={`h-16 w-24 border border-line bg-surface ${shadow.className}`}
              />
              <p className="font-hud text-label uppercase text-text-secondary">{shadow.token}</p>
            </div>
          ))}
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
        <div className="overflow-hidden rounded-md border border-line">
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

      {/* ── Componentes das telas Stitch ─────────────────────────────── */}

      <Section title="Primitivos de telemetria">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-2 font-hud text-label uppercase text-text-secondary">
            <StatusDot variant="live" /> live
          </span>
          <span className="flex items-center gap-2 font-hud text-label uppercase text-text-secondary">
            <StatusDot variant="idle" /> idle
          </span>
          <span className="flex items-center gap-2 font-hud text-label uppercase text-text-secondary">
            <StatusDot variant="square" /> marker
          </span>
          <span className="flex items-center gap-2 font-hud text-label uppercase text-text-secondary">
            <StatusDot variant="square-accent" /> marker accent
          </span>
          <TagLabel>AGENT_TELEMETRY_PIPELINE</TagLabel>
          <TagLabel tone="critical">GARGALO CRÍTICO</TagLabel>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <ProgressBar value={78.4} ariaLabel="Entry success" />
            <ProgressBar value={42} tone="ink" markerPercent={52.5} ariaLabel="K/D com benchmark" />
            <ProgressBar value={21} tone="loss" ariaLabel="HS abaixo do elo" />
          </div>
          <WinProbabilityBar beforePercent={64} afterPercent={18} />
        </div>

        <div className="mt-6">
          <SectionHeader
            title="Histórico & breakdown"
            annotation="MATCH_PIPELINE"
            marker="accent"
            meta={<span>Camada 2 · 210 gms</span>}
          />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <KpiTile label="K/D" value="1.34" accent="+0.14" trailing="122W 88L" />
          <KpiTile label="WR" value="58%" accent="+4pp" />
          <KpiTile label="HS%" value="21%" trailing={<Badge variant="neutral">BR avg 26%</Badge>} />
          <KpiTile label="ACS" value="248" accent="Vandal fav" />
          <KpiTile label="KAST" value="74%" />
          <KpiTile label="FB rate" value="0.84" accent="Impact" />
        </div>

        <div className="mt-6 max-w-md">
          <KpiMetric
            label="Payload economizado"
            value="91"
            suffix="%"
            aside={<span>420 KB → 1.8 KB</span>}
          />
        </div>
      </Section>

      <Section title="Ícones">
        <div className="flex flex-wrap gap-4">
          {(
            [
              'search',
              'bell',
              'terminal',
              'send',
              'check',
              'warning',
              'info',
              'copy',
              'refresh',
              'download',
              'shield',
              'bot',
              'arrow-right',
              'filter',
              'chevron-down',
              'target',
            ] as const
          ).map((name) => (
            <span
              key={name}
              className="flex size-10 items-center justify-center rounded-md border border-line bg-surface-raised text-text-secondary"
              title={name}
            >
              <Icon name={name} size="md" />
            </span>
          ))}
        </div>
      </Section>

      <Section title="Coaching, callouts & insights">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <CoachingTip
              title="Protocol advice: economia de round"
              priority="alta"
              impact="Impacto estimado: +12% WR em eco rounds"
            >
              Seu force-buy converte apenas <strong>31%</strong> dos rounds. Comprar shield pesado
              no eco eleva a conversão esperada para 44%.
            </CoachingTip>
            <InfoCallout label="PROPRIEDADE ARQUITETURAL">
              A camada 3 sintetiza o contexto antes do motor de IA —{' '}
              <strong>420 KB → 1.8 KB</strong> por consulta.
            </InfoCallout>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <InsightList
              tone="strength"
              label="Pontos fortes computados"
              items={[
                {
                  title: 'Entry agressivo',
                  description: 'Primeiro sangue 12% acima da média do elo.',
                },
                {
                  title: 'Trade friendly',
                  description: '78% dos abates viram trades da dupla.',
                },
              ]}
            />
            <InsightList
              tone="weakness"
              label="Pontos críticos identificados"
              items={[
                {
                  title: 'Clutch 1v2',
                  description: 'Conversão de 18% — treine retakes com util.',
                },
              ]}
            />
          </div>
        </div>
      </Section>

      <Section title="FilterBar">
        <FilterBar>
          <FilterLabel>Filtros ativos:</FilterLabel>
          <FilterSelect
            label="Temporada"
            value={season}
            onChange={setSeason}
            options={[
              { value: 'e26', label: 'Episódio 26' },
              { value: 'e25', label: 'Episódio 25' },
            ]}
          />
          <FilterSelect
            label="Fila"
            value="competitive"
            onChange={() => {}}
            options={[{ value: 'competitive', label: 'Competitivo' }]}
          />
          <FilterCheckbox label="Mínimo de 3 jogos" checked={minGames} onChange={setMinGames} />
          <span className="ml-auto flex items-center gap-2 font-hud text-label uppercase text-text-secondary">
            <Badge variant="neutral">69 partidas</Badge>
            <Badge variant="accent">Ascendant 3</Badge>
          </span>
        </FilterBar>
      </Section>

      <Section title="PlayerHeader & MatchHistoryTable">
        <div className="overflow-hidden rounded-md border border-line">
          <PlayerHeader
            name="Nexus"
            tag="BR1"
            level={242}
            rank="Ascendant 3"
            verified
            meta={[
              { label: 'Região', value: 'BR / São Paulo 1' },
              { label: 'RR Pool', value: '144 RR' },
              { label: 'Tracker', value: '210 gms' },
            ]}
            actions={
              <Button size="sm" variant="primary">
                Sincronizar
              </Button>
            }
          />
          <MatchHistoryTable
            matches={SHOWCASE_HISTORY.map((match) => ({
              ...match,
              href: `/matches/${match.id}`,
            }))}
          />
        </div>
      </Section>

      <Section title="Match: meta bar, banner & MVP">
        <div className="space-y-3">
          <MatchMetaBar
            queue="Competitivo // Ranked BR1"
            map="Ascent"
            details={['35:12', 'São Paulo 1', 'ID 8842']}
            rrDelta={22}
            rrLabel="ASC 3 • 84/100"
          />
          <div className="grid gap-3 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <ScoreBanner
                result="win"
                scoreTeam={13}
                scoreEnemy={9}
                map="Ascent"
                halves="DEF: 7-5 • ATK: 6-4"
              />
            </div>
            <div className="lg:col-span-8">
              <MvpCallout
                playerName="TenZ"
                agent="Jett"
                rank="Ascendant 3"
                rating={1.48}
                kills={26}
                deaths={13}
                assists={4}
                firstKills={4}
                metrics={[
                  { label: 'ACS', value: '312' },
                  { label: 'HS Rate', value: '34.8%' },
                  { label: 'KAST', value: '81.8%' },
                ]}
              />
            </div>
          </div>
        </div>
      </Section>

      <Section title="ScoreboardTable">
        <ScoreboardTable teams={SHOWCASE_TEAMS} />
      </Section>

      <Section title="Rounds: timeline, seletor & diagnóstico">
        <div className="space-y-3">
          <RoundTimeline rounds={SHOWCASE_ROUNDS} />
          <RoundSelector
            ariaLabel="Round para diagnóstico"
            rounds={[
              { id: 'round-3', label: 'Round 3 • Eco perdido' },
              { id: 'round-4', label: 'Round 4 • Clutch 1v2' },
              { id: 'round-6', label: 'Round 6 • Retake B' },
            ]}
            activeId={roundId}
            onSelect={setRoundId}
          />
          <RoundDiagnosis
            meta={`TELEMETRIA DO LANCE (${roundId.toUpperCase()}) • 00:18 RESTANTES • CATWALK → A-SITE`}
            verdict="suboptimal"
            verdictLabel="Decisão sub-ótima"
            beforePercent={64}
            afterPercent={18}
            analysis={
              <>
                Push <strong>solo</strong> pelo catwalk sem util e sem informação de timing. A
                dupla inimiga trava o ângulo e a probabilidade despenca de 64% → 18%.
              </>
            }
          >
            <CoachingTip
              title="Correção sugerida"
              priority="critica"
              impact="Impacto estimado: +9% WR no round"
            >
              Espere o <strong>flash da dupla</strong> ou jogue o timing com o initiator — nunca
              abre o ângulo primeiro sem trade.
            </CoachingTip>
          </RoundDiagnosis>
        </div>
      </Section>

      <Section title="Arsenal & mapa tático">
        <div className="grid gap-3 lg:grid-cols-12">
          <div className="grid gap-3 sm:grid-cols-2 lg:col-span-7">
            <WeaponCard
              name="Vandal"
              kills={18}
              hsPercentage={39.2}
              stats={[
                { label: 'Dano/round', value: '142' },
                { label: 'Precisão', value: '31%' },
                { label: 'First bloods', value: '3' },
              ]}
            />
            <WeaponCard
              name="Operator"
              kills={4}
              hsPercentage={62}
              stats={[
                { label: 'Dano/round', value: '188' },
                { label: 'Precisão', value: '44%' },
              ]}
            />
            <WeaponCard
              name="Ghost"
              kills={3}
              primary={false}
              hsPercentage={12}
              stats={[{ label: 'Dano/round', value: '61' }]}
            />
            <WeaponCard
              name="Blade Storm"
              kills={2}
              primary={false}
              hsPercentage={50}
              stats={[{ label: 'Rounds', value: '2' }]}
            />
          </div>
          <div className="lg:col-span-5">
            <TacticalMap
              title="Posicionamento & kills (Ascent)"
              meta="Camada: Round 4"
              zones={[
                { x: 16, y: 24, width: 110, height: 90, label: 'A-Site' },
                { x: 180, y: 180, width: 100, height: 90, label: 'Mid' },
              ]}
              path={[
                { x: 40, y: 240 },
                { x: 90, y: 180 },
                { x: 120, y: 120 },
              ]}
              kills={[{ x: 120, y: 120, label: 'You' }, { x: 96, y: 132 }]}
              deaths={[{ x: 190, y: 90 }]}
              enemies={[{ x: 210, y: 70 }]}
            />
          </div>
        </div>
      </Section>

      <Section title="AgentCard / MapCard / BenchmarkBar">
        <div className="grid gap-3 lg:grid-cols-3">
          <AgentCard
            name="Jett"
            role="Duelista"
            matches={34}
            winRate="61.8%"
            tier="main"
            tierLabel="Tier S main"
            stats={[
              { label: 'ACS', value: '265', delta: 12 },
              { label: 'K/D', value: '1.28', delta: 0.1 },
              { label: 'FB', value: '0.92', delta: 0.08 },
            ]}
            progresses={[
              { label: 'Entry success', percent: 78.4, displayValue: '78.4%' },
              { label: 'Clutch conversion', percent: 41, displayValue: '41%' },
            ]}
            tacticalNote={{
              tone: 'positive',
              title: 'Status tático // recomendado:',
              description: 'Mantenha como main — impacto consistente acima do elo.',
            }}
          />
          <AgentCard
            name="Cypher"
            role="Sentinela"
            matches={12}
            winRate="42.1%"
            tier="bottleneck"
            tierLabel="Bottleneck"
            stats={[
              { label: 'ACS', value: '171', delta: -18 },
              { label: 'K/D', value: '0.89', delta: -0.12 },
              { label: 'FB', value: '0.41', delta: -0.05 },
            ]}
            progresses={[
              { label: 'Entry success', percent: 28, displayValue: '28%' },
              { label: 'Clutch conversion', percent: 12, displayValue: '12%' },
            ]}
            tacticalNote={{
              tone: 'warning',
              title: 'Alerta // gargalo crítico:',
              description: 'Win rate derruba o elo — troque de sentinela ou treine setups.',
            }}
          />
          <div className="flex flex-col gap-3">
            <MapCard
              map="Ascent"
              status="best"
              statusLabel="Melhor mapa"
              winRate="72%"
              matches={18}
              record={{ wins: 13, losses: 5 }}
              attackPercent={64}
              defensePercent={80}
            />
            <MapCard
              map="Breeze"
              status="worst"
              statusLabel="Pior mapa"
              winRate="31%"
              matches={8}
              record={{ wins: 2, losses: 6 }}
              attackPercent={22}
              defensePercent={38}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <BenchmarkBar
            label="K/D"
            playerValue="1.34"
            eloValue="1.05"
            playerPercent={67}
            eloPercent={52.5}
            above
            scale={['0.00', '1.05 (elo)', '2.00']}
          />
          <BenchmarkBar
            label="Headshot"
            playerValue="21%"
            eloValue="26%"
            playerPercent={40}
            eloPercent={52.5}
            above={false}
            scale={['0%', '26% (elo)', '50%']}
          />
        </div>
      </Section>

      <Section title="AI Coach: terminal, query & callout">
        <div className="grid gap-3 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <AiCoachTerminal
              status="Layer 3 online"
              title="Protocol advice"
              scoreLine="Backend Score: 87/100 • 3-Layer Synthesized"
            >
              <CoachingTip
                title="Prioridade da sessão"
                priority="alta"
                impact="Impacto estimado: +6% WR"
              >
                Aqueça com <strong>20 retakes</strong> antes da fila — seu primeiro round tem
                conversão 18pp abaixo do resto da sessão.
              </CoachingTip>
              <CoachingTip
                title="Rotina diária"
                priority="rotina"
                impact="Impacto estimado: +3% WR"
              >
                10 min de deathmatch com Vandal focando headshot antes de ranqueadas.
              </CoachingTip>
            </AiCoachTerminal>
          </div>
          <div className="lg:col-span-7">
            <div className="rounded-md border border-line bg-surface-raised p-3">
              <AiQueryForm
                model="MINIMAX-VAL-03"
                tokenMeta="PROMPT TOKEN: 4.2k"
                onSubmit={(prompt) => {
                  window.console.info('[showcase] prompt:', prompt);
                }}
                response="Sua taxa de primeiro sangue está 12% acima do elo, mas a conversão de clutch 1v2 (18%) é o principal gargalo. Foque em retakes com util."
                responseMeta="LATÊNCIA: 180MS"
              />
            </div>
            <div className="mt-3">
              <AiCallout
                title="PROTOCOL ADVICE: MAP POOL DEFICIT ENGINE"
                riskChip="Risco elevado de RR (-48 RR/sem)"
                confidence="94.6%"
                actions={[
                  {
                    title: 'Fila só de mapas fortes',
                    description: 'Dodge Breeze/Pearl nas próximas 10 partidas.',
                  },
                  {
                    title: 'Bloco de estudo por mapa',
                    description: '5 min de VOD por mapa fraco, foco em mid control.',
                  },
                ]}
                quickAction={{
                  label: 'Ação rápida',
                  title: 'Plano de 7 dias',
                  description: 'Gerado pela IA a partir do gap.',
                  primary: { label: 'Gerar plano', onSelect: () => {} },
                  ghost: { label: 'Ver detalhes', onSelect: () => {} },
                }}
              >
                <h4 className="font-display text-heading-sm font-bold uppercase text-text-primary">
                  Map pool defasado custa RR
                </h4>
                <p className="text-body leading-relaxed text-text-primary">
                  Ascent e Lotus respondem por <strong>68% das suas vitórias</strong>, mas você
                  jogou 41% das partidas em mapas com WR abaixo de 45%.
                </p>
              </AiCallout>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Chat do coach IA">
        <div className="flex max-w-2xl flex-col rounded-md border border-line bg-surface-raised p-3">
          <div className="flex flex-col gap-2">
            <ChatMessage variant="system">
              Sessão iniciada — contexto da camada 3 carregado
            </ChatMessage>
            <ChatMessage
              variant="ai"
              sender="Valorant AI Coach // MiniMax"
              timestamp="14:02"
              meta={[
                { label: 'Contexto: Layer 3' },
                { label: 'Confiança: 99.4%', tone: 'accent' },
              ]}
              embedded={
                <>
                  <p className="font-hud text-label font-bold uppercase text-text-secondary">
                    Drill recomendado:
                  </p>
                  <p className="mt-1 text-body">20 retakes no Range, foco em swap de arma.</p>
                </>
              }
            >
              Seu ADS em long range está <strong>12% abaixo</strong> do elo. Antes da próxima
              ranqueada, rode o drill de 20 retakes.
            </ChatMessage>
            {chatLog.map((message) => (
              <ChatMessage key={message} variant="user" sender="U">
                {message}
              </ChatMessage>
            ))}
          </div>
          <ChatInputBar onSend={(message) => setChatLog((log) => [...log, message])} />
        </div>
      </Section>

      <Section title="Console: pipeline, layer tabs & payload">
        <div className="space-y-3">
          <PipelineFlow
            stages={[
              {
                label: 'Camada 01: Raw HenrikDev',
                sizeChip: '420 KB',
                title: 'Payload bruto da API',
                meta: '27 endpoints monitorados',
              },
              {
                label: 'Camada 02: Normalização',
                sizeChip: '48 KB',
                title: 'Telemetria validada (Zod)',
                meta: 'Drift check: ok',
              },
              {
                label: 'Camada 03: Coaching',
                sizeChip: '1.8 KB / 420 TOKENS',
                title: 'Prompt sintetizado p/ MiniMax',
                meta: 'Economia de 91%',
                highlighted: true,
              },
            ]}
          />
          <LayerTabs
            ariaLabel="Camada do payload"
            options={[
              { id: 'l1', label: 'Raw L1' },
              { id: 'l2', label: 'Normalizado L2' },
              { id: 'l3', label: 'Prompt L3' },
            ]}
            activeId={layerId}
            onChange={setLayerId}
          />
          <CodeViewer
            filename={`layer${layerId.slice(1)}.payload.json`}
            code={`{
  "layer": "${layerId}",
  "matchId": "8842a1f0",
  "players": [{ "name": "TenZ", "acs": 287, "clutch": true }],
  "coaching": { "score": 87, "severity": "high", "drill": "retakes" },
  "tokens": 420
}`}
            actions={[
              { label: 'Copiar payload', icon: 'copy', onSelect: () => {} },
              { label: 'Exportar schemas', icon: 'download', onSelect: () => {} },
              { label: 'Simular nova partida', icon: 'refresh', variant: 'primary', onSelect: () => {} },
            ]}
          />
        </div>
      </Section>

      <Section title="RrTrendChart">
        <RrTrendChart
          series={[
            { rr: 0, result: 'win' },
            { rr: 22, result: 'win' },
            { rr: 40, result: 'loss' },
            { rr: 18, result: 'win' },
            { rr: 58, result: 'win' },
            { rr: 36, result: 'loss' },
            { rr: 74, result: 'win' },
            { rr: 96, result: 'win' },
            { rr: 144, result: 'win' },
          ]}
        />
        <p className="mt-2 font-hud text-label uppercase text-text-secondary">
          Net: +144 RR • amarelo = vitória, tinta = derrota
        </p>
      </Section>
      <Section title="Landing & busca (tela Stitch final)">
        <div className="space-y-6">
          <div className="-mx-4 -mt-2">
            <SystemStatusBar
              message="MOTOR TÁTICO v4.2 • POWERED BY MINIMAX AI • 3-LAYER TELEMETRY PIPELINE"
              statuses={[
                { icon: 'target', label: 'Latência: <150ms' },
                { icon: 'shield', label: 'Riot v9.11 compliant' },
              ]}
            />
          </div>

          <div className="flex flex-col items-center gap-4">
            <SearchConsole
              hardShadow
              statusChip="STATUS: AGUARDANDO INPUT"
              helperText="3-layer pipeline pronto — pressione Enter para buscar"
            >
              <SearchBar
                submitLabel="Analisar"
                onSubmit={(query) => {
                  setIngestionTarget(`${query.name}#${query.tag}`);
                  setIngestionOpen(true);
                }}
              />
            </SearchConsole>

            <DemoProfileGrid
              profiles={DEMO_PROFILES}
              onSelect={(profile) => {
                setIngestionTarget(profile.riotId);
                setIngestionOpen(true);
              }}
            />
          </div>

          <div>
            <SectionHeader
              title="Arquitetura de 3 camadas"
              annotation="TOKEN_EFFICIENCY"
              marker="accent"
              meta={<span>98.5% economia • &lt;150ms</span>}
            />
            <div className="relative mt-3 grid gap-3 md:grid-cols-3">
              <PipelineStepCard
                phase="FASE 01"
                metric="~420 KB"
                icon="download"
                title="Ingestão HenrikDev API"
                description="Extração completa de ticks oficiais da Riot Games: eliminações x/y, ângulos, timings de defuse e fluxo econômico."
                output="raw_match_timeline.json"
              />
              <PipelineStepCard
                phase="FASE 02 • NÚCLEO"
                highlighted
                metric="~85 KB"
                icon="refresh"
                title="Motor de KPIs"
                description="Detecta matematicamente overpeeking, isolamento em retakes e timing de trade fraco — métricas estritas, zero subjetividade."
                output="kpi_compressed_matrix.bin"
              />
              <PipelineStepCard
                phase="FASE 03"
                metric="420 tokens"
                icon="bot"
                title="Síntese cognitiva MiniMax"
                description="O LLM recebe apenas os vetores táticos filtrados e prescreve coaching cirúrgico sem alucinação de jogo."
                output="actionable_coach_diagnosis.md"
              />
            </div>
          </div>

          <div>
            <SectionHeader
              title="Módulos do ecossistema"
              annotation="MOD: 04 SUÍTES ATIVAS"
            />
            <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <FeatureModuleCard
                moduleId="MOD_01"
                icon="terminal"
                title="Histórico telemétrico compacto"
                description="Timeline round a round com classificação econômica e dispersão de mortes nos primeiros 15s."
                statLabel="Detecção de duelos"
                statValue="100% exato"
              />
              <FeatureModuleCard
                moduleId="MOD_02"
                icon="target"
                title="Benchmark por elo real"
                description="Compare First Blood, KAST% e dano/round com o topo 1% do seu próprio ranque."
                statLabel="Base comparativa"
                statValue="RAD / IMM / ASC"
              />
              <FeatureModuleCard
                moduleId="MOD_03"
                icon="shield"
                title="Map pool deficit engine"
                description="Identifique os mapas que drenam RR e receba rotinas de correção de retake e execução de site."
                statLabel="Diagnóstico map pool"
                statValue="7 mapas ativos"
              />
              <FeatureModuleCard
                moduleId="MOD_04"
                icon="bot"
                title="Sandbox de IA interativo"
                description="Converse com o modelo sobre decisões específicas: “Por que perdi o clutch 1v2 no round 18?”"
                statLabel="Motor de conversa"
                statValue="MiniMax-Val-03"
              />
            </div>
          </div>

          <LiveStatusStrip
            items={[
              { label: 'Latência API', value: '12 ms', live: true },
              { label: 'Computação 3-layer', value: 'Online' },
              { label: 'Jogadores indexados', value: '42.890+' },
              { label: 'Patch Riot Games', value: 'v9.11 compat' },
            ]}
            actions={
              <>
                <Button variant="secondary" size="sm" onClick={() => setIngestionOpen(true)}>
                  Testar perfil demo
                </Button>
                <Button size="sm" onClick={() => {}}>
                  Documentação API
                </Button>
              </>
            }
          />
        </div>
      </Section>

      <SearchIngestionModal
        open={ingestionOpen}
        target={ingestionTarget}
        progressPercent={100}
        ready
        onOpenReport={() => setIngestionOpen(false)}
        onClose={() => setIngestionOpen(false)}
        steps={[
          { label: 'CAMADA 1: Handshake HenrikDev API concluído', state: 'done' },
          { label: 'CAMADA 2: Pipeline Rust compilou 412KB de ticks em 85KB de vetores', state: 'done' },
          { label: 'CAMADA 3: Minimax LLM gerando diagnóstico tático (420 tokens)...', state: 'done' },
        ]}
      />
    </div>
  );
}
