import { describe, expect, it } from 'vitest';
import {
  agentArtSrc,
  agentIconSrc,
  mapMinimapSrc,
  mapSplashSrc,
  rankIconSrc,
} from '@/lib/valorant-assets';

/**
 * SUITE TDD — mapa de assets estáticos: nomes da HenrikDev → arquivos
 * commitados em `public/assets`. Desconhecido → `null` (fallback na view).
 */

describe('agentIconSrc', () => {
  it('resolve nomes canônicos e variações da HenrikDev', () => {
    expect(agentIconSrc('Jett')).toBe('/assets/images/agents/jett.png');
    expect(agentIconSrc('KAY/O')).toBe('/assets/images/agents/kay-o.png');
    expect(agentIconSrc('Kay-O')).toBe('/assets/images/agents/kay-o.png');
    expect(agentIconSrc('Waylay')).toBe('/assets/images/agents/aylay.png');
    expect(agentIconSrc('Veto')).toBe('/assets/images/agents/veto.jpeg');
    expect(agentIconSrc('TEJO')).toBe('/assets/images/agents/tejo.png');
  });

  it('normaliza espaços, acentos e separadores', () => {
    expect(agentIconSrc('  JETT ')).toBe('/assets/images/agents/jett.png');
    expect(agentIconSrc('kay o')).toBe('/assets/images/agents/kay-o.png');
  });

  it('agente sem asset devolve null', () => {
    expect(agentIconSrc('Ultra')).toBeNull();
    expect(agentIconSrc('')).toBeNull();
  });
});

describe('agentArtSrc', () => {
  it('resolve a arte por agente (extensões variadas)', () => {
    expect(agentArtSrc('Jett')).toBe('/assets/images/agents-design/jett-design.webp');
    expect(agentArtSrc('KAY/O')).toBe('/assets/images/agents-design/kayo-design.webp');
    expect(agentArtSrc('Waylay')).toBe('/assets/images/agents-design/waylay-design.webp');
    expect(agentArtSrc('Omen')).toBe('/assets/images/agents-design/omen-design.png');
  });

  it('sem asset devolve null', () => {
    expect(agentArtSrc('Ultra')).toBeNull();
  });
});

describe('mapSplashSrc / mapMinimapSrc', () => {
  it('resolve splash e minimapa por mapa', () => {
    expect(mapSplashSrc('Ascent')).toBe('/assets/images/maps/ascent.jpeg');
    expect(mapMinimapSrc('Ascent')).toBe('/assets/images/maps/ascent-map.png');
    expect(mapSplashSrc('Sunset')).toBe('/assets/images/maps/sunset.webp');
    expect(mapMinimapSrc('Icebox')).toBe('/assets/images/maps/icebox-map.png');
  });

  it('mapa desconhecido devolve null nas duas variantes', () => {
    expect(mapSplashSrc('Nuke')).toBeNull();
    expect(mapMinimapSrc('Nuke')).toBeNull();
  });
});

describe('rankIconSrc', () => {
  it('resolve tiers da HenrikDev com divisão e grafias da fonte', () => {
    expect(rankIconSrc('Diamond 2')).toBe('/assets/images/ranks/diamond-2.png');
    expect(rankIconSrc('Iron 1')).toBe('/assets/images/ranks/iron-1.png');
    expect(rankIconSrc('Ascendant 3')).toBe('/assets/images/ranks/ascendant-3.png');
    expect(rankIconSrc('Immortal 3')).toBe('/assets/images/ranks/immortal-3.png');
    expect(rankIconSrc('Radiant')).toBe('/assets/images/ranks/radiant.png');
  });

  it('cobre Unrated e a grafia "Unranked" da fonte', () => {
    expect(rankIconSrc('Unrated')).toBe('/assets/images/ranks/unrated.png');
    expect(rankIconSrc('Unranked')).toBe('/assets/images/ranks/unrated.png');
  });

  it('normaliza caixa/espaços como os outros mapas', () => {
    expect(rankIconSrc('  DIAMOND 2 ')).toBe('/assets/images/ranks/diamond-2.png');
    expect(rankIconSrc('gold 3')).toBe('/assets/images/ranks/gold-3.png');
  });

  it('tier desconhecido/vazio devolve null (chip só de texto)', () => {
    expect(rankIconSrc('Ultra')).toBeNull();
    expect(rankIconSrc('')).toBeNull();
  });
});
