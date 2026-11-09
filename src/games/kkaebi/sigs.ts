// 계열마다 정한 생김새 특징. species.ts의 LINES 순서(줄 번호)와 같다. 마지막 셋은 숨은 깨비.
// [기본, 3단계에서 더하거나 바꾸는 것]. 2단계부터 대부분의 특징이 나타나고, 3단계에서 화려해진다.
import type { Sig } from './sprite.ts';

type Row = [Sig, Sig?];

export const SIGS: Row[] = [
  // 처음 고르는 세 마리
  [{ ear: 'round', horn: 'antler', back: 'flowers', tail: 'leaf', mark: 'spot' }, { mane: 'leaf' }], // 콩닢 → 고목사슴
  [{ ear: 'pointy', tail: 'flame', crest: 'flame', mark: 'stripe', arm: 'fist' }, { mane: 'flame', acc: 'band' }], // 불씨쥐 → 용광범
  [{ ear: 'none', crest: 'fin', tail: 'none', mark: 'ring', face: 'whisker' }, { back: 'shell', arm: 'fist', acc: 'beads' }], // 물방울개구 → 폭포두꺼비
  // 들판·숲
  [{ ear: 'round', tail: 'fluffy', mark: 'belly' }, { back: 'cloud', crest: 'cloud', acc: 'bell' }], // 털뭉치 → 구름곰
  [{ crest: 'feather', tail: 'fan', back: 'fwing' }, { mark: 'zig' }], // 참새콩 → 폭풍매
  [{ ear: 'none', mark: 'spot', crest: 'feather' }, { back: 'iwing', acc: 'gem' }], // 애벌콩 → 비단나방
  [{ ear: 'none', horn: 'unicorn', tail: 'scorpion', mark: 'stripe' }, { back: 'iwing', horn: 'crown' }], // 침벌레 → 여왕침벌
  [{ ear: 'round', tail: 'fluffy', mark: 'stripe', face: 'fang' }, { acc: 'band' }], // 다람콩 → 대장다람
  [{ ear: 'long', tail: 'bolt', mark: 'zig', face: 'whisker' }, { mane: 'fur', crest: 'spikes' }], // 찌릿쥐 → 천둥족제비
  [{ crest: 'leaf', back: 'flowers', mark: 'spot' }, { horn: 'crown', back: 'vines' }], // 꽃봉오리 → 독장미왕
  [{ ear: 'none', mark: 'spot', crest: 'spikes' }, { face: 'fang', acc: 'gem' }], // 보라젤리 → 독수렁
  [{ ear: 'round', face: 'whisker', arm: 'claw', mark: 'belly' }, { horn: 'unicorn', back: 'spikes' }], // 두더콩 → 땅울림두더
  [{ mark: 'ring' }, { back: 'crystals', crest: 'crystal' }], // 조약돌이 → 산봉우리
  [{ ear: 'round', arm: 'fist', acc: 'band', mark: 'belly' }, { face: 'beard', mane: 'fur' }], // 주먹콩 → 천하장사
  [{ crest: 'fin', mark: 'spot', face: 'whisker' }, { horn: 'antler', mane: 'flame', face: 'beard' }], // 송사리콩 → 용문잉어
  [{ ear: 'none', face: 'whisker', mark: 'spot' }, { face: 'tusk', crest: 'crystal' }], // 물개콩 → 빙산바다사자
  [{ ear: 'long', mark: 'rune', tail: 'fluffy' }, { acc: 'hat', back: 'cloud' }], // 꿈꾸리 → 몽환술사
  [{ ear: 'pointy', horn: 'oni' }, { mane: 'flame', face: 'fang' }], // 그림자콩 → 어둠망령
  [{ ear: 'none', crest: 'cloud', mark: 'spot' }, { mane: 'cloud', face: 'fang' }], // 연기콩 → 괴무
  [{ ear: 'pointy', tail: 'flame', mark: 'stripe' }, { tail: 'fan', mane: 'flame', acc: 'bell' }], // 성냥개비 → 구미불꽃
  [{ ear: 'none', back: 'shell', tail: 'club' }, { back: 'crystals', face: 'tusk' }], // 숯덩이 → 화산거북
  [{ horn: 'unicorn', mark: 'rune' }, { crest: 'spikes', acc: 'gem' }], // 나사콩 → 전자석탑
  [{ crest: 'leaf', mark: 'ring' }, { horn: 'antler', face: 'beard', back: 'vines' }], // 도토리콩 → 천년목
  [{ crest: 'cloud', mark: 'spot' }, { mane: 'cloud', back: 'flowers' }], // 민들레솜 → 바람꽃
  [{ ear: 'none', arm: 'blade', crest: 'leaf' }, { back: 'iwing', face: 'mask' }], // 이끼벌레 → 사마귀검객
  [{ ear: 'none', horn: 'unicorn', back: 'shell' }, { horn: 'antler', mark: 'star' }], // 쇠똥구리 → 장수투구
  [{ ear: 'none', crest: 'crystal', mark: 'star' }, { mane: 'crystal', acc: 'scarf' }], // 눈송이 → 설녀
  [{ ear: 'round', face: 'tusk', mark: 'stripe' }, { mane: 'fur', back: 'crystals' }], // 눈멧콩 → 빙하멧돼지
  [{ ear: 'fin', horn: 'twin', back: 'bwing', tail: 'thin', mark: 'belly' }, { mane: 'fur', face: 'beard', acc: 'gem' }], // 아기용 → 하늘용왕
  [{ ear: 'fin', back: 'sail', tail: 'fin', arm: 'claw' }, { face: 'fang', back: 'spikes' }], // 모래상어 → 사구룡
  [{ crest: 'feather', tail: 'fan', face: 'beak' }, { acc: 'hat', mark: 'star' }], // 까마귀콩 → 까마귀두목
  [{ ear: 'pointy', tail: 'whip', mark: 'spot', face: 'whisker' }, { face: 'mask', mane: 'fur' }], // 들고양 → 밤표범
  [{ ear: 'round', back: 'plates', tail: 'club' }, { horn: 'twin', mark: 'rune' }], // 철갑콩 → 강철요새
  [{ ear: 'none', crest: 'crystal', mark: 'star' }, { horn: 'crown', back: 'fwing', acc: 'gem' }], // 반짝이 → 은하공주
  [{ ear: 'round', horn: 'goat', mark: 'belly' }, { mane: 'cloud', back: 'cloud', acc: 'bell' }], // 솜사탕양 → 꿈양털
  [{ ear: 'none', crest: 'leaf', mark: 'ring' }, { acc: 'hat', face: 'beard', back: 'flowers' }], // 연잎동동 → 연못신령
  [{ ear: 'none', crest: 'cloud', mark: 'spot' }, { crest: 'crystal', horn: 'crown' }], // 해파리콩 → 대왕해파리
  [{ back: 'shell', mark: 'ring' }, { crest: 'spikes', acc: 'gem' }], // 조개콩 → 용궁소라
  [{ ear: 'pointy', arm: 'fist', mark: 'rune' }, { horn: 'twin', acc: 'scarf' }], // 쇠주먹 → 강철무사
  [{ ear: 'round', acc: 'beads', mark: 'rune' }, { face: 'beard', acc: 'hat' }], // 명상콩 → 도인
  [{ crest: 'feather', tail: 'fan', face: 'beak' }, { mark: 'zig', mane: 'feather' }], // 솔개콩 → 태풍수리
  [{ crest: 'spikes', tail: 'bolt', mark: 'zig' }, { mane: 'feather', crest: 'flame' }], // 번개새콩 → 뇌조
  [{ face: 'whisker', mark: 'spot' }, { face: 'beard', horn: 'crown' }], // 미꾸리 → 늪지왕메기
  [{ ear: 'none', back: 'shell', mark: 'stripe' }, { back: 'spikes', horn: 'unicorn' }], // 화석벌레 → 고대투구
  [{ ear: 'none', back: 'spikes', tail: 'club', face: 'fang' }, { horn: 'twin', back: 'bwing' }], // 화석알 → 고대용
  [{ ear: 'round', tail: 'whip', face: 'whisker', mark: 'spot' }, { horn: 'crown', face: 'fang' }], // 독쥐 → 독두목쥐
  [{ ear: 'none', acc: 'bell', mark: 'ring' }, { crest: 'crystal', back: 'fwing' }], // 방울콩 → 신령종
  [{ ear: 'none', acc: 'lantern', horn: 'oni' }, { mane: 'flame', face: 'fang' }], // 초롱콩 → 저승초롱
  [{ ear: 'round', mark: 'belly', arm: 'claw' }, { mane: 'fur', face: 'fang', acc: 'band' }], // 아기반달 → 장수곰
  [{ ear: 'long', tail: 'fluffy', mark: 'star' }, { acc: 'scarf', crest: 'crystal' }], // 토끼콩 → 옥토끼
  [{ ear: 'round', mark: 'belly', face: 'mask' }, { acc: 'band', arm: 'fist', crest: 'leaf' }], // 죽순콩 → 무술판다
  [{ crest: 'spikes', mark: 'spot' }, { horn: 'crown', back: 'vines', face: 'fang' }], // 가시콩 → 가시마왕
  [{ crest: 'flame', tail: 'fan', back: 'fwing' }, { mane: 'flame', acc: 'gem' }], // 불새콩 → 주홍봉새
  [{ ear: 'none', crest: 'flame', horn: 'oni' }, { mane: 'flame', horn: 'goat', face: 'fang' }], // 혼불콩 → 염라불꽃
  [{ ear: 'fin', mark: 'zig', face: 'whisker' }, { horn: 'antler', crest: 'spikes' }], // 찌릿장어 → 뇌룡장어
  [{ crest: 'feather', tail: 'fan', face: 'beak' }, { crest: 'crystal', mane: 'crystal' }], // 눈새콩 → 빙설학
  [{ ear: 'none', mark: 'ring', acc: 'gem' }, { acc: 'hat', face: 'beard' }], // 동전콩 → 금전신선
  [{ ear: 'pointy', tail: 'fluffy', face: 'fang', mark: 'zig' }, { mane: 'crystal', back: 'crystals' }], // 고드름니 → 빙하늑대
  [{ ear: 'fin', face: 'whisker' }, { horn: 'antler', mane: 'cloud', face: 'beard' }], // 물뱀콩 → 청룡
  [{ ear: 'none', tail: 'scorpion', arm: 'claw' }, { back: 'plates', horn: 'crown' }], // 전갈콩 → 사막전갈왕
  [{ ear: 'pointy', mark: 'star', arm: 'blade' }, { back: 'fwing', acc: 'scarf', horn: 'unicorn' }], // 별가루 → 성기사
  [{ ear: 'none', mark: 'spot', crest: 'cloud' }, { back: 'iwing', horn: 'oni' }], // 매미허물 → 망령매미
  [{ ear: 'fin', tail: 'whip', mark: 'stripe' }, { back: 'sail', crest: 'spikes' }], // 도마콩 → 왕도마뱀
  [{ ear: 'none', tail: 'bolt', mark: 'star' }, { back: 'iwing', crest: 'crystal' }], // 반디콩 → 은하반디
  // 숨은 깨비
  [{ crest: 'flame', tail: 'fan', back: 'fwing', mane: 'flame', acc: 'gem', face: 'beak' }], // 금빛봉황
  [{ ear: 'fin', horn: 'antler', mane: 'cloud', face: 'beard', mark: 'ring' }], // 은빛해룡
  [{ ear: 'pointy', tail: 'fan', mane: 'cloud', acc: 'bell', mark: 'star', horn: 'crown' }], // 달빛구미
];

export function sigFor(line: number, stage: number): Sig {
  const row = SIGS[line] ?? [{}];
  return stage >= 3 ? { ...row[0], ...(row[1] ?? {}) } : row[0];
}
