// 받침에 따라 조사 고르기: "불씨쥐을(를)" → "불씨쥐를"
const DIGIT_JONG = [true, true, false, true, false, false, true, true, true, false]; // 영 일 이 삼 사 오 육 칠 팔 구
const DIGIT_RIEUL = [false, true, false, false, false, false, false, true, true, false];

function finalOf(ch: string): { jong: boolean; rieul: boolean } | null {
  const c = ch.charCodeAt(0);
  if (c >= 0xac00 && c <= 0xd7a3) {
    const j = (c - 0xac00) % 28;
    return { jong: j !== 0, rieul: j === 8 };
  }
  if (ch >= '0' && ch <= '9') return { jong: DIGIT_JONG[+ch], rieul: DIGIT_RIEUL[+ch] };
  return null;
}

const PAIRS: Record<string, [string, string]> = { '을(를)': ['을', '를'], '이(가)': ['이', '가'], '은(는)': ['은', '는'], '과(와)': ['과', '와'], '아(야)': ['아', '야'], '이(야)': ['이야', '야'] };

export function josa(s: string): string {
  return s.replace(/(.)(을\(를\)|이\(가\)|은\(는\)|과\(와\)|아\(야\)|\(으\)로|이\(야\))/g, (all, ch: string, p: string) => {
    const f = finalOf(ch);
    if (!f) return all;
    if (p === '(으)로') return ch + (f.jong && !f.rieul ? '으로' : '로');
    const [a, b] = PAIRS[p];
    return ch + (f.jong ? a : b);
  });
}
