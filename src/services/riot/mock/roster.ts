/**
 * Elenco FICTÍCIO do mock ("jogadores de lobby") e catálogo de agentes.
 *
 * Regra do projeto: nenhum Riot ID real (pros, streamers, contas
 * conhecidas). Todos os nomes abaixo foram inventados para o ValCoach.
 * Os UUIDs de agentes são ids de conteúdo do jogo (valorant-api.com).
 */

export type AgentRole = 'Duelist' | 'Initiator' | 'Controller' | 'Sentinel';

export interface MockAgent {
  readonly uuid: string;
  readonly name: string;
  readonly role: AgentRole;
}

export const MOCK_AGENTS: readonly MockAgent[] = [
  { uuid: 'add6443a-41bd-e414-f6ad-e58d267f4e95', name: 'Jett', role: 'Duelist' },
  { uuid: 'a3bfb853-43b2-7238-a4f1-ad90e9e46bcc', name: 'Reyna', role: 'Duelist' },
  { uuid: 'f94c3b30-42be-e959-889c-5aa313dba261', name: 'Raze', role: 'Duelist' },
  { uuid: 'eb93336a-449b-9c1b-0a54-a891f7921d69', name: 'Phoenix', role: 'Duelist' },
  { uuid: 'bb2a4828-46eb-8cd1-e765-15848195d751', name: 'Neon', role: 'Duelist' },
  { uuid: '7f94d92c-4234-0a36-9646-3a87eb8b5c89', name: 'Yoru', role: 'Duelist' },
  { uuid: '0e38b510-41a8-5780-5e8f-568b2a4f2d6c', name: 'Iso', role: 'Duelist' },
  { uuid: '320b2a48-4d9b-a075-30f1-1f93a9b638fa', name: 'Sova', role: 'Initiator' },
  { uuid: '5f8d3a7f-467b-97f3-062c-13acf203c006', name: 'Breach', role: 'Initiator' },
  { uuid: '6f2a04ca-43e0-be17-7f36-b3908627744d', name: 'Skye', role: 'Initiator' },
  { uuid: '601dbbe7-43ce-be57-2a40-4abd24953621', name: 'KAY/O', role: 'Initiator' },
  { uuid: 'dade69b4-4f5a-8528-247b-219e5a1facd6', name: 'Fade', role: 'Initiator' },
  { uuid: 'e370fa57-4757-3604-3648-499e1f642d3f', name: 'Gekko', role: 'Initiator' },
  { uuid: '8e253930-4c05-31dd-1b6c-968525494517', name: 'Omen', role: 'Controller' },
  { uuid: '9f0d8ba9-4140-b941-57d3-a7ad57c6b417', name: 'Brimstone', role: 'Controller' },
  { uuid: '707eab51-4836-f488-046a-cda6bf494859', name: 'Viper', role: 'Controller' },
  { uuid: '41fb69c1-4189-7b37-f117-bcaf1e96f1bf', name: 'Astra', role: 'Controller' },
  { uuid: '95b78ed7-4637-86d9-7e41-71ba8c293152', name: 'Harbor', role: 'Controller' },
  { uuid: '1dbf2edd-4729-0984-3115-daa5eed44993', name: 'Clove', role: 'Controller' },
  { uuid: '1e58de9c-4950-5125-93e9-a0aee9f98746', name: 'Killjoy', role: 'Sentinel' },
  { uuid: '117ed9e3-49f3-6512-3ccf-0cada7e3823b', name: 'Cypher', role: 'Sentinel' },
  { uuid: '569fdd95-4d10-43ab-ca70-79becc718b46', name: 'Sage', role: 'Sentinel' },
  { uuid: '22697a3d-45bf-8dd7-4fec-84a9e28c69d7', name: 'Chamber', role: 'Sentinel' },
  { uuid: 'cc8b64c8-4b25-4ff9-6e7f-37b4da43d235', name: 'Deadlock', role: 'Sentinel' },
  { uuid: 'efba5359-4016-a1e5-7626-b1ae76895940', name: 'Vyse', role: 'Sentinel' },
];

export interface MockRosterPlayer {
  readonly gameName: string;
  readonly tagLine: string;
  /** Agentes preferidos (nomes de `MOCK_AGENTS`), do mais jogado ao menos. */
  readonly mains: readonly string[];
}

export const MOCK_ROSTER: readonly MockRosterPlayer[] = [
  { gameName: 'Lumen', tagLine: 'VC01', mains: ['Jett', 'Raze'] },
  { gameName: 'Corvo Azul', tagLine: 'VC02', mains: ['Sova', 'Fade'] },
  { gameName: 'Neblina', tagLine: 'VC03', mains: ['Omen', 'Astra'] },
  { gameName: 'Torre Fria', tagLine: 'VC04', mains: ['Killjoy', 'Cypher'] },
  { gameName: 'Seiva', tagLine: 'VC05', mains: ['Sage', 'Skye'] },
  { gameName: 'Rubra', tagLine: 'VC06', mains: ['Reyna', 'Phoenix'] },
  { gameName: 'Tremor', tagLine: 'VC07', mains: ['Breach', 'KAY/O'] },
  { gameName: 'Fumaça Velha', tagLine: 'VC08', mains: ['Brimstone', 'Harbor'] },
  { gameName: 'Olho Mudo', tagLine: 'VC09', mains: ['Cypher', 'Deadlock'] },
  { gameName: 'Trilha', tagLine: 'VC10', mains: ['Skye', 'Gekko'] },
  { gameName: 'Maré Baixa', tagLine: 'MAR', mains: ['Harbor', 'Viper'] },
  { gameName: 'Faísca', tagLine: '2077', mains: ['Neon', 'Jett'] },
  { gameName: 'Cacto Zen', tagLine: 'CZN', mains: ['Viper', 'Clove'] },
  { gameName: 'Pé de Vento', tagLine: 'BR1', mains: ['Jett', 'Yoru'] },
  { gameName: 'Lince', tagLine: 'ZEN', mains: ['Fade', 'Sova'] },
  { gameName: 'Garoa', tagLine: 'SP11', mains: ['Astra', 'Omen'] },
  { gameName: 'Brasa Fina', tagLine: 'FOGO', mains: ['Phoenix', 'Iso'] },
  { gameName: 'Quasar', tagLine: '404', mains: ['Chamber', 'Vyse'] },
  { gameName: 'Tatu Bola', tagLine: 'TATU', mains: ['Sage', 'Killjoy'] },
  { gameName: 'Eco Distante', tagLine: 'ECO', mains: ['KAY/O', 'Breach'] },
  { gameName: 'Vagalume', tagLine: 'LUZ', mains: ['Yoru', 'Reyna'] },
  { gameName: 'Ponteiro', tagLine: 'MIRA', mains: ['Chamber', 'Jett'] },
  { gameName: 'Cerrado', tagLine: 'GO62', mains: ['Gekko', 'Skye'] },
  { gameName: 'Ventania', tagLine: 'RS51', mains: ['Raze', 'Neon'] },
  { gameName: 'Capivara Ágil', tagLine: 'BR77', mains: ['Clove', 'Brimstone'] },
  { gameName: 'Piso Frio', tagLine: 'PISO', mains: ['Deadlock', 'Cypher'] },
  { gameName: 'Mira Torta', tagLine: 'OOPS', mains: ['Reyna', 'Iso'] },
  { gameName: 'Sabiá', tagLine: '0101', mains: ['Vyse', 'Sage'] },
  { gameName: 'Granizo', tagLine: 'GELO', mains: ['Viper', 'Harbor'] },
  { gameName: 'Ipê Roxo', tagLine: 'FLOR', mains: ['Astra', 'Fade'] },
];
