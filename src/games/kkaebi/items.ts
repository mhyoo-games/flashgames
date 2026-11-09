// 도구
import type { Status } from './moves.ts';

export interface ItemDef {
  id: string;
  name: string;
  price: number;
  desc: string;
  kind: 'ball' | 'heal' | 'cure' | 'revive' | 'pp' | 'candy' | 'key' | 'repel';
  ball?: number;
  hp?: number;
  cures?: Status[] | 'all';
}

export const ITEMS: Record<string, ItemDef> = {
  gourd: { id: 'gourd', name: '호리병', price: 200, kind: 'ball', ball: 1, desc: '깨비를 빨아들여 잡는 병.' },
  celadon: { id: 'celadon', name: '청자 호리병', price: 600, kind: 'ball', ball: 1.5, desc: '호리병보다 잘 잡힌다.' },
  porcelain: { id: 'porcelain', name: '백자 호리병', price: 1200, kind: 'ball', ball: 2, desc: '아주 잘 잡히는 귀한 병.' },
  golden: { id: 'golden', name: '금빛 호리병', price: 0, kind: 'ball', ball: 255, desc: '어떤 깨비든 반드시 잡는 전설의 병.' },
  herb: { id: 'herb', name: '약초물', price: 300, kind: 'heal', hp: 20, desc: 'HP를 20 회복.' },
  goodherb: { id: 'goodherb', name: '진한약초물', price: 700, kind: 'heal', hp: 60, desc: 'HP를 60 회복.' },
  ginseng: { id: 'ginseng', name: '산삼물', price: 1500, kind: 'heal', hp: 200, desc: 'HP를 200 회복.' },
  antidote: { id: 'antidote', name: '해독초', price: 100, kind: 'cure', cures: ['psn'], desc: '독을 푼다.' },
  burnheal: { id: 'burnheal', name: '화상연고', price: 250, kind: 'cure', cures: ['brn'], desc: '화상을 낫게 한다.' },
  awake: { id: 'awake', name: '잠깨는종', price: 250, kind: 'cure', cures: ['slp'], desc: '잠을 깨운다.' },
  parheal: { id: 'parheal', name: '저림풀이', price: 200, kind: 'cure', cures: ['par'], desc: '마비를 푼다.' },
  thaw: { id: 'thaw', name: '해동떡', price: 250, kind: 'cure', cures: ['frz'], desc: '얼음을 녹인다.' },
  panacea: { id: 'panacea', name: '만병통치환', price: 600, kind: 'cure', cures: 'all', desc: '모든 상태 이상을 낫게 한다.' },
  revive: { id: 'revive', name: '기력의 깃털', price: 1500, kind: 'revive', desc: '기절한 깨비를 HP 절반으로 깨운다.' },
  ether: { id: 'ether', name: '기운차', price: 1200, kind: 'pp', desc: '기술 하나의 PP를 10 채운다.' },
  candy: { id: 'candy', name: '이상한 엿', price: 4800, kind: 'candy', desc: '먹으면 레벨이 1 오른다.' },
  repel: { id: 'repel', name: '쑥향', price: 350, kind: 'repel', desc: '100걸음 동안 약한 깨비가 다가오지 않는다.' },
  moonbell: { id: 'moonbell', name: '달빛 방울', price: 0, kind: 'key', desc: '맑은 소리가 나는 방울. 그믐밤 숲에서 울리면……' },
};
