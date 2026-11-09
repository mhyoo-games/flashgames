// 한빛 군도 지도와 사람들
import type { Look } from '../quest/pixel.ts';
import { MOVES } from './moves.ts';
import { speciesByName, STARTERS } from './species.ts';
import { Builder, link, type EncEntry, type GameState, type MapDef, type NpcDef, type Step, type TimeOfDay, type TrainerDef } from './world.ts';

const N = (name: string) => speciesByName(name).no;
const E = (name: string, min: number, max: number, w = 10, time?: TimeOfDay): EncEntry => ({ no: N(name), min, max, w, time });
const say = (who: string, ...lines: string[]): Step[] => lines.map((s) => ({ who, say: s }));

// ---------------- 생김새 ----------------
const P = (o: Partial<Look> & { top: string }): Look => ({ skin: '#ffd2a8', hair: '#3a2a2a', hairStyle: 'short', pants: '#3a3a5a', ...o });
export const LOOKS: Record<string, Look> = {
  hero: P({ hair: '#3a2a2a', hairStyle: 'spiky', top: '#e83a3a', trim: '#ffffff', pants: '#3a4a8a', hat: 'cap', hatColor: '#e83a3a' }),
  rival: P({ hair: '#c83a2a', hairStyle: 'spiky', top: '#3a3a4a', trim: '#e8c040', pants: '#2a2a3a' }),
  mom: P({ hair: '#6a3a2a', hairStyle: 'bun', top: '#f0a0b0', pants: '#f0a0b0', robe: true }),
  prof: P({ hair: '#d8d8d8', hairStyle: 'short', top: '#ffffff', trim: '#5a8a3a', pants: '#6a5a4a', beard: '#d8d8d8' }),
  aide: P({ hair: '#2a2a3a', hairStyle: 'short', top: '#ffffff', trim: '#5a8ad0', pants: '#4a4a6a' }),
  nurse: P({ hair: '#ff8ab0', hairStyle: 'bun', top: '#ffffff', trim: '#ff6a8a', pants: '#ffffff', robe: true }),
  clerk: P({ hair: '#4a3a2a', top: '#3a8ad0', trim: '#ffffff', pants: '#2a3a5a', hat: 'cap', hatColor: '#3a8ad0' }),
  kid: P({ hair: '#c86a2a', top: '#3aa0e0', pants: '#2a4a8a' }),
  girl: P({ hair: '#2a2a3a', hairStyle: 'twin', top: '#ff7aa0', pants: '#ff7aa0', robe: true }),
  bug: P({ hair: '#5a3a1a', top: '#8ac83a', pants: '#5a6a2a', hat: 'cap', hatColor: '#e8d040' }),
  hiker: P({ hair: '#5a3a1a', top: '#a0703a', pants: '#5a4a2a', beard: '#5a3a1a', hat: 'bandana', hatColor: '#8a5a2a' }),
  swimmer: P({ hair: '#e8c040', top: '#3a8ae0', pants: '#3a8ae0' }),
  lass: P({ hair: '#e8a040', hairStyle: 'long', top: '#ffffff', trim: '#e84a6a', pants: '#e84a6a', robe: true }),
  monk: P({ hair: '#8a8a8a', hairStyle: 'bald', top: '#d88a3a', pants: '#d88a3a', robe: true }),
  old: P({ skin: '#f0c8a0', hair: '#e8e8e8', hairStyle: 'bald', eyes: 'sleepy', top: '#7a6a5a', pants: '#5a4a3a', beard: '#f4f4f4', prop: 'staff', robe: true }),
  granny: P({ skin: '#f0c8a0', hair: '#d8d8d8', hairStyle: 'bun', eyes: 'sleepy', top: '#8a5a9a', pants: '#8a5a9a', robe: true }),
  grunt: P({ hair: '#1a1a1a', top: '#2a2a2a', trim: '#8a8aa0', pants: '#1a1a22', hat: 'cap', hatColor: '#2a2a2a', eyes: 'mask' }),
  boss: P({ hair: '#6a6a7a', hairStyle: 'spiky', top: '#1a1a22', trim: '#c8a040', pants: '#1a1a22', beard: '#4a4a5a' }),
  police: P({ hair: '#2a2a2a', top: '#2a4a8a', trim: '#e8c040', pants: '#1a2a5a', hat: 'cap', hatColor: '#1a2a5a' }),
  sailor: P({ hair: '#3a2a2a', top: '#ffffff', trim: '#2a4a8a', pants: '#2a4a8a', hat: 'cap', hatColor: '#ffffff' }),
  miner: P({ hair: '#3a2a2a', top: '#e8a03a', pants: '#5a4a3a', hat: 'helm', hatColor: '#e8d040', prop: 'axe' }),
  // 관장들
  g1: P({ hair: '#3a8a3a', hairStyle: 'long', top: '#5ac04a', trim: '#ffe07a', pants: '#3a6a2a', robe: true }),
  g2: P({ hair: '#f8d030', hairStyle: 'spiky', top: '#3a3a4a', trim: '#f8d030', pants: '#2a2a3a' }),
  g3: P({ hair: '#5a3a1a', top: '#8a7a5a', pants: '#5a4a3a', beard: '#5a3a1a', hat: 'helm', hatColor: '#9a8a6a' }),
  g4: P({ hair: '#3a6ae0', hairStyle: 'twin', top: '#4a90f0', trim: '#ffffff', pants: '#4a90f0' }),
  g5: P({ skin: '#f0e0f0', hair: '#4a3a6a', hairStyle: 'long', top: '#4a3a6a', trim: '#c8a0ff', pants: '#2a1a3a', robe: true }),
  g6: P({ hair: '#e83a2a', hairStyle: 'spiky', top: '#e85a2a', trim: '#ffd23a', pants: '#5a2a1a', beard: '#c82a1a' }),
  g7: P({ skin: '#fff0f4', hair: '#e8f8ff', hairStyle: 'long', top: '#a8e0f0', trim: '#ffffff', pants: '#a8e0f0', robe: true }),
  g8: P({ hair: '#4a2a8a', hairStyle: 'spiky', top: '#5a3ad0', trim: '#ffd23a', pants: '#2a1a5a', hat: 'headband', hatColor: '#ffd23a' }),
  champ: P({ hair: '#f8d070', hairStyle: 'long', top: '#ffffff', trim: '#ffd23a', pants: '#3a3a5a', hat: 'crown', hatColor: '#ffd23a' }),
  elite: P({ hair: '#2a2a2a', top: '#6a3a8a', trim: '#ffd23a', pants: '#2a1a3a', robe: true }),
  gourd: { skin: '#e8a050', hair: '#e8a050', hairStyle: 'none', top: '#c87a3a', pants: '#c87a3a', eyes: 'sleepy', robe: true },
};

const maps: Record<string, MapDef> = {};
const builders: Record<string, Builder> = {};
function B(id: string, name: string, w: number, h: number, terrain: ConstructorParameters<typeof Builder>[4], song: ConstructorParameters<typeof Builder>[5], fill = '.') {
  const b = new Builder(id, name, w, h, terrain, song, fill);
  builders[id] = b;
  return b;
}
let npcNo = 0;
const npc = (x: number, y: number, look: string, name: string, talk: NpcDef['talk'], extra: Partial<NpcDef> = {}): NpcDef => ({ id: `n${npcNo++}`, x, y, look, name, talk, ...extra });
const trainer = (x: number, y: number, look: string, name: string, dir: NpcDef['dir'], t: Omit<TrainerDef, 'smart' | 'sight'> & Partial<Pick<TrainerDef, 'smart' | 'sight'>>): NpcDef => ({
  id: `t${npcNo++}`,
  x,
  y,
  look,
  name,
  dir,
  trainer: { smart: 1, sight: 4, ...t },
});
const team = (...a: [string, number][]): [number, number][] => a.map(([n, lv]) => [N(n), lv]);

// ---------------- 실내 틀 ----------------
/** 실내: 위·옆 벽, 아래 가운데가 출구 */
function room(id: string, name: string, w: number, h: number, back: [string, number, number], song: Parameters<typeof B>[5] = 'ktown') {
  const b = B(id, name, w, h, 'indoor', song, 'f');
  b.rect(0, 0, w, 2, 'x').rect(0, 0, 1, h, 'x').rect(w - 1, 0, 1, h, 'x').rect(0, h - 1, w, 1, 'x');
  const ex = Math.floor(w / 2);
  b.set(ex, h - 1, 'a');
  b.warp(ex, h, back[0], back[1], back[2], 'down');
  return { b, entry: [ex, h - 2] as [number, number] };
}

/** 마을 집 → 실내 연결 */
function door(town: Builder, x: number, y: number, w: number, roof: string, inner: (back: [string, number, number]) => { b: Builder; entry: [number, number] }) {
  const dx = x + Math.floor(w / 2);
  const r = inner([town.def.id, dx, y + 3]);
  town.house(x, y, w, roof, { to: r.b.def.id, tx: r.entry[0], ty: r.entry[1] });
  return [dx, y + 3] as [number, number];
}

const HEAL: Step[] = [{ who: '쉼터 누나', say: '어서 오세요, 깨비 쉼터입니다! 깨비들을 쉬게 해 드릴게요.' }, { heal: true }, { who: '쉼터 누나', say: '깨비들이 모두 기운을 되찾았어요! 또 오세요~' }];
function center(town: Builder, x: number, y: number) {
  const home = door(town, x, y, 4, 'r', (back) => {
    const r = room(`${town.def.id}-c`, `${town.def.name} 쉼터`, 11, 8, back, 'kcenter');
    r.b.rect(3, 3, 5, 1, 'c');
    r.b.npc(npc(5, 2, 'nurse', '쉼터 누나', () => HEAL, { dir: 'down' }));
    r.b.set(9, 2, 'p');
    r.b.set(1, 2, 'k');
    r.b.npc(npc(2, 5, 'kid', '여행자', () => say('여행자', '보관함(오른쪽 위 기계)에서 잡은 깨비를 맡기고 꺼낼 수 있어. 파티는 여섯 마리까지야.'), { turn: true }));
    return r;
  });
  town.def.heal = home;
  return home;
}

function shopList(s: GameState): string[] {
  const l = ['gourd', 'herb', 'antidote', 'parheal', 'awake', 'repel'];
  if (s.badges >= 1) l.push('burnheal', 'thaw');
  if (s.badges >= 2) l.push('celadon', 'goodherb');
  if (s.badges >= 3) l.push('revive');
  if (s.badges >= 4) l.push('porcelain', 'panacea');
  if (s.badges >= 5) l.push('ginseng', 'ether');
  return l;
}
function shop(town: Builder, x: number, y: number, extra?: string[]) {
  door(town, x, y, 4, 'y', (back) => {
    const r = room(`${town.def.id}-s`, `${town.def.name} 잡화점`, 10, 8, back);
    r.b.rect(1, 3, 3, 1, 'c');
    r.b.npc(npc(2, 2, 'clerk', '가게 주인', (s) => [{ who: '가게 주인', say: '어서 옵쇼! 무엇을 드릴까요?' }, { shop: [...shopList(s), ...(extra ?? [])] }], { dir: 'down' }));
    r.b.rect(6, 2, 3, 1, 'k');
    return r;
  });
}

function house(town: Builder, x: number, y: number, people: (b: Builder) => void, name = '민가') {
  door(town, x, y, 4, 'R', (back) => {
    const r = room(`${town.def.id}-h${x}`, name, 9, 7, back);
    r.b.set(1, 2, 'k');
    r.b.set(7, 2, 'k');
    people(r.b);
    return r;
  });
}

// ---------------- 체육관 ----------------
interface Gym {
  n: number;
  type: string;
  leader: string;
  look: string;
  badge: string;
  team: [string, number][];
  trainers: [string, string, [string, number][]][];
  hm?: string;
  tm: string;
  quote: [string, string];
}
const GYMS: Gym[] = [
  { n: 1, type: '풀', leader: '솔잎', look: 'g1', badge: '새싹 인장', team: [['민들레솜', 12], ['꽃봉오리', 12], ['홀씨구름', 14]], trainers: [['lass', '꽃꽂이 소녀 다래', [['도토리콩', 10], ['민들레솜', 10]]]], hm: 'cut', tm: 'bigsip', quote: ['풀은 밟혀도 다시 일어나지. 너도 그럴 수 있니?', '단단히 뿌리내린 승부였어. 새싹 인장을 줄게.'] },
  { n: 2, type: '전기', leader: '찌릿', look: 'g2', badge: '번개 인장', team: [['찌릿쥐', 18], ['반디콩', 18], ['번개쥐', 21]], trainers: [['kid', '전기공 번쩍', [['나사콩', 16], ['찌릿쥐', 17]]], ['lass', '응원단 소리', [['반디콩', 17], ['번개새콩', 17]]]], hm: 'flash', tm: 'bolt', quote: ['내 번개는 피할 틈이 없다고! 짜릿하게 가자!', '찌릿찌릿… 졌다! 번개 인장이야!'] },
  { n: 3, type: '바위', leader: '단단', look: 'g3', badge: '바위 인장', team: [['조약돌이', 22], ['화석벌레', 23], ['바위둥이', 25]], trainers: [['hiker', '등산가 우직', [['조약돌이', 20], ['두더콩', 21]]], ['hiker', '광부 곡괭이', [['바위둥이', 22]]]], hm: 'strength', tm: 'rockslide', quote: ['산은 움직이지 않는다. 너는 이 산을 넘을 수 있나?', '허허, 산이 움직였구먼. 바위 인장일세.'] },
  { n: 4, type: '물', leader: '이슬', look: 'g4', badge: '물결 인장', team: [['은빛잉어', 27], ['진주조개', 27], ['독해파리', 28], ['개울두꺼', 30]], trainers: [['swimmer', '수영선수 물결', [['송사리콩', 25], ['물개콩', 26]]], ['swimmer', '해녀 숨비', [['조개콩', 25], ['해파리콩', 26]]]], hm: 'surf', tm: 'torrent', quote: ['물은 모양이 없어서 무엇이든 될 수 있어. 받아 줄 수 있겠니?', '파도에 휩쓸렸네… 물결 인장을 받아!'] },
  { n: 5, type: '귀신', leader: '달래', look: 'g5', badge: '그믐 인장', team: [['도깨불', 32], ['독안개', 32], ['그믐초롱', 33], ['허물귀신', 35]], trainers: [['granny', '무당 할멈', [['그림자콩', 30], ['연기콩', 30], ['초롱콩', 31]]], ['lass', '영매 소녀', [['혼불콩', 31], ['매미허물', 31]]]], hm: 'fly', tm: 'shadowball', quote: ['후후… 그믐밤엔 보이지 않는 것이 보이지. 무섭지 않니?', '너의 빛이 그림자를 이겼구나. 그믐 인장이야.'] },
  { n: 6, type: '불', leader: '화로', look: 'g6', badge: '불꽃 인장', team: [['횃불여우', 37], ['용암두꺼', 37], ['화염매', 38], ['도깨비불', 40]], trainers: [['hiker', '대장장이 망치', [['숯덩이', 34], ['성냥개비', 35], ['불새콩', 35]]], ['kid', '불놀이꾼', [['혼불콩', 35], ['횃불여우', 36]]]], hm: 'waterfall', tm: 'flame', quote: ['뜨겁게 타오르지 않으면 승부가 아니지! 덤벼라!', '크하하! 네 열정에 내 불이 꺼졌군! 불꽃 인장이다!'] },
  { n: 7, type: '얼음', leader: '서리', look: 'g7', badge: '눈꽃 인장', team: [['서리요정', 41], ['털멧돼지', 41], ['설원이리', 42], ['얼음물개', 42], ['서리두루미', 44]], trainers: [['lass', '스케이터 미끄럼', [['눈송이', 38], ['눈새콩', 39], ['물개콩', 39]]], ['hiker', '설산 안내인', [['눈멧콩', 39], ['고드름니', 40]]]], tm: 'icebeam', quote: ['차가움 속에도 아름다움이 있어요. 얼어붙지 않도록 조심하세요.', '봄이 오는 것처럼 녹아 버렸네요. 눈꽃 인장입니다.'] },
  { n: 8, type: '용', leader: '용천', look: 'g8', badge: '용오름 인장', team: [['사막룡', 45], ['목도리도마', 45], ['이무기', 46], ['뼈도마뱀', 46], ['비늘용', 48]], trainers: [['monk', '용의 수행자', [['도마콩', 42], ['모래상어', 43], ['물뱀콩', 43]]], ['monk', '용의 사범', [['목도리도마', 44], ['화석알', 44]]]], tm: 'dragonpulse', quote: ['용은 하늘이 허락한 자만 다룰 수 있다. 너는 어떠냐!', '…인정하마. 너야말로 용오름 인장의 주인이다.'] },
];

function gym(town: Builder, x: number, y: number, g: Gym) {
  door(town, x, y, 5, 'g', (back) => {
    const id = `${town.def.id}-g`;
    const r = room(id, `${town.def.name} 체육관`, 11, 14, back, 'kgym');
    const b = r.b;
    // 석상 사이로 가운데 길
    for (let yy = 4; yy <= 10; yy += 3) {
      b.set(2, yy, 'u');
      b.set(8, yy, 'u');
    }
    b.rect(5, 2, 1, 1, 'a');
    g.trainers.forEach(([look, name, tm], i) => {
      b.npc(trainer(i % 2 ? 7 : 3, 9 - i * 3, look, name, i % 2 ? 'left' : 'right', { name, team: team(...tm), prize: 60 * tm[tm.length - 1][1], before: '관장님께 가려면 나부터 이겨야 해!', after: '관장님은 정말 세. 각오해!', sight: 3 }));
    });
    const ld = g.n;
    b.npc({
      id: `leader${ld}`,
      x: 5,
      y: 2,
      look: g.look,
      name: `관장 ${g.leader}`,
      dir: 'down',
      trainer: { name: `관장 ${g.leader}`, team: team(...g.team), prize: 120 * g.team[g.team.length - 1][1], smart: 2, items: ld >= 3 ? ['goodherb'] : ['herb'], before: g.quote[0], after: g.quote[1], sight: 0, gym: ld },
      talk: (s) =>
        s.badges >= ld
          ? say(`관장 ${g.leader}`, g.quote[1].replace(/\. .*$/, '.'), '더 강해져서 다음 체육관에 도전해 봐!')
          : [],
    });
    b.npc(npc(4, 12, 'aide', '체육관 안내원', (s) => (s.badges >= ld ? say('안내원', '축하해! 정말 멋진 승부였어!') : say('안내원', `여기는 ${g.type} 속성 체육관이야. ${g.type}에 강한 깨비를 데려가면 좋아!`, '체육관 트레이너는 눈이 마주치면 바로 승부를 걸어 와.')), { dir: 'right' }));
    return r;
  });
}
/** 관장을 이긴 뒤 받는 것 */
export function gymReward(n: number): Step[] {
  const g = GYMS[n - 1];
  const out: Step[] = [{ badge: n }, { who: '', say: `${g.badge}을(를) 받았다!` }, { tm: g.tm }, { who: `관장 ${g.leader}`, say: `이 기술 부적도 가져가. 「${MOVES[g.tm].name}」이(가) 들어 있어.` }];
  if (g.hm) out.push({ hm: g.hm }, { who: `관장 ${g.leader}`, say: `그리고 비전 부적이야. 인장이 있으면 필드에서도 쓸 수 있어.` });
  return out;
}
export const GYM_INFO = GYMS.map((g) => ({ n: g.n, leader: g.leader, badge: g.badge, type: g.type }));

// ---------------- 라이벌 팀 ----------------
/** 내가 고른 깨비에 강한 깨비를 라이벌이 가져간다 */
export const rivalOf = (mine: number) => (mine === STARTERS[0] ? STARTERS[1] : mine === STARTERS[1] ? STARTERS[2] : STARTERS[0]);
export function rivalTeam(s: GameState, stage: 1 | 2 | 3 | 4): [number, number][] {
  const st = s.rival ?? STARTERS[1];
  if (stage === 1) return [[st, 5]];
  if (stage === 2) return [[N('바람까치'), 14], [N('그림자콩'), 15], [st + 1, 17]];
  if (stage === 3) return [[N('폭풍매'), 31], [N('도깨불'), 32], [N('나사콩'), 30], [st + 1, 34]];
  return [[N('폭풍매'), 48], [N('어둠망령'), 49], [N('전자석탑'), 48], [N('비늘용'), 50], [st + 2, 52]];
}

// =================================================================
// 새싹마을 · 집 · 연구소
// =================================================================
const saessak = B('saessak', '새싹마을', 20, 16, 'town', 'ktown');
saessak.border('T').scatter(',', 14, 3);
saessak.path([[9, 15], [9, 9], [3, 9], [3, 7]]).path([[9, 9], [15, 9], [15, 7]]).path([[9, 9], [9, 0]], '=', 2);
saessak.def.fly = [9, 10];
saessak.def.heal = [9, 8];
const homeRoom = room('home', '우리 집', 9, 7, ['saessak', 4, 7]);
saessak.house(2, 4, 4, 'R', { to: 'home', tx: homeRoom.entry[0], ty: homeRoom.entry[1] });
homeRoom.b.set(1, 2, 'k').set(7, 2, 'k');
homeRoom.b.rect(5, 3, 2, 1, 'c');
homeRoom.b.npc(
  npc(3, 3, 'mom', '엄마', (s) =>
    !s.party.length
      ? say('엄마', '일어났니? 은행나무 박사님이 찾으셨어. 연구소는 마을 오른쪽 위 큰 건물이란다.', '오늘부터 너도 깨비 트레이너구나. 힘들면 언제든 집에 와서 쉬렴.')
      : [{ who: '엄마', say: '어머, 깨비들이 지쳐 보이는구나. 푹 쉬고 가렴.' }, { heal: true }, { who: '엄마', say: '모두 기운을 차렸단다! 몸조심하렴.' }],
  ),
);
const lab = room('lab', '은행나무 연구소', 13, 10, ['saessak', 15, 7]);
saessak.house(13, 4, 5, 'R', { to: 'lab', tx: lab.entry[0], ty: lab.entry[1] });
lab.b.rect(1, 2, 3, 1, 'k').rect(9, 2, 3, 1, 'k').rect(5, 4, 3, 1, 'c');
lab.b.npc(
  npc(6, 3, 'prof', '은행나무 박사', (s) =>
    !s.party.length
      ? [
          { who: '은행나무 박사', say: `오, ${s.name}! 기다리고 있었단다. 나는 깨비를 연구하는 은행나무 박사야.` },
          { who: '은행나무 박사', say: '깨비는 사람과 함께 사는 정령이지. 이 한빛 군도엔 수백 종의 깨비가 살고 있단다.' },
          { who: '은행나무 박사', say: '탁자 위 호리병 세 개 중 하나를 골라 보렴. 그 깨비가 너의 첫 친구가 될 거야.' },
        ]
      : !s.flags.dex
        ? [
            { who: '은행나무 박사', say: '좋은 선택이구나! 이건 「깨비 도감」. 만난 깨비와 잡은 깨비가 저절로 기록된단다.' },
            { set: 'dex' },
            { give: 'gourd', n: 5 },
            { who: '', say: '깨비 도감과 호리병 5개를 받았다!' },
            { who: '은행나무 박사', say: '수풀에서 야생 깨비를 만나면 약하게 만든 뒤 호리병을 던져 보렴. 도감을 가득 채워 주겠니?' },
            { who: '은행나무 박사', say: '그리고… 한빛 군도 어딘가에 숨은 전설의 깨비 셋이 있다는 이야기가 있단다. 언젠가 만나 보렴.' },
          ]
        : s.flags.champion
          ? [
              { who: '은행나무 박사', say: `깨비 왕이 되다니! 도감은 ${s.caught.length}종이구나.` },
              ...(!s.flags.extraStarters ? ([{ set: 'extraStarters' }, { giveMon: STARTERS.find((x) => x !== s.party[0]?.no && x !== s.rival) ?? 1, lv: 10 }, { who: '', say: '박사님이 남은 호리병 속 깨비를 맡겨 주었다!' }] as Step[]) : []),
            ]
          : say('은행나무 박사', `도감은 잘 채우고 있니? 지금 ${s.seen.length}종을 보고 ${s.caught.length}종을 잡았구나.`, s.caught.length >= 30 ? '훌륭해! 이 기세로 계속하렴.' : '수풀과 물가, 동굴, 밤과 낮에 따라 나오는 깨비가 다르단다.'),
    { dir: 'down' },
  ),
);
lab.b.npc(npc(5, 4, 'gourd', '탁자 위 호리병', (s) => (s.party.length ? say('', '탁자가 비어 있다.') : [{ starter: true }]), { hidden: () => false }));
lab.b.npc(npc(10, 6, 'aide', '연구원', () => say('연구원', '깨비마다 속성이 있어. 불은 풀에, 물은 불에, 풀은 물에 강하지!', '메뉴의 「깨비」에서 기술의 속성과 위력을 볼 수 있어.'), { turn: true }));
saessak.npc(npc(6, 11, 'girl', '꼬마', () => say('꼬마', '수풀에 들어가면 깨비가 튀어나와! 깨비가 없으면 들어가면 안 돼!')));
saessak.npc(npc(9, 2, 'aide', '연구원', (s) => (s.party.length ? say('연구원', '조심해서 다녀와!') : say('연구원', '깨비 없이 마을 밖은 위험해! 박사님 연구소부터 들러!')), { hidden: (s) => s.party.length > 0, dir: 'down' }));
saessak.sign(7, 9, '새싹마을 — 새싹이 돋는 작은 마을');
saessak.npc({
  id: 'rival1',
  x: 9,
  y: 1,
  look: 'rival',
  name: '차돌',
  dir: 'down',
  hidden: (s) => !s.flags.dex || !!s.flags[`t:saessak:rival1`],
  trainer: { name: '라이벌 차돌', team: [], prize: 300, smart: 0, sight: 6, before: '어이! 박사님 연구소에서 나도 하나 받았지. 실력 좀 볼까?', after: '쳇, 운이 좋았네! 다음엔 안 봐줘!', rival: true, soft: true },
});

// =================================================================
// 1번길 → 솔내마을
// =================================================================
const r1 = B('r1', '1번길', 18, 28, 'route', 'kroute');
r1.border('T').path([[9, 27], [9, 20], [4, 20], [4, 10], [12, 10], [12, 0]], '=', 2);
r1.blob(13, 22, 3, 3, '"').blob(7, 14, 3, 2.5, '"').blob(14, 6, 2.5, 3, '"').rect(1, 17, 7, 1, '<').set(4, 17, '=').set(5, 17, '=');
r1.scatter('T', 18, 11).scatter(',', 10, 5);
r1.sign(11, 25, '1번길 ↑ 솔내마을   ↓ 새싹마을');
r1.def.land = [E('털뭉치', 2, 4, 30), E('참새콩', 2, 4, 30, 'morning'), E('참새콩', 2, 4, 20, 'day'), E('다람콩', 2, 3, 20), E('애벌콩', 2, 3, 15, 'morning'), E('독쥐', 3, 4, 25, 'night'), E('까마귀콩', 3, 4, 15, 'night')];
r1.item(2, 3, 'herb').item(16, 13, 'gourd', 2);
r1.npc(trainer(6, 6, 'kid', '반바지 꼬마 철이', 'right', { name: '반바지 꼬마 철이', team: team(['다람콩', 4], ['털뭉치', 4]), prize: 80, before: '눈이 마주쳤으니 승부다!', after: '으앙, 내 다람콩이…' }));
link(saessak, 'north', 9, r1, 9);

const solnae = B('solnae', '솔내마을', 22, 16, 'town', 'ktown');
solnae.border('T').scatter(',', 10, 8);
solnae.path([[12, 15], [12, 8], [2, 8], [0, 8]], '=', 2).path([[12, 8], [12, 6]]);
solnae.def.fly = [12, 10];
center(solnae, 4, 3);
shop(solnae, 15, 3);
house(solnae, 15, 11, (b) => b.npc(npc(4, 3, 'old', '솔내 할아버지', (s) => (s.flags.giftRepel ? say('솔내 할아버지', '쑥향은 수풀이 귀찮을 때 쓰렴.') : [{ who: '솔내 할아버지', say: '여행을 떠나는구나. 이걸 가져가거라.' }, { give: 'repel', n: 3 }, { set: 'giftRepel' }, { who: '', say: '쑥향 3개를 받았다!' }]))));
solnae.sign(9, 9, '솔내마을 ← 2번길');
solnae.npc(npc(6, 11, 'lass', '아가씨', () => say('아가씨', '쉼터(파란 지붕)에서 깨비를 공짜로 쉬게 해 줘. 잡화점(노란 지붕)에선 호리병을 팔아!'), { turn: true }));
link(r1, 'north', 12, solnae, 12);

// =================================================================
// 2번길 → 여울숲 → 이끼마을
// =================================================================
const r2 = B('r2', '2번길', 30, 14, 'route', 'kroute');
r2.border('T').path([[29, 8], [20, 8], [20, 4], [8, 4], [8, 8], [0, 8]], '=', 2);
r2.blob(15, 9, 4, 2.5, '"').blob(25, 4, 2.5, 2, '"').blob(4, 4, 2.5, 2, '"');
r2.scatter('T', 22, 21);
r2.def.land = [E('참새콩', 4, 6, 20), E('다람콩', 4, 6, 15), E('침벌레', 4, 6, 15), E('찌릿쥐', 5, 6, 5), E('꽃봉오리', 5, 7, 15), E('토끼콩', 5, 6, 10, 'night'), E('까마귀콩', 5, 6, 10, 'night'), E('보라젤리', 5, 6, 6)];
r2.npc(trainer(14, 5, 'bug', '곤충채집가 매미', 'down', { name: '곤충채집가 매미', team: team(['애벌콩', 5], ['침벌레', 5], ['애벌콩', 6]), prize: 90, before: '내 벌레 깨비들 좀 봐!', after: '벌레는 강하다구!' }));
r2.npc(trainer(23, 9, 'lass', '소녀 은비', 'up', { name: '소녀 은비', team: team(['꽃봉오리', 7]), prize: 120, before: '꽃 깨비랑 같이 놀래?', after: '꽃잎이 다 떨어졌어…' }));
r2.item(27, 2, 'antidote');
link(solnae, 'west', 8, r2, 8);

const forest = B('forest', '여울숲', 32, 24, 'forest', 'kroute', '"');
forest.border('T', 2);
// 미로 같은 숲길
forest.path([[31, 12], [25, 12], [25, 5], [17, 5], [17, 18], [9, 18], [9, 8], [3, 8], [3, 3], [0, 3]], '=', 2);
forest.rect(19, 8, 4, 8, 'T').rect(11, 9, 4, 7, 'T').rect(4, 12, 3, 10, 'T').rect(26, 15, 4, 6, 'T');
forest.scatter('T', 50, 77, '=');
forest.def.land = [E('애벌콩', 6, 8, 15), E('고치둥', 7, 9, 10), E('침벌레', 6, 8, 15), E('독침벌', 8, 10, 6), E('이끼벌레', 7, 9, 10), E('도토리콩', 7, 9, 10), E('민들레솜', 6, 8, 10), E('죽순콩', 8, 9, 3), E('매미허물', 7, 9, 15, 'night'), E('들고양', 7, 9, 8, 'night')];
forest.def.rate = 0.09;
forest.npc(trainer(17, 10, 'bug', '곤충채집가 사슴벌레', 'down', { name: '곤충채집가 사슴벌레', team: team(['고치둥', 8], ['이끼벌레', 9]), prize: 130, before: '숲은 벌레들의 왕국이야!', after: '내 고치가…' }));
forest.npc(trainer(9, 12, 'bug', '곤충채집가 반딧', 'right', { name: '곤충채집가 반딧', team: team(['침벌레', 9], ['독침벌', 10]), prize: 150, before: '침 조심해!', after: '아얏!' }));
forest.item(28, 9, 'herb').item(5, 20, 'gourd', 3).tm(22, 18, 'headbutt');
forest.npc(npc(24, 13, 'old', '숲지기', () => say('숲지기', '이 숲은 길이 꼬불꼬불해. 수풀이 빽빽하니 깨비가 많이 나오지.', '밤에는 매미허물이 운단다.')));
link(r2, 'west', 3, forest, 12);

const ikki = B('ikki', '이끼마을', 24, 20, 'town', 'ktown');
ikki.border('T').scatter(',', 12, 13).blob(19, 15, 2.5, 2, '~');
ikki.path([[23, 3], [12, 3], [12, 16], [4, 16]], '=', 2).path([[12, 10], [4, 10]]).path([[12, 0], [12, 3]], '=', 2);
ikki.def.fly = [12, 12];
center(ikki, 3, 6);
shop(ikki, 16, 6);
gym(ikki, 10, 13, GYMS[0]);
ikki.set(12, 1, 't');
ikki.set(13, 1, 't');
ikki.sign(14, 11, '이끼마을 체육관 — 관장 솔잎 · 풀의 숲');
ikki.sign(10, 4, '↑ 3번길 (작은 나무가 길을 막고 있다)');
// 금빛탑
const towerB = B('tower1', '금빛탑 1층', 11, 11, 'tower', 'kcave', 'f');
towerB.rect(0, 0, 11, 1, 'x').rect(0, 0, 1, 11, 'x').rect(10, 0, 1, 11, 'x').rect(0, 10, 11, 1, 'x');
towerB.set(5, 10, 'a').warp(5, 11, 'ikki', 4, 16, 'down').set(5, 1, 'E');
ikki.rect(2, 13, 5, 2, 'g').rect(2, 15, 5, 1, 'H').set(4, 15, 'D').warp(4, 15, 'tower1', 5, 9, 'up', (s) => (s.badges >= 8 ? undefined : '금빛탑의 문은 굳게 닫혀 있다. 「여덟 인장을 모은 자만 오르라」고 적혀 있다.'));
ikki.sign(7, 14, '금빛탑 — 여덟 인장을 모은 자만 오르라');
link(forest, 'west', 3, ikki, 3);
const towerTop = B('tower3', '금빛탑 꼭대기', 11, 11, 'tower', 'kcave', 'f');
towerTop.rect(0, 0, 11, 1, 'x').rect(0, 0, 1, 11, 'x').rect(10, 0, 1, 11, 'x').rect(0, 10, 11, 1, 'x').set(5, 9, 'E');
towerB.warp(5, 1, 'tower3', 5, 8, 'up');
towerTop.warp(5, 10, 'tower1', 5, 2, 'down');
towerB.def.land = [E('방울콩', 38, 42, 20), E('풍경방울', 40, 44, 10), E('별가루', 38, 42, 12), E('괴무', 40, 44, 8), E('반짝이', 38, 40, 10)];
towerB.def.rate = 0.06;
towerB.rect(2, 3, 7, 5, '_');
towerB.npc(npc(8, 8, 'monk', '탑지기 스님', () => say('탑지기 스님', '꼭대기에는 금빛 날개를 가진 깨비가 내려앉는다지요.', '그 날개빛은 아침 해와 같다 합니다.')));
towerTop.npc({
  id: 'legend1',
  x: 5,
  y: 3,
  look: 'gourd',
  name: '???',
  hidden: (s) => !!s.flags.legend1,
  talk: () => [{ who: '', say: '눈부신 금빛 날개가 펼쳐졌다……!' }, { who: '금빛봉황', say: '끼오오오—!' }, { wild: N('금빛봉황'), lv: 60, flag: 'legend1' }],
});

// =================================================================
// 3번길 → 번개항구
// =================================================================
const r3 = B('r3', '3번길', 20, 30, 'route', 'kroute');
r3.border('T').path([[12, 29], [12, 22], [5, 22], [5, 12], [14, 12], [14, 0]], '=', 2);
r3.blob(14, 25, 3, 2, '"').blob(9, 16, 2.5, 3, '"').blob(5, 5, 3, 3, '"').blob(16, 18, 2, 2, '"');
r3.rect(1, 9, 11, 1, '<').set(5, 9, '=').set(6, 9, '=');
r3.scatter('T', 20, 31);
r3.def.land = [E('두더콩', 10, 13, 15), E('주먹콩', 10, 12, 12), E('솜사탕양', 10, 12, 12), E('쇠똥구리', 11, 13, 10), E('가시콩', 10, 12, 8), E('들고양', 11, 13, 15, 'night'), E('반디콩', 11, 13, 15, 'night'), E('바람까치', 12, 13, 8)];
r3.npc(trainer(8, 20, 'hiker', '등산가 바위', 'down', { name: '등산가 바위', team: team(['두더콩', 12], ['조약돌이', 12]), prize: 200, before: '이 길은 내가 접수했다!', after: '산에서 다시 만나자고.' }));
r3.npc(trainer(10, 13, 'lass', '소녀 하늬', 'left', { name: '소녀 하늬', team: team(['솜사탕양', 13], ['토끼콩', 13]), prize: 220, before: '푹신푹신한 우리 애들이랑 겨뤄 볼래?', after: '털이 다 엉켰어…' }));
r3.npc({
  id: 'rival2',
  x: 14,
  y: 4,
  look: 'rival',
  name: '차돌',
  dir: 'down',
  hidden: (s) => s.badges < 1 || !!s.flags['t:r3:rival2'],
  trainer: { name: '라이벌 차돌', team: [], prize: 900, smart: 1, sight: 5, before: '또 너냐! 인장 하나 땄다고 우쭐하지 마!', after: '…다음엔 진짜 안 져. 두고 봐!', rival: true },
});
r3.item(2, 14, 'goodherb').tm(17, 27, 'dig');
link(ikki, 'north', 12, r3, 12);

const beongae = B('beongae', '번개항구', 26, 20, 'town', 'ktown');
beongae.border('T').rect(1, 0, 24, 7, '~').rect(9, 4, 8, 3, '=');
beongae.path([[14, 19], [14, 7]], '=', 2).path([[3, 11], [25, 11]]);
beongae.def.fly = [14, 17];
center(beongae, 3, 13);
shop(beongae, 18, 13);
gym(beongae, 4, 7, GYMS[1]);
beongae.sign(16, 12, '번개항구 — 바다 건너 물안개시로 가는 배는 지금 쉰다');
beongae.def.water = [E('송사리콩', 10, 15, 30), E('해파리콩', 12, 16, 20), E('물개콩', 14, 16, 10), E('미꾸리', 12, 15, 10)];
// 흑연단 창고
const ware = room('ware', '번개항구 창고', 12, 9, ['beongae', 21, 10]);
beongae.rect(19, 7, 5, 2, 'g').rect(19, 9, 5, 1, 'H').set(21, 9, 'D').warp(21, 9, 'ware', 6, 7, 'up');
ware.b.rect(1, 2, 2, 3, 'k').rect(9, 2, 2, 3, 'k');
ware.b.npc(trainer(4, 5, 'grunt', '흑연단 졸개', 'right', { name: '흑연단 졸개', team: team(['독쥐', 15], ['연기콩', 15]), prize: 300, before: '흑연단 일에 끼어들지 마라!', after: '으윽, 간부님께 혼나겠다…' }));
ware.b.npc(trainer(8, 4, 'grunt', '흑연단 졸개', 'left', { name: '흑연단 졸개', team: team(['하수구쥐', 17]), prize: 340, before: '여긴 잡아 온 깨비 창고다. 꺼져!', after: '창고 열쇠는 간부님이 갖고 있다고!' }));
ware.b.npc({
  id: 'admin1',
  x: 6,
  y: 2,
  look: 'boss',
  name: '흑연단 간부 먹물',
  dir: 'down',
  hidden: (s) => !!s.flags.ware,
  trainer: { name: '흑연단 간부 먹물', team: team(['하수구쥐', 18], ['독안개', 18], ['까마귀콩', 19]), prize: 800, smart: 1, sight: 3, before: '우리는 흑연단. 깨비를 팔고, 전설의 깨비를 깨워 군도를 손에 넣을 거다!', after: '이번엔 물러나 주지. 하지만 물안개시에서 보자고!' },
  talk: () => [{ set: 'ware' }, { who: '', say: '흑연단이 달아났다! 갇혀 있던 깨비들이 풀려났다.' }],
});
beongae.npc(npc(23, 10, 'police', '경찰', (s) => (s.flags.ware ? say('경찰', '흑연단을 쫓아내 줬구나! 4번길로 가는 길을 열어 두었다.') : say('경찰', '창고에서 수상한 무리가 깨비를 빼돌리고 있다는데… 혼자 들어가긴 위험해.')), { dir: 'down' }));
beongae.npc({ id: 'gateGuard', x: 24, y: 11, look: 'police', name: '경찰', dir: 'left', hidden: (s) => !!s.flags.ware, talk: () => say('경찰', '이 앞 4번길은 지금 막혀 있다. 창고 쪽 소란부터 해결해야 해.') });
link(r3, 'north', 14, beongae, 14);

// =================================================================
// 4번길 → 어둠굴 → 바위골
// =================================================================
const r4 = B('r4', '4번길', 30, 14, 'route', 'kroute');
r4.border('T').path([[0, 9], [10, 9], [10, 4], [22, 4], [22, 8], [29, 8]], '=', 2);
r4.blob(16, 9, 4, 2, '"').blob(5, 4, 3, 2, '"').blob(26, 3, 2, 2, '"');
r4.scatter('T', 18, 41);
r4.def.land = [E('찌릿쥐', 13, 16, 15), E('번개새콩', 14, 16, 12), E('나사콩', 14, 16, 12), E('보라젤리', 13, 15, 12), E('줄무늬람', 15, 16, 8), E('까마귀콩', 14, 16, 12, 'night')];
r4.npc(trainer(13, 5, 'kid', '전기 소년 짜릿', 'down', { name: '전기 소년 짜릿', team: team(['찌릿쥐', 15], ['나사콩', 16]), prize: 320, before: '번개 맛 좀 볼래?', after: '방전됐어…' }));
r4.npc(trainer(24, 9, 'hiker', '등산가 덕배', 'left', { name: '등산가 덕배', team: team(['조약돌이', 15], ['두더콩', 16], ['조약돌이', 16]), prize: 340, before: '동굴 앞에서 몸 좀 풀자!', after: '빛내기가 있으면 동굴이 훨씬 밝지.' }));
r4.item(8, 11, 'awake');
link(beongae, 'east', 11, r4, 8);

const cave1 = B('cave1', '어둠굴', 30, 22, 'cave', 'kcave', '#');
cave1.path([[0, 8], [6, 8], [6, 16], [15, 16], [15, 5], [24, 5], [24, 14], [29, 14]], '_', 2);
cave1.blob(10, 12, 3, 2, '_').blob(20, 10, 3, 3, '_').blob(26, 18, 2, 2, '_').blob(3, 16, 2, 3, '_');
cave1.def.dark = true;
cave1.def.land = [E('조약돌이', 14, 17, 25), E('두더콩', 15, 17, 15), E('그림자콩', 15, 18, 12), E('연기콩', 15, 17, 12), E('동전콩', 16, 17, 8), E('화석벌레', 17, 17, 4), E('철갑콩', 16, 17, 3), E('그림자콩', 16, 18, 20, 'night')];
cave1.npc(trainer(15, 9, 'hiker', '광부 동굴', 'down', { name: '광부 동굴', team: team(['바위둥이', 18], ['굴파두더', 18]), prize: 400, before: '어두운 데서 뭐 하냐!', after: '앞이 안 보이니 이길 수가 있나.' }));
cave1.item(3, 18, 'revive').item(26, 19, 'celadon', 3).tm(21, 8, 'quake');
link(r4, 'east', 8, cave1, 8);

const bawi = B('bawi', '바위골', 24, 18, 'town', 'ktown', '.');
bawi.border('#').rect(1, 1, 22, 2, '#').scatter('#', 10, 19, '=DHRrygS');
bawi.path([[0, 14], [12, 14], [12, 6], [23, 6]], '=', 2);
bawi.def.fly = [12, 12];
center(bawi, 3, 8);
shop(bawi, 16, 9);
gym(bawi, 9, 2, GYMS[2]);
bawi.sign(15, 7, '바위골 → 5번길 (큰 돌 조심)');
bawi.npc(npc(6, 13, 'miner', '광부', () => say('광부', '이 동네 바위들은 장사의힘으로 밀 수 있지. 관장님한테 이기면 비전 부적을 주실 거야.'), { turn: true }));
link(cave1, 'east', 14, bawi, 14);

// =================================================================
// 5번길 (큰 돌) → 물안개시
// =================================================================
const r5 = B('r5', '5번길', 32, 16, 'route', 'kroute');
r5.border('T').path([[0, 6], [9, 6], [9, 11], [24, 11], [24, 6], [31, 6]], '=', 2);
r5.rect(14, 1, 3, 9, '#').rect(14, 13, 3, 2, '#').set(15, 11, 'O').set(15, 12, 'O');
r5.blob(5, 11, 3, 2, '"').blob(21, 3, 3, 2, '"').blob(28, 11, 2, 2, '"');
r5.scatter('T', 14, 51);
r5.def.land = [E('솔개콩', 18, 21, 15), E('줄무늬람', 19, 21, 10), E('명상콩', 19, 21, 10), E('쇠주먹', 19, 21, 8), E('아기반달', 18, 20, 10), E('토끼콩', 18, 20, 10), E('꿈꾸리', 19, 21, 10), E('가시콩', 18, 20, 8), E('반짝이', 19, 21, 8, 'night'), E('죽순콩', 19, 20, 5)];
r5.npc(trainer(6, 5, 'monk', '수도승 고요', 'down', { name: '수도승 고요', team: team(['명상콩', 20], ['꿈꾸리', 21]), prize: 420, before: '마음을 비우고 승부하세.', after: '나무아미… 졌구려.' }));
r5.npc(trainer(21, 12, 'kid', '태권 소년 돌주먹', 'left', { name: '태권 소년 돌주먹', team: team(['주먹콩', 21], ['쇠주먹', 21], ['아기반달', 22]), prize: 460, before: '얍! 내 주먹을 받아라!', after: '사부님께 혼나겠다!' }));
r5.item(29, 2, 'ether').tm(3, 13, 'bulk');
link(bawi, 'east', 6, r5, 6);

const mul = B('mul', '물안개시', 28, 22, 'town', 'ktown');
mul.border('T').rect(0, 16, 28, 6, '~').rect(0, 16, 1, 6, 'T').rect(27, 16, 1, 6, 'T');
mul.path([[0, 6], [26, 6]], '=', 2).path([[14, 6], [14, 15]], '=', 2).path([[4, 12], [24, 12]]);
mul.def.fly = [14, 9];
center(mul, 3, 2);
shop(mul, 20, 2, ['candy']);
gym(mul, 10, 8, GYMS[3]);
mul.def.water = [E('은빛잉어', 22, 26, 20), E('해파리콩', 22, 25, 15), E('독해파리', 24, 26, 10), E('조개콩', 22, 25, 15), E('찌릿장어', 24, 25, 8), E('물뱀콩', 24, 25, 3)];
// 기술 부적 상점
house(
  mul,
  3,
  13,
  (b) =>
    b.npc(
      npc(4, 3, 'clerk', '부적 가게', (s) => [
        { who: '부적 가게', say: '기술 부적은 몇 번이고 쓸 수 있는 귀한 물건! 하나에 3000냥.' },
        { shop: ['tm:swords', 'tm:nap', 'tm:sludge', 'tm:toxic', 'tm:airslash', 'tm:calm', 'tm:psychic', 'tm:crunch', ...(s.badges >= 6 ? ['tm:thunder', 'tm:blizzard', 'tm:inferno', 'tm:flashcannon'] : [])] },
      ]),
    ),
  '부적 가게',
);
// 흑연단 아지트
const hide = room('hideout', '흑연단 아지트', 15, 12, ['mul', 22, 16]);
mul.rect(20, 13, 5, 2, 'g').rect(20, 15, 5, 1, 'H').set(22, 15, 'D').warp(22, 15, 'hideout', 7, 10, 'up', (s) => (s.badges >= 4 ? undefined : '흑연단 졸개: 여긴 들어올 수 없다! …물결 인장도 없는 꼬마는 꺼져!'));
mul.set(22, 16, '=');
mul.set(21, 16, '=');
mul.set(23, 16, '=');
hide.b.rect(3, 4, 9, 1, 'x').set(7, 4, 'f').rect(3, 7, 4, 1, 'k').rect(9, 7, 3, 1, 'k');
hide.b.npc(trainer(7, 6, 'grunt', '흑연단 졸개', 'down', { name: '흑연단 졸개', team: team(['하수구쥐', 27], ['독안개', 27]), prize: 600, before: '아지트에 쳐들어오다니!', after: '두목님께는 못 이길걸!' }));
hide.b.npc(trainer(3, 2, 'grunt', '흑연단 졸개', 'right', { name: '흑연단 졸개', team: team(['밤까마귀', 28], ['그림자냥', 28]), prize: 640, before: '두목님의 계획을 방해하지 마!', after: '…', sight: 3 }));
hide.b.npc(trainer(11, 2, 'boss', '흑연단 간부 먹물', 'left', { name: '흑연단 간부 먹물', team: team(['하수구쥐', 29], ['독안개', 29], ['밤까마귀', 30]), prize: 1200, before: '또 너냐! 이번엔 안 봐준다!', after: '두, 두목님…!', sight: 3 }));
hide.b.npc({
  id: 'gangboss',
  x: 7,
  y: 2,
  look: 'boss',
  name: '흑연단 두목 흑연',
  dir: 'down',
  hidden: (s) => !!s.flags.gang,
  trainer: { name: '흑연단 두목 흑연', team: team(['독두목쥐', 32], ['괴무', 32], ['까마귀두목', 33], ['그림자냥', 32]), prize: 3000, smart: 2, items: ['goodherb', 'goodherb'], sight: 0, before: '전설의 깨비 셋의 힘이면 이 군도는 우리 것이다. 꼬마 하나가 막을 수 있을 것 같으냐!', after: '…흑연단은 오늘로 해산이다. 이 금빛 호리병은 네가 가져라. 우리에겐 과분했던 물건이다.' },
  talk: () => [{ set: 'gang' }, { give: 'golden' }, { who: '', say: '금빛 호리병을 받았다! 어떤 깨비든 반드시 잡을 수 있다.' }],
});
mul.npc({ id: 'boatGrunt', x: 14, y: 15, look: 'grunt', name: '흑연단 졸개', dir: 'up', hidden: (s) => !!s.flags.gang, talk: () => say('흑연단 졸개', '이 앞 바다는 흑연단이 막았다! 지나가고 싶으면 두목님을 이겨 보시지!') });
mul.npc({
  id: 'rival3',
  x: 14,
  y: 7,
  look: 'rival',
  name: '차돌',
  dir: 'down',
  hidden: (s) => s.badges < 4 || !!s.flags['t:mul:rival3'],
  trainer: { name: '라이벌 차돌', team: [], prize: 2000, smart: 2, sight: 3, before: '흑연단 놈들이 아지트에 숨어 있대. 그 전에 나랑 한판 붙자!', after: '…너 정말 강해졌구나. 흑연단은 네게 맡길게.', rival: true },
});
mul.sign(16, 9, '물안개시 — 안개 낀 바다 도시');
link(r5, 'east', 6, mul, 6);

// =================================================================
// 바닷길 6 → 그믐마을 · 그믐숲
// =================================================================
const sea6 = B('sea6', '6번 바닷길', 30, 26, 'route', 'ksea', '~');
sea6.border('T').blob(8, 8, 3, 2, 's').blob(22, 18, 3, 2.5, 's').blob(22, 18, 1.5, 1, '"');
sea6.def.water = [E('은빛잉어', 24, 28, 20), E('독해파리', 25, 28, 15), E('조개콩', 24, 27, 15), E('찌릿장어', 25, 28, 10), E('연잎동동', 24, 27, 12), E('물뱀콩', 26, 28, 4)];
sea6.def.land = [E('별가루', 25, 27, 10), E('불새콩', 25, 27, 10)];
sea6.npc(trainer(8, 8, 'swimmer', '수영선수 물보라', 'down', { name: '수영선수 물보라', team: team(['은빛잉어', 26], ['물개콩', 27]), prize: 540, before: '바다는 내 무대야!', after: '물 먹었다…', sight: 3 }));
sea6.npc(trainer(15, 14, 'swimmer', '수영선수 파도', 'right', { name: '수영선수 파도', team: team(['해파리콩', 26], ['독해파리', 28]), prize: 560, before: '물속에서 겨뤄 보자!', after: '쥐났다!', sight: 3 }));
sea6.item(23, 17, 'ginseng');
link(mul, 'south', 13, sea6, 13, 2, '~');

const geum = B('geum', '그믐마을', 24, 18, 'town', 'ktown');
geum.border('T').scatter('T', 8, 61).rect(0, 0, 24, 2, 'T');
geum.path([[12, 0], [12, 17]], '=', 2).path([[12, 8], [3, 8]], '=', 2).path([[12, 8], [20, 8], [20, 0]], '=', 2);
geum.def.fly = [12, 10];
center(geum, 3, 3);
shop(geum, 15, 11);
gym(geum, 15, 2, GYMS[4]);
house(geum, 3, 11, (b) =>
  b.npc(
    npc(4, 3, 'granny', '방울 할머니', (s) =>
      s.flags.moonbell
        ? say('방울 할머니', '그믐밤에 숲 안쪽에서 방울을 울려 보렴. 달빛이 내려온단다.')
        : s.badges >= 5
          ? [{ who: '방울 할머니', say: '그믐 인장을 받았구나. 이걸 줄 때가 되었네.' }, { give: 'moonbell' }, { set: 'moonbell' }, { who: '', say: '달빛 방울을 받았다!' }, { who: '방울 할머니', say: '밤에 그믐숲 안쪽 빈터에 가 보렴. 아홉 꼬리의 달빛이 기다릴 게다.' }]
          : say('방울 할머니', '이 마을 체육관 관장을 이기면 다시 오렴. 줄 것이 있단다.'),
    ),
  ),
);
geum.sign(10, 15, '그믐마을 ↑ 그믐숲');
link(sea6, 'south', 12, geum, 12, 2);
geum.set(12, 17, '=').set(13, 17, '=');

const gforest = B('gforest', '그믐숲', 24, 22, 'forest', 'kcave', '"');
gforest.border('T', 2).path([[20, 21], [20, 14], [8, 14], [8, 6], [12, 6]], '=', 2).blob(12, 5, 3, 2, '.');
gforest.rect(13, 8, 5, 4, 'T').rect(3, 16, 4, 4, 'T');
gforest.scatter('T', 40, 91, '=.');
gforest.def.land = [E('그림자콩', 24, 27, 15), E('도깨불', 26, 28, 8), E('초롱콩', 24, 27, 15), E('혼불콩', 25, 27, 12), E('매미허물', 24, 26, 10), E('허물귀신', 27, 28, 5), E('까마귀콩', 25, 27, 10, 'night'), E('들고양', 24, 26, 10, 'day')];
gforest.npc({
  id: 'legend3',
  x: 12,
  y: 4,
  look: 'gourd',
  name: '???',
  hidden: (s) => !!s.flags.legend3,
  talk: (s) =>
    !s.flags.moonbell
      ? say('', '고요한 빈터. 달빛이 비치지만 아무도 없다.')
      : (s.forceTime ?? (new Date().getHours() >= 18 || new Date().getHours() < 4 ? 'night' : 'day')) !== 'night'
        ? say('', '달빛 방울이 조용하다. …밤이 되면 다시 와 보자.')
        : [{ who: '', say: '딸랑— 달빛 방울을 울렸다.' }, { who: '', say: '달빛이 모여 아홉 꼬리의 여우가 나타났다!' }, { wild: N('달빛구미'), lv: 55, flag: 'legend3' }],
});
link(geum, 'north', 20, gforest, 20);

// =================================================================
// 바닷길 7 → 불씨섬, 바닷길 8 → 눈꽃섬, 바닷길 9 → 용오름섬
// =================================================================
const sea7 = B('sea7', '7번 바닷길', 32, 16, 'route', 'ksea', '~');
sea7.border('T').blob(16, 7, 4, 3, 's').blob(16, 7, 2, 1.5, '"');
sea7.def.water = [E('연잎동동', 28, 31, 15), E('진주조개', 30, 31, 10), E('물개콩', 28, 30, 15), E('독해파리', 29, 31, 10)];
sea7.def.land = [E('불새콩', 28, 30, 15), E('숯덩이', 28, 30, 15), E('성냥개비', 28, 30, 15)];
sea7.npc(trainer(10, 4, 'swimmer', '수영선수 바다', 'down', { name: '수영선수 바다', team: team(['물개콩', 30], ['연잎동동', 31]), prize: 620, before: '섬까지 헤엄 경주할래?', after: '네가 더 빠르네!', sight: 3 }));
sea7.item(17, 6, 'porcelain', 2);
link(geum, 'west', 8, sea7, 8);
geum.set(0, 8, '~').set(0, 9, '~');

const bul = B('bul', '불씨섬', 24, 18, 'town', 'ktown', 's');
bul.border('~').rect(1, 1, 22, 16, 's').scatter('l', 10, 71, '=DHRrygS').blob(19, 4, 2, 2, '#');
bul.path([[23, 8], [12, 8], [12, 14], [4, 14]], '=', 2);
bul.def.fly = [12, 10];
center(bul, 3, 3);
shop(bul, 15, 11);
gym(bul, 10, 1, GYMS[5]);
bul.def.land = [E('숯덩이', 32, 35, 15), E('용암두꺼', 34, 35, 8), E('성냥개비', 32, 34, 15), E('횃불여우', 34, 35, 8), E('불새콩', 32, 34, 12), E('혼불콩', 33, 35, 12, 'night')];
bul.blob(5, 9, 2, 1.5, '"').blob(19, 13, 2.5, 1.5, '"');
link(sea7, 'west', 7, bul, 8, 2, '~');
bul.set(23, 8, '~').set(23, 9, '~');

const sea8 = B('sea8', '8번 바닷길', 30, 20, 'route', 'ksea', '~');
sea8.border('T').blob(15, 10, 4, 3, 'm').blob(15, 10, 2, 1.5, '"');
sea8.def.water = [E('얼음물개', 34, 36, 15), E('물개콩', 33, 35, 15), E('미꾸리', 33, 35, 10), E('진주조개', 34, 36, 10)];
sea8.def.land = [E('눈송이', 34, 36, 15), E('눈멧콩', 34, 36, 15), E('고드름니', 35, 36, 10), E('눈새콩', 35, 36, 15)];
sea8.npc(trainer(8, 6, 'swimmer', '겨울 수영인', 'right', { name: '겨울 수영인', team: team(['얼음물개', 36], ['물개콩', 35]), prize: 700, before: '추위쯤은 아무렇지 않아!', after: '에취!', sight: 3 }));
sea8.item(16, 9, 'revive', 2);
link(bul, 'north', 12, sea8, 14, 2, '~');
bul.set(12, 0, '~').set(13, 0, '~');

const nun = B('nun', '눈꽃섬', 24, 18, 'snow', 'ktown', 'm');
nun.border('~').rect(1, 1, 22, 16, 'm').scatter('T', 12, 81, '=DHRrygS');
nun.path([[14, 17], [14, 9], [4, 9]], '=', 2).path([[14, 9], [20, 9], [20, 0]], '=', 2);
nun.def.fly = [14, 11];
center(nun, 3, 4);
shop(nun, 16, 11);
gym(nun, 13, 2, GYMS[6]);
nun.blob(6, 14, 2.5, 1.5, '"');
nun.def.land = [E('서리요정', 38, 40, 15), E('털멧돼지', 38, 40, 15), E('설원이리', 38, 40, 10), E('서리두루미', 38, 40, 10), E('눈송이', 36, 38, 10)];
link(sea8, 'north', 14, nun, 14, 2, '~');
nun.set(14, 17, '~').set(15, 17, '~');

const sea9 = B('sea9', '9번 바닷길', 34, 22, 'route', 'ksea', '~');
sea9.border('T').blob(24, 6, 3, 2, '#').set(24, 7, 'Z').set(24, 8, 's').set(23, 8, 's').set(25, 8, 's');
sea9.def.water = [E('은빛잉어', 38, 42, 15), E('이무기', 40, 42, 4), E('대왕해파리', 40, 42, 10), E('번개장어', 40, 42, 12), E('얼음물개', 38, 40, 10)];
sea9.npc(trainer(12, 12, 'sailor', '뱃사람 고래', 'right', { name: '뱃사람 고래', team: team(['번개장어', 41], ['대왕해파리', 41], ['진주조개', 41]), prize: 820, before: '거친 바다에서 단련한 내 깨비들이다!', after: '파도가 거꾸로 쳤군.', sight: 4 }));
link(nun, 'north', 20, sea9, 16, 2, '~');
nun.set(20, 0, '~').set(21, 0, '~');

// 소용돌이동굴 (은빛해룡)
const whirl = B('whirl', '소용돌이동굴', 26, 24, 'cave', 'kcave', '#');
whirl.def.dark = true;
whirl.rect(2, 2, 22, 20, '~').blob(13, 20, 4, 2, '_').blob(13, 4, 5, 2.5, '_').rect(12, 6, 2, 4, 'w');
whirl.set(13, 21, 'E').warp(13, 22, 'sea9', 24, 8, 'down');
whirl.def.water = [E('이무기', 42, 45, 10), E('용궁소라', 42, 44, 10), E('대왕해파리', 42, 44, 10), E('연못신령', 43, 45, 5)];
whirl.npc({
  id: 'legend2',
  x: 13,
  y: 3,
  look: 'gourd',
  name: '???',
  hidden: (s) => !!s.flags.legend2,
  talk: () => [{ who: '', say: '물결이 은빛으로 빛나며 거대한 그림자가 떠올랐다……!' }, { who: '은빛해룡', say: '쿠오오오—!' }, { wild: N('은빛해룡'), lv: 60, flag: 'legend2' }],
});
sea9.warp(24, 7, 'whirl', 13, 20, 'up');

const yong = B('yong', '용오름섬', 26, 20, 'town', 'ktown', 's');
yong.border('~').rect(1, 1, 24, 18, 's').rect(1, 1, 24, 3, '#').scatter('T', 8, 101, '=DHRrygS#');
yong.path([[0, 12], [13, 12], [13, 4]], '=', 2).path([[13, 4], [13, 1]], '=', 2);
yong.def.fly = [13, 14];
center(yong, 3, 6);
shop(yong, 17, 13);
gym(yong, 16, 5, GYMS[7]);
yong.blob(6, 16, 3, 1.5, '"');
yong.def.land = [E('모래상어', 40, 42, 15), E('도마콩', 40, 42, 15), E('전갈콩', 40, 42, 15), E('모래전갈', 42, 43, 8), E('화석알', 41, 42, 4), E('아기용', 40, 41, 2)];
link(sea9, 'east', 11, yong, 12, 2, '~');
yong.set(0, 12, '~').set(0, 13, '~');
yong.sign(15, 11, '↑ 승리의 길 — 여덟 인장이 있는 자만 지나갈 것');

// =================================================================
// 승리의 길 → 금빛봉우리 리그
// =================================================================
const vic = B('vic', '승리의 길', 28, 26, 'cave', 'kcave', '#');
vic.path([[13, 25], [13, 19], [4, 19], [4, 11], [20, 11], [20, 3], [13, 3], [13, 0]], '_', 2);
vic.blob(9, 15, 3, 2, '_').blob(22, 16, 3, 3, '_').blob(8, 6, 3, 2, '_');
vic.set(11, 11, 'O').set(11, 12, 'O').rect(10, 9, 3, 2, '#').rect(10, 13, 3, 2, '#');
vic.rect(20, 7, 2, 2, 'w').rect(19, 9, 4, 2, '~');
vic.def.land = [E('산봉우리', 45, 48, 12), E('땅울림두더', 45, 47, 12), E('천하장사', 46, 47, 10), E('강철요새', 46, 47, 4), E('비늘용', 47, 48, 2), E('어둠망령', 45, 47, 10), E('철갑콩', 44, 45, 8), E('쇠비늘', 45, 47, 8)];
vic.def.water = [E('용문잉어', 45, 48, 8), E('은빛잉어', 44, 46, 20)];
vic.npc(trainer(6, 18, 'hiker', '산악왕 한라', 'right', { name: '산악왕 한라', team: team(['산봉우리', 47], ['땅울림두더', 46]), prize: 1500, before: '여기까지 온 걸 보니 제법이구나!', after: '정상에서 보자.' }));
vic.npc(trainer(18, 10, 'lass', '엘리트 하나', 'left', { name: '엘리트 하나', team: team(['은하공주', 47], ['구름양', 46], ['신령종', 47]), prize: 1600, before: '리그에 도전하려면 나를 넘어야 해!', after: '깨비 왕이 되렴.' }));
vic.npc({
  id: 'rival4',
  x: 13,
  y: 4,
  look: 'rival',
  name: '차돌',
  dir: 'down',
  hidden: (s) => !!s.flags['t:vic:rival4'],
  trainer: { name: '라이벌 차돌', team: [], prize: 5000, smart: 2, items: ['goodherb'], sight: 4, before: '역시 왔구나. 리그에 가기 전에, 진짜 마지막 승부다!', after: '…이제야 알겠어. 깨비랑 같이 강해지는 거구나. 가라, 깨비 왕한테!', rival: true },
});
vic.item(23, 17, 'ginseng').tm(9, 6, 'meteor');
yong.warp(13, 0, 'vic', 13, 24, 'up', (s) => (s.badges >= 8 ? undefined : '경비원: 여덟 인장이 없는 자는 승리의 길에 들어갈 수 없습니다!'));
yong.warp(14, 0, 'vic', 14, 24, 'up', (s) => (s.badges >= 8 ? undefined : '경비원: 여덟 인장이 없는 자는 승리의 길에 들어갈 수 없습니다!'));
vic.warp(13, 26, 'yong', 13, 1, 'down').warp(14, 26, 'yong', 14, 1, 'down');

const ELITES: { name: string; look: string; team: [string, number][]; before: string; after: string }[] = [
  { name: '사천왕 매화', look: 'elite', team: [['폭풍매', 50], ['태풍수리', 51], ['뇌조', 51], ['주홍봉새', 52], ['빙설학', 53]], before: '바람은 어디에나 있어. 피할 곳은 없단다.', after: '바람이 멎었네… 다음 방으로 가렴.' },
  { name: '사천왕 칡뫼', look: 'elite', team: [['독수렁', 51], ['여왕침벌', 51], ['독장미왕', 52], ['대왕해파리', 52], ['사막전갈왕', 54]], before: '독은 천천히 스며들지. 언제 쓰러질지 모른다고.', after: '해독이 빠르구나.' },
  { name: '사천왕 범바위', look: 'elite', team: [['천하장사', 52], ['강철무사', 53], ['도인', 53], ['장수곰', 53], ['무술판다', 55]], before: '말은 필요 없다. 주먹으로 대화하자!', after: '좋은 주먹이었다!' },
  { name: '사천왕 그림자', look: 'elite', team: [['밤표범', 53], ['까마귀두목', 54], ['가시마왕', 54], ['빙하늑대', 55], ['어둠망령', 56]], before: '어둠 속에서 길을 잃지 마라.', after: '…빛이 이겼군. 깨비 왕이 기다린다.' },
];
let prev: [string, number, number] = ['vic', 13, 1];
const league: Builder[] = [];
ELITES.forEach((el, i) => {
  const r = room(`league${i + 1}`, `금빛봉우리 ${i + 1}의 방`, 9, 9, prev, 'kgym');
  r.b.set(4, 1, 'a');
  r.b.npc({ id: `elite${i}`, x: 4, y: 3, look: el.look, name: el.name, dir: 'down', trainer: { name: el.name, team: team(...el.team), prize: 5000, smart: 2, items: ['ginseng'], sight: 0, before: el.before, after: el.after } });
  league.push(r.b);
  prev = [`league${i + 1}`, 4, 2];
});
const champRoom = room('league5', '깨비 왕의 방', 11, 10, prev, 'kgym');
champRoom.b.rect(3, 2, 5, 1, 'a');
champRoom.b.npc({
  id: 'champ',
  x: 5,
  y: 3,
  look: 'champ',
  name: '깨비 왕 해밀',
  dir: 'down',
  trainer: { name: '깨비 왕 해밀', team: team(['하늘용왕', 58], ['강철요새', 56], ['은하공주', 56], ['산봉우리', 56], ['청룡', 57], ['성기사', 57]), prize: 10000, smart: 2, items: ['ginseng', 'ginseng'], sight: 0, before: '여기까지 오다니 대단하구나. 나는 이 군도의 깨비 왕, 해밀. 너와 깨비들의 마음을 보여 줘!', after: '…졌어. 오늘부터 네가 새로운 깨비 왕이야!' },
  talk: () => [{ set: 'champion' }, { who: '깨비 왕 해밀', say: '이리 와. 명예의 전당에 너와 깨비들의 이름을 새기자.' }, { ending: true }],
});
// 리그 방 잇기: 각 방의 위쪽 문 → 다음 방 아래
const leagueGate = B('leagueGate', '금빛봉우리 입구', 13, 10, 'indoor', 'kcenter', 'f');
leagueGate.rect(0, 0, 13, 2, 'x').rect(0, 0, 1, 10, 'x').rect(12, 0, 1, 10, 'x').rect(0, 9, 13, 1, 'x').set(6, 9, 'a').set(6, 1, 'D');
leagueGate.warp(6, 10, 'vic', 13, 1, 'down').warp(6, 1, 'league1', 4, 7, 'up');
leagueGate.rect(1, 4, 4, 1, 'c').set(11, 2, 'p');
leagueGate.npc(npc(2, 3, 'nurse', '쉼터 누나', () => HEAL, { dir: 'down' }));
leagueGate.npc(npc(9, 5, 'aide', '리그 안내원', () => say('안내원', '이 문 너머로 사천왕 넷과 깨비 왕이 차례로 기다려. 한번 들어가면 이길 때까지 돌아올 수 없어!', '준비가 되었으면 위의 문으로 가!')));
vic.warp(13, -1, 'leagueGate', 6, 8, 'up').warp(14, -1, 'leagueGate', 6, 8, 'up');
leagueGate.def.heal = [6, 7];
league.forEach((b, i) => {
  b.set(4, 1, 'D');
  b.def.warps = b.def.warps.filter((w) => !(w.y === b.h)); // 뒤로 못 돌아감
  b.warp(4, 1, i < 3 ? `league${i + 2}` : 'league5', i < 3 ? 4 : 5, i < 3 ? 7 : 8, 'up', (s) => (s.flags[`t:league${i + 1}:elite${i}`] ? undefined : '앞을 가로막고 있다. 먼저 승부해야 한다!'));
});
champRoom.b.def.warps = [];

// ---------------- 완성 ----------------
for (const [id, b] of Object.entries(builders)) maps[id] = b.build();
export const MAPS = maps;
export const MAP_ORDER_FLY = ['saessak', 'solnae', 'ikki', 'beongae', 'bawi', 'mul', 'geum', 'bul', 'nun', 'yong'];
