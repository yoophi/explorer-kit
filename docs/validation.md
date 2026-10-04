# 공통 저장소 검증 결과

아래는 초기 구성 당시의 기록입니다. 이후 앱 통합과 리뷰 검증은 [적용 결과](integration-report.md)에 기록합니다.

| 검사 | 결과 |
| --- | --- |
| pnpm typecheck | 9개 TypeScript 패키지와 소비 예제 통과 |
| pnpm test | Node 테스트 16개 통과 |
| pnpm build | 모든 public 컴포넌트 import를 포함한 브라우저 JS·Tailwind CSS bundle 생성 |
| cargo test --workspace | JSON 저장 3개, 파일 조회·스캔 3개 통과 |
| node --check packages/dev-tools/bin/tauri-dev.mjs | CLI 구문 검사 통과 |
| 원본 SHA256 비교 | provenance.json의 44건 일치 |

검증은 패키지 단위와 소비 예제 빌드 범위입니다. 원본 앱의 통합, 실제 브라우저·Tauri 렌더링, 개발 CLI의 실제 앱 실행은 별도 검증 대상입니다. Herdr agent tab 생성과 원본 앱 적용은 아직 수행하지 않았습니다.

코드 검토에서 스캔 terminal 이벤트 뒤의 늦은 item이 callback으로 전달될 수 있는 경계를 보완하고 회귀 테스트를 추가했습니다. React 복사본은 hooks 호출 위치, callback 의존성, radio label과 focus 상태, 앱 상태와의 분리 여부를 검토했습니다. UI 계열 차이를 보존했고 이미지 preview의 해제 책임을 API로 노출했습니다. 이 검토는 독립 에이전트 리뷰가 아닙니다.

## PROMPT 실행 재검증

PROMPT.md 실행 요청에 따라 `pnpm install --frozen-lockfile && pnpm check`를 실행했습니다. 종료 코드 0으로 완료했으며 TypeScript 검사, Node 테스트 16개, JS·CSS 통합 빌드, Rust 테스트 6개가 모두 통과했습니다. 공통 코드 수정 없이 검증을 마쳤습니다.

현재 세션의 `HERDR_ENV`가 설정되어 있지 않아 PROMPT.md의 2단계인 Herdr 탭 구성은 진행하지 않았습니다. 원본 앱 적용·실행·독립 리뷰에 대한 검증 결과는 아직 없습니다.

## 통합 리뷰 수정 후 공통 검증

JSON writer 회귀 수정 후 `pnpm check` 종료 코드 0을 확인했습니다. TypeScript 검사, Node 16개, JS·CSS bundle, Rust 10개(JSON 7개·파일 3개)가 통과했습니다. JSON fixture는 상대 symlink 체인·dangling symlink·순환 링크·기존 권한·읽기 전용 파일을 포함합니다. 소비 앱의 추가 검증과 최종 리뷰 결과는 [적용 결과](integration-report.md)에 기록합니다.

## 백엔드 공통 승격 검증

공통 JSON 조건부 갱신·이미지 저장·scan-job과 리뷰 수정 반영 후 최종 `pnpm check`를 통과했습니다. TypeScript 검사·Node 16개·JS/CSS bundle·Rust 28개가 통과했으며, 별도 locked Rust 테스트와 cargo fmt 검사도 통과했습니다. 앱별 검증 및 독립 리뷰는 [백엔드 승격 결과](backend-promotion-report.md)를 참조합니다.

## 설정 UI·저장 승격 검증

`pnpm check`와 `cargo fmt --all --check` 통과: TypeScript·Node25·JS/CSS bundle·Rust35. Rust 설정 저장소 7개 테스트는 무변경 조회, migration, 오류 시 원본 보존, 기존 JSON 잠금과의 동시 접근을 포함합니다. 브라우저 설정 테스트는 버전 보호, 저장 실패, no-op, 다른 창 이벤트와 구독 정리를 포함합니다.

앱 검증은 Movie Node4/Rust2, Repo TS9, Folder Node10/Rust20, Bookmark Node5/Rust30, Tree Node5 및 각 앱의 타입·빌드·Rust check입니다. Aside 브라우저로 Movie/Repo 복원·초기화, Movie 미래 버전 보호, Tree 숨김 표시·캐시·패널 비율 복원을 확인했습니다. 마지막 Movie/Repo 입력 동기화 수정은 회귀 테스트와 타입·빌드로 검증했으며 해당 수정 후 브라우저 검증은 반복하지 않았습니다. 네이티브 Tauri 창과 OS 연동은 검증하지 않았습니다. 상세 내용은 [설정 승격 결과](settings-promotion-report.md)를 참조합니다.

## Storybook 구성 검증

공통 UI Storybook 추가 후 전체 `pnpm check` 통과: 타입·Node25·Rust35·소비 빌드 및 Storybook 정적 빌드. 주요 브라우저 동작과 경고·검증 한계는 [Storybook 안내](storybook.md)에 기록합니다.
