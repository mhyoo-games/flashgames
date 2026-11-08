# 이 저장소에서 작업할 때 지킬 것

유민혁(minhyuk94)의 개인 프로젝트 "추억의 오락실". 사용자는 한국어로 대화합니다. 화면 글자도 한국어.

- 옛 웹 미니게임에서 영감을 받아 **새로 만든다**. 원작 게임의 이름·캐릭터·그림·맵·음악은 쓰지 않고, 다른 회사·게임 이름을 README·화면·이력서에 넣지 않는다.
- 게임마다 `src/games/<id>/engine.ts`(순수 TS 규칙, import에 `.ts` → Node로 테스트), `render.ts`(캔버스), `*Game.tsx`(화면). 목록은 `src/games/registry.ts`.
- 음악·효과음은 `src/core/music.ts`(작곡)·`src/core/audio.ts`(Web Audio 합성)로 코드에서 만든다. 음원 파일을 넣지 않는다.
- 새 규칙에는 `tests/`에 테스트를 더한다. CI(`ci.yml`)가 테스트·타입 검사·빌드·Docker를 확인한다.
- 게임을 추가하면 이력서 저장소(minhyuk94.github.io)의 `projects` 카드도 맞춘다. 소스 코드·저장소 링크는 넣지 않는다.
- 이 작업 환경에서는 npm 설치가 막혀 있을 수 있다. 로컬 미리보기는 `/opt/npm-tools`의 esbuild·react로 묶어서 확인한다.
