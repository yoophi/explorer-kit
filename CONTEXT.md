# 작업 진행 이력

이 문서는 공통 기능 조사부터 Explorer Kit 구성과 원본 앱 통합 진행 상태를 기록합니다. 1차 공통 코드 적용과 리뷰를 완료했으며, 후속 감사에 따른 백엔드 공통 기능 승격·다섯 앱 적용·독립 리뷰까지 완료했습니다. 아래 최신 재개 상태가 이전 보류 기록보다 우선합니다.

## 사용자 요청과 결정

1. `/Users/yoophi/project` 바로 아래 Git 저장소 목록을 조회했습니다.
2. 다섯 탐색기 프로젝트의 기능·아키텍처·공통화 후보를 조사했습니다.
3. 사용자가 공통 기능을 제공하는 저장소를 만들고 기존 구현의 복사본을 구성하도록 지시했습니다.
4. 사용자가 공통 기능 완료 후 원본 저장소마다 Herdr agent tab을 생성하여 공통 코드를 적용하도록 지시했습니다. 에이전트 설정은 `codex / gpt-6-sol / medium`입니다. 적용 완료 보고와 후속 리뷰도 요청했습니다.
5. 실행 지시를 `PROMPT.md`로 작성했습니다.
6. 사용자 요청에 따라 현재 진행 이력을 이 `CONTEXT.md`에 기록합니다.

실제 대상 이름은 `movie-explorer`, `movie-folder-explorer`, `repo-explorer`, `site-bookmark-browser`, `tauri-tree-file-explorer`입니다. 요청의 `movie-eexplorer`, `site-bookmark-explorer`는 각각 실제 폴더명으로 해석했습니다.

## 조사 결과

다섯 앱은 Tauri 2, Rust, React 19, TypeScript, Vite 7, Tailwind 4 기반입니다. 조사 당시 작업 폴더의 미커밋 변경도 포함했습니다. 초기 조사는 정적 코드 분석이며 앱 실행 검증은 하지 않았습니다.

| 저장소 | 주요 기능과 구조 |
| --- | --- |
| movie-explorer | 영상 파일 재귀 검색, glob, 디렉터리 트리, 세 가지 목록 보기. pnpm workspace, React Query, 페이지에 집중된 UI 로직, Rust 단일 lib.rs |
| movie-folder-explorer | 다중 폴더·그룹, 점진적 스캔·취소, 캐시, 폴더명 메타데이터·rename, 이미지·평점·필터. 계층별 Rust 모듈과 port trait, React hook 상태 관리 |
| repo-explorer | Git 저장소 탐색, worktree 관계, README·origin, 설명·태그·고정 상태. pnpm workspace, React Query, Rust 단일 lib.rs. 지침의 hexagonal 구조와 실제 구현 사이 차이 확인 |
| site-bookmark-browser | 사이트 그룹, 북마크 CRUD, 이미지·평점·필터, Markdown 가져오기, 중복 URL 정리. 계층별 Rust 모듈이 있으나 application이 구체 store에 의존 |
| tauri-tree-file-explorer | 가상화 트리, 지연 로딩, URL 선택 동기화, 파일 목록, 숨김 표시, 패널 비율 저장. core·UI·tree·list가 이미 패키지로 분리됨 |

우선 공통화 대상으로 UI 기본 컴포넌트, 스캔 생명주기, JSON 저장, 트리·목록, 이미지 입력, 평점과 태그 집계를 선정했습니다. 폴더명 규칙, Git/worktree 검사, URL identity, 그룹 삭제 정책은 앱에 남기기로 했습니다.

## 공통 저장소 구현 완료

- 경로: `/Users/yoophi/project/explorer-kit`
- 로컬 Git 저장소 생성, 브랜치: `main`
- 초기 커밋: `9ac1e4f` — `feat: extract reusable explorer packages and Rust crates`
- 초기 커밋 규모: 87개 파일. lockfile 포함
- 원격 저장소 생성·게시·push는 수행하지 않았습니다.

| 구성 | 구현 내용 |
| --- | --- |
| ui-base | 폴더·북마크의 Base UI 컴포넌트 13개, 테마·유틸 복사 |
| ui-radix | 파일 탐색기의 Radix 계열 UI·resizable·테마 복사 |
| core, file-tree, file-list | 기존 파일 탐색기 패키지 복사, UI import namespace 조정 |
| scan-client | consumeFolderScan을 consumeScan<T>로 일반화. folder→item 이벤트 계약, 취소·정리 유지, terminal 이후 늦은 이벤트 무시 추가 |
| image-input | 클립보드 이미지 선택, MIME 검사·바이트 변환, 명시적 preview dispose 추출 |
| rating | 북마크의 0~5점·0.5점 단위 입력·표시 복사 |
| collection-core | 태그 크기·정규화·집계, seeded shuffle 순위 추출 |
| dev-tools | Movie의 Tauri 개발 실행 스크립트 복사. 소비 앱 cwd와 TAURI_PACKAGE 지원 |
| explorer-fs-core | 단일 폴더 조회와 glob 재귀 스캔에서 Tauri 의존성 제거 |
| explorer-json-store | JSON 읽기·고유 임시 파일 교체, 프로세스 내 read-modify-write 직렬화 |

TypeScript source package 9개, 개발 도구 1개, Rust crate 2개입니다. 독립 소비 예제와 JS·CSS 통합 빌드 스크립트도 구성했습니다. Base UI와 Radix API는 별도로 보존했습니다.

파일별 복사 출처와 원본 SHA256을 `provenance.json`에 기록했습니다. 44건을 다시 비교하여 원본 해시가 유지되었음을 확인했습니다. 이는 기록된 원본 파일의 확인 범위이며 모든 저장소 파일을 해시 검사했다는 의미는 아닙니다.

## 검증 결과

| 실행한 검사 | 결과 |
| --- | --- |
| pnpm typecheck | TypeScript 패키지 9개와 소비 예제 통과 |
| pnpm test | Node 테스트 16개 통과 |
| pnpm build | 브라우저 JS와 Tailwind CSS 통합 bundle 생성 성공 |
| cargo test --workspace | 파일 조회·스캔 3개, JSON 저장 3개 통과 |
| node --check packages/dev-tools/bin/tauri-dev.mjs | 구문 검사 통과 |
| 초기 커밋 전 git diff --cached --check | 통과 |

초기 테스트는 Node 15개였으며 스캔 종료 직후의 늦은 결과를 차단하는 회귀 테스트를 추가한 후 16개가 통과했습니다. 변경 후 TypeScript 검사와 통합 빌드도 다시 통과했습니다. 초기 구성 때는 네 가지 검사를 각각 실행했고, 아래 재개 시도에서는 전체 묶음 명령 `pnpm check`도 실행하여 통과했습니다.

공통 코드에 대한 자체 검토를 수행했지만 독립 에이전트 리뷰는 수행하지 않았습니다. 실제 브라우저·Tauri 화면과 개발 CLI를 통한 네이티브 앱 실행은 검증하지 않았습니다.

## 원본 저장소 보존 상태

이번 작업에서 원본 앱은 수정하지 않았습니다. 조사 시점에는 다음 사용자 작업이 존재했습니다. 재개할 때 현재 상태를 다시 확인해야 합니다.

- movie-explorer: 초기 구현 파일들이 untracked 상태
- movie-folder-explorer: 스캔·폴더 관리 관련 수정과 미추적 테스트 파일
- site-bookmark-browser: 평점·중복 URL 관련 수정과 미추적 파일
- repo-explorer, tauri-tree-file-explorer: 조사 당시 git status 출력에 변경 없음

기존 사용자 작업을 포함하는 일괄 commit, reset, clean을 하지 않습니다. 통합 시 각 앱의 데이터 경로·schema·기능·화면을 유지합니다.

## Herdr 진행 제약

`/opt/homebrew/bin/herdr`의 존재와 도움말을 확인하고 `herdr --skill` 지침을 읽었습니다. 현재 실행 세션에는 `HERDR_ENV`가 설정되어 있지 않았습니다.

해당 지침은 `HERDR_ENV=1` 확인이 실패하면 Herdr 밖에서 세션을 조회·제어하지 않도록 요구합니다. 이에 따라 탭 생성·에이전트 실행 등 제어 명령을 수행하지 않았습니다. 환경을 위조하지 않았고 다른 방식의 에이전트로 대체하지 않았습니다.

사용자에게 Herdr 안의 세션에서 재개하거나 현재 세션의 병렬 에이전트로 대체하는 선택을 요청했으나, 이 기록 시점까지 대체 실행 방식에 대한 답변은 없었습니다. 따라서 **Herdr 탭에서 codex / gpt-6-sol / medium으로 실행한다는 원래 요청이 유지됩니다.** 이후 사용자는 PROMPT.md와 CONTEXT.md 작성을 요청했고, 이어 PROMPT.md 실행을 지시했습니다.

## PROMPT 실행 재개 시도

사용자의 “PROMPT.md 에 기록한 내용을 진행해주세요” 요청에 따라 실제 문서와 Git 상태를 다시 읽었습니다. `PROMPT.md`, `CONTEXT.md`는 untracked 상태였으며, 현재도 `HERDR_ENV=unset`임을 확인했습니다.

1단계의 `pnpm install --frozen-lockfile && pnpm check`를 실행했고 종료 코드 0으로 완료했습니다. TypeScript 검사, Node 테스트 16개, 브라우저 JS·CSS 통합 빌드, Rust 테스트 6개가 모두 통과했습니다. 공통 코드 수정은 필요하지 않았습니다.

2단계는 PROMPT.md에 명시된 Herdr 환경 조건 때문에 진행하지 않았습니다. 탭 생성, 구현 에이전트 실행, 원본 앱 변경, 독립 리뷰는 여전히 미실행입니다. 재개하려면 Herdr 안에서 실행 중인 에이전트 세션에 이 저장소의 PROMPT.md 실행을 지시해야 합니다. 환경 변수만 임의 설정하는 방식은 사용하지 않습니다.

## 작성한 문서

| 문서 | 용도 |
| --- | --- |
| [README.md](README.md) | 패키지 목록, 설치·소비 방법, 지원 범위 |
| [AGENTS.md](AGENTS.md) | 공통 저장소 개발 규칙 |
| [docs/architecture.md](docs/architecture.md) | 공유 경계와 앱별 통합 범위 |
| [docs/provenance.md](docs/provenance.md) | 원본과 파생 변경 설명 |
| [provenance.json](provenance.json) | 파일별 원본 경로·해시 |
| [docs/validation.md](docs/validation.md) | 초기 검증 결과와 한계 |
| [docs/integration-handoff.md](docs/integration-handoff.md) | 담당 앱별 작업 지시 |
| [PROMPT.md](PROMPT.md) | Herdr 실행부터 적용·검증·독립 리뷰·보고까지의 전체 재개 프롬프트 |
| [CONTEXT.md](CONTEXT.md) | 이 진행 이력 |

PROMPT.md는 초기 커밋 이후 작성되었고 이 문서 작성 직전에는 untracked 상태였습니다. CONTEXT.md도 이번 요청으로 새로 작성했습니다. 이 두 문서를 별도로 commit하거나 push하지 않았습니다.

## 다음 진행 단계

1. Herdr 안의 세션에서 `PROMPT.md`를 읽고 실제 Git 상태와 진행 중인 에이전트를 확인합니다.
2. 공통 저장소의 현재 상태에서 `pnpm install --frozen-lockfile`, `pnpm check`로 재개 기준을 확인합니다.
3. 다섯 원본 저장소 각각에 Herdr agent tab을 만들고 `codex / gpt-6-sol / medium` 설정으로 통합을 진행합니다.
4. 조정자는 공통 저장소 변경을 전담하고 각 구현 에이전트는 담당 앱만 수정합니다.
5. 앱별 typecheck/build·기존 테스트·Rust 검증을 수행하고 공통 코드 적용 결과를 먼저 보고합니다.
6. 구현자와 다른 에이전트가 독립 리뷰를 수행합니다. 지적 사항을 수정하고 관련 검증·재리뷰를 마칩니다.
7. 최종 변경 요약, 실행 증거, 리뷰 결과와 미검증 항목을 문서에 기록하고 사용자에게 보고합니다.

현재 완료된 것은 **공통 저장소 구현·검증과 후속 작업 문서화**입니다. 원본 앱 통합 완료 또는 독립 리뷰 완료로 해석하지 않습니다.

## Herdr 환경 정상화 후 통합 시작

사용자 재개 요청에 따라 `HERDR_ENV=1`, 세션 `refactor`, 조정자 pane `w1:p2`를 확인했습니다. Herdr client/server 모두 0.9.3이며 재시작이 필요하지 않았습니다. `pnpm install --frozen-lockfile && pnpm check`를 다시 통과시킨 뒤 아래 탭을 생성했습니다.

| 구현 에이전트 | 저장소 | 탭 | Pane | 시작 상태 |
| --- | --- | --- | --- | --- |
| movie-shared | movie-explorer | w1:t3 | w1:p3 | 구현 요청 전달, 작업 중 |
| folder-shared | movie-folder-explorer | w1:t4 | w1:p4 | 구현 요청 전달, 작업 중 |
| repo-shared | repo-explorer | w1:t5 | w1:p5 | 구현 요청 전달, 작업 중 |
| bookmark-shared | site-bookmark-browser | w1:t6 | w1:p6 | 구현 요청 전달, 작업 중 |
| tree-shared | tauri-tree-file-explorer | w1:t7 | w1:p7 | 신뢰 화면 해제와 idle 상태 확인 후 구현 요청 전달, 작업 중 |

모두 `codex --no-daemon --model gpt-6-sol -c 'model_reasoning_effort="medium"' --sandbox danger-full-access --ask-for-approval never`로 시작했습니다. 사용자 포커스는 조정자 탭에 유지했습니다. shared daemon의 환경 재사용을 피하기 위해 이번 작업 에이전트는 `--no-daemon`으로 실행합니다.

통합 직전 사용자 작업을 포함한 파일 복사본을 `/var/folders/3z/mcf5cp4n0t567wk9p_kjrpp80000gn/T/explorer-integration-baseline-i6ok2ys4`에 보관했습니다. 원본의 Git tracked 및 non-ignored untracked 파일 기준이며 `.git`이나 dependency/build 디렉터리를 복제한 전체 백업은 아닙니다. 리뷰 시 이번 통합 변경과 기존 사용자 변경을 구분하는 기준입니다.

에이전트에게 담당 앱 외 수정, 원본 사용자 데이터의 변경 테스트, commit/reset/clean/push를 금지하고 typecheck/build·기존 테스트·Rust 검사 결과를 보고하도록 지시했습니다. 공통 저장소 변경이 필요하면 조정자에게 보고하도록 했습니다.

## 통합 완료 보고와 독립 리뷰

다섯 구현 에이전트가 모두 공통 패키지의 실제 실행 경로 연결, 로컬 중복 제거, 앱별 빌드·테스트를 마쳤습니다. 사용자에게 적용 완료를 먼저 보고한 뒤 별도 Herdr 탭 `review-ui`(w1:t8/w1:p9)와 `review-data`(w1:t9/w1:pA)를 만들었습니다. 두 리뷰어도 `codex / gpt-6-sol / medium`이며 통합 직전 snapshot과 비교했습니다.

초기 리뷰에서 통합 회귀 2건(JSON symlink·권한 변경, 폴더 전환 뒤 stale 이미지 응답 오류)과 기존 문제 2건(북마크 preview URL 누수, settings load/update 경쟁)을 확인했습니다. 조정자는 공통 JSON writer를 수정하고 JSON 테스트 7개 및 전체 `pnpm check`를 통과시켰습니다. 이때 공통 Rust 테스트는 총 10개입니다. Folder 14개·Repo 6개 Rust 테스트도 다시 통과했습니다. 앱별 이미지 수명과 북마크 설정 경쟁은 담당 구현자에게 수정을 배정했으며 재리뷰를 진행합니다.

파일 트리 검증 에이전트가 Aside CLI와 관련 skill을 업데이트한 부수 변경은 `docs/integration-report.md`에 별도로 기록했습니다. 원본 앱 commit/reset/clean/push는 하지 않았습니다.

## 최종 완료와 검증 범위

- Folder의 stale 이미지 응답 문제를 layout effect generation으로 수정하고 typecheck·Node 10개·build를 다시 통과했습니다.
- Bookmark의 이미지 URL 수명과 설정 load/update 경쟁을 수정하고 build·Node 5개·Rust 11개·cargo check를 통과했습니다.
- review-ui는 두 dialog의 최신 코드에서 기존 지적과 passive cleanup 경계가 해결됐음을 확인했습니다.
- review-data는 공통 JSON 7개·Folder 14개·Repo 6개·Bookmark 11개 Rust 테스트와 Bookmark check를 직접 다시 실행했고 기존 symlink/권한 회귀 및 settings 경쟁의 해결을 확인했습니다.
- 공통 전체 `pnpm check`는 TypeScript·Node 16개·JS/CSS 빌드·Rust 10개를 통과했습니다.
- JSON atomic replacement의 xattr 소실과 부모 디렉터리 쓰기 권한 필요는 재현된 제약으로 README/보고서에 명시했습니다. inode·hardlink·소유권·확장 속성 보존 및 프로세스 간 transaction은 지원하지 않습니다. 이 항목은 코드로 해소한 것으로 보고하지 않습니다.
- 네이티브 Tauri 창의 최종 시각·OS 연동 검증은 수행하지 않았습니다. Tree의 브라우저 fixture 검증과 구분합니다.

최종 결과는 [docs/integration-report.md](docs/integration-report.md), snapshot 기준 변경 파일 목록은 [docs/integration-changes.json](docs/integration-changes.json)에 있습니다. 요청된 PROMPT 실행 단계는 완료했습니다. 별도 후속 요청이 없다면 구현을 다시 시작하거나 탭을 중복 생성하지 않습니다. 사용자 검토를 위해 Herdr 구현 탭 5개와 리뷰 탭 2개를 유지했습니다. 원본 앱 commit/push, 원격 저장소 게시를 하지 않았습니다. 공통 초기 커밋 이후의 writer·문서 변경과 원본 앱 통합 변경은 로컬 미커밋 상태입니다.

## 후속 백엔드 구현 일관성 점검

사용자 요청으로 다섯 앱의 공통 기능 중 구현이 다른 부분을 비교했습니다. 공통 crate 연결은 확인했으나 앱별 JSON migration·조회 부작용·이미지 교체·스캔 실행 계약에는 차이가 남아 있습니다. 실제 Bookmark 모듈을 임시 Cargo 프로그램에 불러와 미지원 버전의 legacy 오인/필드 초기화, 읽기 전용 정상 설정의 조회 실패, 이미지 이전 실패 후 재시도 누락을 재현했습니다. legacy 목록 migration의 분리된 read/write 잠금도 코드상 지적으로 기록했습니다. 기존 snapshot과 비교해 통합 전부터 있던 문제를 구분했습니다.

상세 결과: [docs/backend-consistency-audit.md](docs/backend-consistency-audit.md). 이번 요청에서는 앱 구현을 수정하지 않았고 실제 사용자 데이터도 사용하지 않았습니다. 수정 권고의 우선순위와 공통화할 부분/유지할 도메인 차이를 보고서에 남겼습니다.

## 백엔드 공통 기능 승격 시작

사용자가 권고 방식의 실행을 지시했습니다. HERDR_ENV=1 확인 후 기존 codex/gpt-6-sol/medium 탭을 재사용합니다. 이번 변경 전 snapshot은 `/var/folders/3z/mcf5cp4n0t567wk9p_kjrpp80000gn/T/backend-promotion-baseline-vegfb0x_`입니다.

1. 조정자: JSON Unchanged/Write transaction, 명시적 버전 검사, atomic byte writer API.
2. movie-shared: 공통 image-store crate만 구현.
3. tree-shared: 공통 scan-job crate만 구현.
4. 공통 검증 후 Folder/Bookmark/Repo 담당 탭에 적용. Movie/Tree는 무거운 동기 I/O adapter를 확인.
5. 적용 보고 후 기존 review-ui/review-data 탭으로 독립 리뷰·수정·재검증.

도메인 schema·경로·DTO를 보존하고 변경 없는 조회는 쓰지 않습니다. Bookmark legacy migration은 잠금 내부에서 수행하고 이미지 이전 실패 시 재시도 가능해야 합니다. 앱에 traversal 정책을 남기며 scan 생명주기만 통합합니다. 앱 commit/push/환경 도구 업그레이드 및 실제 데이터 변경 테스트는 하지 않습니다.

## 백엔드 승격 적용 완료 및 독립 리뷰 시작

공통 Rust 26개와 기존 Node 16개/타입/빌드 검증을 통과했고 다섯 앱 적용 결과를 먼저 사용자에게 보고했습니다. Movie Rust2, Folder Rust18/Node10, Repo Rust10/TS3, Bookmark Rust21/Node5, Tree cargo check 및 모든 앱 빌드/타입 검사가 통과했습니다. Bookmark 수정 파일 포맷은 통과하나 기존 private_browser.rs의 전체 fmt 차이는 유지했습니다.

앞선 감사의 3개 재현 조건을 실제 앱 모듈로 다시 실행해 미래 버전 보존, 읽기 전용 조회, 이미지 migration 실패 후 복구를 확인했습니다. Exact 이미지 조회는 canonical 확장자5개 직접 접근으로 기존 파일시스템 case 의미와 비용을 유지합니다. 독립 리뷰는 review-data(JSON·이미지·migration), review-ui(scan lifecycle·Repo UI·Movie/Tree adapter)에 배정했습니다.

## 독립 리뷰 후속 수정 진행

review-ui의 Repo 구독 재설치 readiness/상태 문제는 수정·재리뷰 완료했습니다. review-data는 정상 v2의 이미지 접근 오류가 metadata를 막는 문제, legacy 이미지의 삭제후 재연결, 디렉터리 symlink 삭제, 이미지 삭제 실패 뒤 JSON 삭제로 재시도가 막히는 경계를 재현했습니다. 앞의 세 문제는 수정했고 마지막 삭제 실패 복구를 보완 중입니다. 공통 image-store는 regular file만 정리하며 remove_images까지 같은 mutex를 사용합니다. 공통 Rust28/Folders18 검증을 통과했습니다.

## 백엔드 승격 최종 완료

- JSON 조건부 갱신·버전 보호, 이미지 저장/조회/이전/삭제, 스캔 등록/취소/종료 계약을 공통 crate로 승격하고 다섯 앱의 실행 경로에 적용했습니다. 도메인 규칙은 앱에 유지했습니다.
- review-ui와 review-data가 지적한 5건을 수정하고 재검토했습니다. 최종 review-data는 권한 오류 시 북마크 JSON·그룹 settings 보존, 복원 후 재시도, 마지막 그룹 보호를 독립 fixture로 확인했으며 남은 도입 회귀를 발견하지 못했다고 보고했습니다.
- 최종 공통 `pnpm check`: TypeScript·Node16·JS/CSS 빌드·Rust28 통과. Movie Rust2, Folder Rust18/Node10, Repo Rust10/TS3, Bookmark Rust28/Node5 및 앱별 빌드/check 통과. Tree는 앱 Rust 테스트 0개이며 cargo check·typecheck·build 통과입니다.
- Bookmark 전체 fmt에는 수정하지 않은 private_browser.rs의 기존 차이가 남아 있습니다. 수정 파일 포맷은 통과했습니다. 네이티브 Tauri UI·OS 연동은 이번에 실행 검증하지 않았습니다.
- 실제 사용자 데이터는 사용하지 않았으며 commit/push·환경 도구 업그레이드 없이 로컬 미커밋 변경으로 남겼습니다. 기존 Herdr 구현/리뷰 탭을 유지합니다.

상세 결과: [백엔드 승격 보고서](docs/backend-promotion-report.md). 이번 작업 직전 snapshot 대비 변경 목록: [backend-promotion-changes.json](docs/backend-promotion-changes.json). 초기 통합 보고서는 별도 이력으로 보존합니다.

## 공통 코드·소비 앱 재검토

사용자 추가 리뷰 요청에 따라 공통 모듈과 다섯 앱 호출 경로를 다시 검토했습니다. 임시 fixture와 이전 snapshot 비교로 도입 회귀 2건(JSON 쓰기 실패 시 이미지 선삭제, 끝점 path 이미지 처리 차단), 기존 문제 3건(그룹 일괄 이미지 삭제의 공통 보호 우회, 숨김 트리 행 잔존, root 경로 구분자 처리)을 확인했습니다. 이전 완료 보고에서 놓친 조건이며 현재 미해결입니다. 소스 수정·커밋 없이 리뷰 결과만 기록했습니다. 상세 내용과 수정 권고는 [shared-code-review.md](docs/shared-code-review.md)에 있습니다.

## 설정 UI·저장 공통화 시작

사용자 요청으로 다섯 앱 설정을 조사했습니다. Movie·Repo는 메모리 상태, Folder·Bookmark는 Rust JSON, Tree는 일부 localStorage를 사용합니다. 공통 UI와 브라우저/Rust 저장 계약을 분리하고 앱별 schema·도메인 정책은 유지하기로 했습니다. 설정 작업 직전 snapshot: `/var/folders/3z/mcf5cp4n0t567wk9p_kjrpp80000gn/T/settings-promotion-baseline-bp9nv1wn`.

settings-core와 settings-ui를 구현했으며 초기 전체 check(TypeScript·Node21·Rust28·빌드)를 통과했습니다. Rust settings-store는 별도 앱 담당 탭에서 구현 중이며 원본 앱 적용은 공통 구현 검증 이후 진행합니다.

## 설정 공통화 앱 적용 완료·리뷰 시작

공통 settings-core/settings-ui/settings-store를 다섯 앱에 연결했습니다. 최종 공통 check(TypeScript·Node25·Rust35·빌드)와 Rust fmt를 통과했습니다. MovieNode2/Rust2, RepoTS7, FolderNode10/Rust19, BookmarkNode5/Rust30, TreeNode5 및 각 앱 build/check를 통과했습니다. Movie/Repo의 새 설정 복원과 초기화, Tree의 숨김 표시 반복 전환·복원 및 패널 비율12.5→17.5→reset12.5를 Aside 브라우저에서 확인했습니다.

다섯 앱 적용 완료를 사용자에게 보고한 뒤 기존 review-data/review-ui 탭에 독립 리뷰를 배정했습니다. 상세 기록은 [settings-promotion-report.md](docs/settings-promotion-report.md), snapshot 대비 변경 목록은 [settings-promotion-changes.json](docs/settings-promotion-changes.json)에 기록합니다. 이전 리뷰 이미지3건·root 경로 P3는 설정 범위 밖으로 남기며 숨김 트리 행 잔존은 이번 연결 변경으로 보완했습니다.

## 설정 공통화 최종 완료

- 공통 `settings-ui`의 섹션·필드·토글·상태 표시, `settings-core`의 버전 검증·복원·저장·초기화·React 구독, Rust `settings-store`의 잠금 내부 load/update를 다섯 앱에 적용했습니다. 기존 파일 schema와 앱별 정책은 유지합니다.
- 독립 리뷰에서 Folder 미래 버전 필드 손실, Repo focus 뒤 외부 값 덮어쓰기, Movie 미적용 glob 초안 덮임을 확인하고 모두 수정했습니다. Folder는 명시적 version이 있는 문서를 거부해 bytes를 보존합니다. Movie/Repo는 실제 편집한 draft와 저장값을 분리합니다.
- review-data는 실제 Folder 모듈 fixture로 버전 거부·원본 보존·무버전 migration을 재확인했습니다. review-ui는 Movie4·Repo9 테스트를 직접 재실행하고 최종 승인했습니다. 설정 범위의 추가 지적은 없습니다.
- 최종 공통 Node25/Rust35·타입·빌드·fmt 통과. 앱별 최종 테스트는 MovieNode4/Rust2, RepoTS9, FolderNode10/Rust20, BookmarkNode5/Rust30, TreeNode5이며 앱 타입·빌드·Rust check 통과입니다. 세부 실행 시점과 검증 범위는 보고서에 기록했습니다. 마지막 Movie/Repo 수정 후 브라우저 재검증과 네이티브 Tauri 검증은 수행하지 않았습니다.
- 앞선 리뷰의 숨김 트리 캐시 문제는 해결했으나 이미지3건과 root 경로 P3는 미해결입니다. 실제 사용자 데이터 변경·도구 업그레이드·commit/push는 하지 않았으며 기존 Herdr 탭을 유지합니다.

[설정 승격 결과](docs/settings-promotion-report.md), [작업 직전 snapshot 대비 변경 목록](docs/settings-promotion-changes.json)에 최종 결과를 기록했습니다.

## 공통 UI Storybook 구성

사용자 요청으로 `examples/storybook` workspace에 Storybook 10.4.6/React Vite·Tailwind·Docs·Accessibility를 구성했습니다. 기존 Movie 앱 버전과 맞췄고 공통 React 패키지의 public API를 직접 사용합니다. 33개 스토리·자동 문서5개, Light/Dark, 메모리 설정 저장 예제, 파일 목록 상태와 트리 연동, 평점, Base/Radix UI 조합을 제공합니다. 앱 구현과 공통 런타임 소스는 수정하지 않았습니다.

`pnpm check`에 Storybook 정적 빌드를 추가했고 타입·Node25·Rust35·소비 빌드·Storybook 빌드가 통과했습니다. Settings Controls 전환 시 메모리 fixture를 재생성하도록 보완했습니다. React 스킬 기준으로 hooks 위치, 상태 수명, 테마 cleanup, label과 오류 역할을 검토했습니다. Aside에서 설정 토글/초기화/쓰기 실패와 Dialog 포커스/닫기, 트리와 목록 렌더링을 확인했습니다. 상세 실행과 한계는 [docs/storybook.md](docs/storybook.md)에 기록합니다.

설치 중 작업 디렉터리 지정 실수로 상위 `/Users/yoophi`에서 pnpm install이 한 차례 실행됐습니다. pyright(1.1.408), bash-language-server(5.6.0), shadcn(3.8.4) 원본은 .ignored에서 복구하고 실행 링크도 원본 경로로 복구했습니다. 새 상위 pnpm-lock.yaml과 교체 링크는 `/var/folders/3z/mcf5cp4n0t567wk9p_kjrpp80000gn/T/storybook-parent-install-recovery-qjf12nfl`에 분리 보관했습니다. 추가 다운로드 캐시와 pnpm 의존성 디렉터리는 남아 있을 수 있으며 사용자 파일을 일괄 삭제하지 않았습니다. 실제 프로젝트 설치는 이후 explorer-kit 경로에서 완료했습니다. commit/push 및 원격 배포는 하지 않았습니다.

최종 후속 확인: Storybook 타입·정적 빌드 재통과, frozen offline install·git diff --check 통과. 브라우저에서 트리 Movies 선택→경로 변경·Archive 추가, combobox 검색, 평점2.5→4 변경까지 확인했습니다. 로컬 Storybook 서버는 사용자 확인용으로 127.0.0.1:6006에서 실행 상태로 유지합니다.

## 두 앱 이상 공통 기능 추가 조사

사용자 요청에 따라 현재 다섯 앱의 남은 backend·복합 UI·상태관리를 조사했습니다. 기존 공통 모듈과 새 후보를 구분하고 백엔드4/UI6/상태관리4, 총14개 후보를 기록했습니다. F/B의 이미지 입력 수명·태그/평점 필터·그룹 관리, M/R의 로컬 버튼·설정 초안, F/R의 순회/스캔 수명이 주요 대상입니다. Movie/Repo 버튼은 import alias 정규화 후 전체 문자열 일치를 직접 확인했습니다.

기능별 소비처·파일/줄 근거·차이·권장 API 경계·추진 순서·검증 조건은 [shared-feature-candidates.md](docs/shared-feature-candidates.md)에 있습니다. 로컬 소스를 읽고 조사 문서만 작성했습니다. 구현·schema 변경·전체 테스트·commit/push는 하지 않았습니다. 기존 이미지3건/root 경로 문제는 미해결 선행 이슈로 유지합니다. 후보14개를 별도 패키지14개로 만들거나 모든 앱에 일괄 적용하는 제안은 아닙니다.

## 다섯 앱 Hexagonal·FSD 리뷰

사용자 요청으로 현재 다섯 앱의 backend 의존 방향과 frontend FSD 경계를 리뷰했습니다. Repo 유스케이스의 Tauri/FS/Git 직접 결합, Bookmark application의 concrete infrastructure 의존과 command의 그룹 삭제 조합, Folder adapter에 남은 그룹 정책/streaming 포트 우회가 주요 backend 지적입니다. Movie/Tree의 작은 command 구조는 완전한 port 기반 구현은 아니지만 낮은 우선순위로 분류했습니다.

정적 import 검색 후 수동 확인한 frontend 경계 참조는 public API 우회25건, Tree feature 교차2건, Repo Shared→App1건입니다. Tree는 slice 상호 의존이며 실제 JS module cycle이라고 단정하지 않았습니다. 페이지 크기·widgets 부재·local state·serde 사용 자체를 위반으로 처리하지 않았고 앱 AGENTS의 더 엄격한 규칙과 FSD 일반 규칙을 구분했습니다.

[architecture-review.md](docs/architecture-review.md)에 8개 주요 지적(H1~H5/F1~F3), 앱별 판정, 수정 경계·검증 조건과 공식 기준 링크를 기록했습니다. [architecture-import-audit.json](docs/architecture-import-audit.json)에 28개 참조 증거를 보관했습니다. 소스 수정·새 도구 설치·전체 테스트/네이티브 실행·commit/push는 하지 않았습니다.

## 다섯 앱 README 갱신

사용자 요청으로 Movie README를 신규 작성하고 Folder·Repo·Bookmark·Tree README를 현재 구현 기준의 한국어 문서로 갱신했습니다. 앱별 기능, sibling explorer-kit 설치, 실제 package.json의 개발/검증/빌드 명령, 설정 key·JSON 위치, 공통 의존성, Hexagonal/FSD 현재 상태와 개선점을 반영했습니다. Tree의 이전 모노레포 문서 링크와 소비 컴포넌트 연결 주의점도 유지했습니다.

다섯 README의 로컬 링크와 whitespace를 확인했습니다. 문서 변경만 수행했으므로 앱 테스트/네이티브 빌드 재실행은 하지 않았습니다. 패키지 버전·Tauri 설정·소스·lockfile은 변경하지 않았으며 commit/push도 하지 않았습니다.

## 아키텍처 수정 착수

사용자가 아키텍처 리뷰 지적 수정부터 진행을 선택했습니다. 변경 직전 snapshot은 `/var/folders/3z/mcf5cp4n0t567wk9p_kjrpp80000gn/T/architecture-fix-baseline-1jkxu9_k`입니다. HERDR_ENV=1 확인 후 기존 Repo/Bookmark/Folder 담당 탭에 backend port/adapter·FSD 수정과 fake 기반 검증을 배정했습니다. Movie/Tree는 후속 순서로 진행합니다. 기존 tab/model 설정을 재사용하며 동시에 구현 담당3개까지 실행합니다. 조정자는 공통 repo에 앱 경계 검사와 실행 이력을 관리합니다.

## 아키텍처 수정 중간 확인

Folder는 그룹 규칙을 domain으로 이동하고 streaming·thumbnail·rename 조합을 application/port로 분리했습니다. 중간 비교에서 rename 전에 설정 경로를 해석하는 회귀를 찾아 지연 callback으로 수정했습니다. false이면 설정 조회 생략, true이면 rename 성공 뒤 조회하는 순서를 fake 테스트로 고정했으며 최종 Rust26·Node10·타입·빌드·check 통과입니다. Bookmark는 transaction callback 포트와 DeleteGroup을 도입했고 Rust33·Node5·타입·빌드·check 통과입니다.

Movie/Tree 담당 탭을 순차 투입했습니다. Repo의 catalog 경로 조회 시점도 baseline과 비교해 보완을 요청했습니다. 공통 저장소에는 `check:apps-architecture`를 추가했으며 baseline에서 FSD28건·application→infrastructure3건을 탐지했습니다. 공통 전체 check는 Node25·Rust35·타입·소비 빌드·Storybook 빌드 통과입니다. 기존 React 스킬의 hook/상태 수명 기준도 최종 UI 리뷰에 적용하며, FSD 공개 API는 유지합니다.

## 아키텍처 적용 보고·독립 리뷰 시작

다섯 앱의 port/adapter·FSD 구조 변경 적용을 사용자에게 보고했습니다. Movie Node4/Rust5, Tree Node5/Rust4 및 타입·빌드·check·fmt가 통과했습니다. 정적 경계 검사도 다섯 앱 모두 통과했습니다. 기존 review-ui/review-data 탭에서 현재 architecture snapshot과 비교하는 독립 리뷰를 시작했습니다. Repo는 저장 순서·timestamp 복구 후 최종 검증을 마무리 중입니다.

Repo 최종 TS9/Rust15·타입·빌드·Storybook·cargo check·fmt 통과를 확인했습니다. catalog path resolver를 port 호출 시점까지 지연하고, scan 시각은 normalize 뒤 이벤트 전, metadata 시각은 catalog 저장 뒤에 생성하도록 baseline 순서를 복구했습니다. 다섯 README에 이번 수정 보고서 링크를 추가했습니다.

## 아키텍처 수정 최종 완료

H1~H5/F1~F3를 다섯 앱에 반영했고 각 README를 갱신했습니다. 추가 후보14개는 구현하지 않았습니다. 공통 저장소의 정적 경계 검사로 기존 FSD28건·Rust 직접 infrastructure import3건을 검출하는 baseline과, 수정 후 전체 통과를 확인했습니다.

- 최종 앱 테스트: Movie Node4/Rust5, Folder Node10/Rust26, Repo TS9/Rust15, Bookmark Node5/Rust33, Tree Node5/Rust4. 앱 타입·빌드·cargo check 통과, Repo Storybook 빌드 통과. 공통 전체 check Node25/Rust35·타입·소비 빌드·Storybook 통과.
- review-data는 다섯 앱 Rust83개를 직접 재실행하고 transaction·cancel/commit·DTO·지연 경로 조회·timestamp 순서를 확인했습니다. review-ui는 화면 이동 전후 로직, 공개 API/순환 의존, Tree 저장소, Storybook provider 및 baseline/현재 경계 검사를 확인했습니다. 두 독립 리뷰에서 새 회귀는 발견하지 못했습니다.
- 중간 확인에서 발견한 Folder 설정 조회 시점과 Repo catalog/timestamp 시점 변화를 수정하고 fake 테스트로 보완했습니다.
- 네이티브 UI·패키징과 실제 사용자 데이터 검증은 하지 않았습니다. 이전 이미지3건/root 경로 P3와 큰 page 모델 분리 권고는 남아 있습니다. 기존 dirty 작업을 보존했으며 commit/push/도구 업그레이드는 하지 않았습니다.

[수정 보고서](docs/architecture-fix-report.md), [작업 직전 snapshot 대비 변경 목록](docs/architecture-fix-changes.json)에 결과를 기록했습니다. 기존 Herdr 담당·리뷰 탭은 유지합니다.

## 남은 기능 리뷰 수정 시작

2026-10-05 계속 진행 요청에 따라 이미지3건과 root 경로 문제를 수정합니다. 작업 직전 snapshot: `/var/folders/3z/mcf5cp4n0t567wk9p_kjrpp80000gn/T/remaining-fixes-baseline-_rzae4t3`. 공통 구현 선행 검증 후 소비 앱 적용·보고·독립 리뷰 순서를 유지합니다.

공통 file-tree 경로 변환을 수정했고 `/`·trailing separator·유사 prefix·왕복 경계 테스트를 추가했습니다. 공통 Node29개 및 file-tree 타입 검사가 통과했습니다. 기존 POSIX 경로 계약을 유지하며 앱 연결 검증은 공통 image-store 완료 후 진행합니다.

공통 image-store에 여러 이미지의 staged removal, 명시 rollback/commit, 격리 정리 실패 결과를 추가했습니다. 끝점 stem 저장·조회·삭제·이전, 부분 stage 실패, 복원 충돌, 상대 symlink, 디렉터리 보호 테스트를 추가했습니다. 중간 전체 check(Node29/Rust45·타입·빌드·Storybook)는 통과했습니다. 파일시스템의 대소문자 별칭과 실제 파일명 보존 조건을 마지막으로 보완한 뒤 소비 앱 연결을 진행합니다.

공통 최종 check(Node29/Rust45·타입·소비 빌드·Storybook)를 재통과했습니다. case-sensitive 파일을 일괄 거부하는 중간 구현을 제거하고, 중복 별칭 실패 시 복원하는 제한을 명시했습니다. 이후 Bookmark 담당에게 application removal port 및 단일/그룹 삭제 연결을 배정하고, Tree 담당에게 모델·소비 검증과 README 갱신, Folder 담당에게 기존 image API 소비 영향 검증을 배정했습니다.

Folder 영향 검증은 Rust26·cargo check·타입·빌드 통과이며 lockfile의 runtime tempfile 참조만 추가했습니다. Tree는 실제 @pierre/trees 모델에서 `/`·trailing root의 초기 행/하위 경로 추가/선택 왕복을 확인했고, paths4·설정 Node5·Rust4·타입·빌드가 통과했습니다. Tree 앱 코드는 바꾸지 않고 README 상태를 갱신했습니다. Bookmark는 removal lifecycle port 연결을 진행 중입니다.

공통 독립 리뷰는 처음에 추가 지적 없음으로 보고했으나 조정자가 실제 파일명 `.png `·`. png`·개행 suffix 허용을 회귀 테스트로 재현했습니다. 새 FileName API 검증을 입력 확장자 정규화와 분리해 정확한 지원 확장자만 허용하도록 수정했으며 공통 전체 검사를 다시 실행합니다. Bookmark의 그룹 필터도 같은 검증을 사용하고 추가 보호 fixture를 요청했습니다.

공통 최종 보완은 Node29/Rust46(image-store21)·전체check 재통과했고 review-data도 image-store21개를 직접 재실행해 추가 지적 없음으로 확인했습니다. review-ui는 Tree paths4와 실제모델 fixture를 독립 검증했습니다. Bookmark 구현 반영과 기존 테스트 통과를 사용자에게 보고하고 앱 독립 리뷰를 진행했습니다. UI 리뷰에서 committed cleanup 오류의 중복삭제 count 과소표시와 그룹 삭제 뒤 reload 실패 시 dialog/화면 불일치 P3 두 건을 발견해 담당자에게 수정·회귀검증을 요청했습니다. Backend는 현재 Rust39개 통과 및 별도 fixture 검증 중입니다.

## 남은 기능 리뷰 수정 최종 완료

2026-10-05 shared-code-review의 이미지1·2·3과 root 경로5를 수정했습니다. 공통 먼저 구현·검증 후 Bookmark에 연결하고 Tree/Folder 소비를 검증했으며 적용 보고 후 독립 앱 리뷰를 완료했습니다.

- 공통: 끝점 stem 호환, 여러 이미지 준비·복원·확정 API, 엄격한 실제 파일명 확장자 검증, POSIX root/trailing separator 변환. Node29/Rust46(image-store21)·타입·소비 빌드·Storybook 전체 check 통과.
- Bookmark: application removal 포트로 JSON 실패 시 이미지 복원, 그룹 지원 파일 선별, `/trailer.` legacy 호환을 연결했습니다. Rust40·Node9·타입·빌드·cargo check·수정 Rust fmt·아키텍처 검사 통과입니다. 전체 cargo fmt 검사는 기존 private_browser.rs 미포맷으로 실패하며 해당 파일은 snapshot과 동일하게 보존했습니다.
- Tree: paths4·Node5·Rust4·타입·빌드 및 실제 @pierre/trees 모델에서 root 두 형식의 초기 행/graft/선택 왕복 확인. 앱은 README만 변경했습니다. Folder는 Rust26·타입·빌드·check 통과, Cargo.lock runtime tempfile 참조만 변경했습니다. Movie/Repo 소스는 변경하지 않았습니다.
- review-data는 공통21·최종 Bookmark40 테스트를 직접 재실행하고 독립 readonly JSON fixture에서 자료 보존·재시도를 검증했습니다. review-ui는 Tree 모델과 수정된 삭제 결과 처리4개 테스트를 실행했습니다. 새로 발견한 완료 개수 과소표시와 group reload 실패 불일치 P3 두 건을 수정하고 재리뷰 승인받았습니다. 최종 추가 회귀는 발견되지 않았습니다.
- JSON 성공 후 격리 정리 경고는 이미 삭제가 반영된 상태로 표시합니다. 프로세스 중단/전원 장애 자동 복구와 다중 프로세스 원자성은 제공하지 않으며, 그룹 마지막 settings 쓰기 실패의 기존 부분성 계약도 유지합니다. 네이티브 UI·패키징은 실행하지 않았습니다. 실제 사용자 데이터·commit/push·도구 업그레이드는 하지 않았습니다. 기존 Herdr 탭을 유지합니다.

[수정 보고서](docs/remaining-review-fixes-report.md), [이번 snapshot 대비 변경 목록](docs/remaining-review-fixes-changes.json)에 결과를 기록했습니다. 문서 링크·여섯 저장소 git diff --check·다섯 앱 아키텍처 검사를 확인했습니다. 추가 공통 후보14개의 구현은 이번 범위에 포함하지 않았습니다.

## 공통 저장소 공개 및 커밋·푸시

2026-10-05 사용자가 공통 모듈의 공개 GitHub 저장소 생성과 커밋·푸시를 명시적으로 요청했습니다. 앞선 commit/push 제외 조건은 이번 공통 저장소 게시에 한해 대체됩니다. `gh repo create yoophi/explorer-kit --public --source=. --remote=origin`으로 https://github.com/yoophi/explorer-kit 을 생성하고 origin을 연결했습니다.

현재 공통 구현·테스트·Storybook·리뷰 문서와 작업 이력을 main 브랜치에 커밋하여 푸시합니다. 공개 대상 136개 파일에서 일반적인 인증정보 패턴과 자격 증명 파일명이 발견되지 않았고 git diff --check가 통과했습니다. 직전 공통 pnpm check(Node29/Rust46·타입·소비 빌드·Storybook) 통과 결과를 유지하며 이번 게시에서는 소스 동작을 변경하지 않았습니다. 다섯 소비 앱은 커밋·푸시하지 않으며 기존 sibling 경로 의존성을 유지합니다. npm/crates.io 배포는 수행하지 않습니다.

공통 구현 커밋 `6693f14`를 origin/main에 푸시했습니다. GitHub visibility PUBLIC·기본 브랜치 main 및 원격/로컬 커밋 일치를 확인했습니다. 이 완료 기록은 후속 문서 커밋으로 함께 푸시합니다.

## 탐색 스트리밍·점진적 렌더링 확대 시작

2026-10-05 사용자 요청. Folder는 항목 이벤트/점진적 목록을 이미 사용하며 Repo는 진행 상황만 스트리밍한다. Movie·Tree는 전체 반환을 기다린다. Bookmark는 이미지 정리 외 파일 탐색 목록이 없어 제외한다. 공통 fs-core를 먼저 구현·검증하고 기존 Herdr 탭에서 소비 앱을 연결한다. 작업 직전 snapshot: `/var/folders/3z/mcf5cp4n0t567wk9p_kjrpp80000gn/T/streaming-baseline-8gl3gp4s`.

공통 fs-core에 콜백·취소 기반 scan_files_stream/list_dir_stream을 추가했고 기존 배열 API의 필터·정렬 계약을 유지했습니다. Node29/Rust50·타입·빌드·Storybook 전체 검증 통과 후 movie-shared/tree-shared/repo-shared 기존 Herdr 탭에 앱 연결을 배정했습니다. Folder는 이미 80ms 단위 점진 표시 중이며 Bookmark는 적용 대상이 아닙니다.

중간 조정 리뷰에서 Movie의 로컬 registry 복제를 공통 scan-job 재사용으로 교체하고 Tree의 부분 setQueryData를 QueryClient별 임시 store로 분리하도록 수정했습니다. Tree의 첫 항목 이전 빈 폴더 표시와 재조회 시 루트 트리 상태도 보완했습니다. Repo는 inspection 항목 이벤트·50ms 임시 목록·취소 즉시 복귀·임시 메타데이터 편집 금지를 적용했고 TS14/Rust17·타입·앱/Storybook 빌드·cargo check/fmt를 통과했습니다. Movie는 Node7/Rust8·타입·앱/Storybook 빌드·check/fmt를 통과했습니다. 적용 결과를 사용자에게 보고한 뒤 기존 review-data/review-ui 탭에 snapshot 기준 독립 리뷰를 배정했습니다. Tree 최종 검증은 진행 중입니다.

독립 리뷰에서 Repo worktree parentId 누락과 Movie 재검색 중 선택 폴더 초기화 P2를 발견했습니다. Repo는 경량 관계 인덱스와 동일 ID 수정 이벤트로 보완했고 실제 Git main-first/worktree-first 포함 Rust18·TS14 검증 및 backend 재리뷰 승인 완료입니다. Movie는 root별 선택 정책을 추가하여 진행 중/오류에서는 선택을 유지하고 완료 목록에서만 보정하도록 수정, UI 재리뷰 중입니다. Tree FSD 테스트 위치·동일 목록 재조회시 tree key·Unicode 정렬을 보완했습니다. 조정자가 Tree Node14와 전체 아키텍처 검사를 통과했고, agent-browser mock IPC에서 지연 항목 부분 표시·전체 완료·숨김 토글·폴더 이동과 최종 페이지 오류0을 확인했습니다. 초기 Vite optimize 중 import 오류는 새 세션 재검증으로 해소했습니다. 테스트 서버/브라우저는 종료했습니다.

## 탐색 스트리밍 적용·리뷰 완료

2026-10-05 공통 fs-core callback·취소 API를 먼저 검증한 뒤 Movie·Tree·Repo에 스트리밍 이벤트와 점진 렌더링을 반영했습니다. Folder는 이미 구현되어 유지했고 Bookmark는 사용자용 디렉터리 탐색 목록이 없어 제외했습니다.

- 공통: Node29·Rust50 및 타입·소비 빌드·Storybook 전체 check 통과.
- Movie: Node14·Rust8 및 타입·앱 빌드·cargo check/fmt 통과. 기본 glob/정렬 보존, 성공 전 임시 목록 분리, 취소·교체·실패/늦은 이벤트 차단, 완료 목록 기준 선택 보정. 마지막 UI 변경 후 Storybook 빌드도 최종 통과했습니다.
- Tree: Node14·Rust6 및 타입·앱 빌드·check/fmt 통과. QueryClient별 임시 진행 상태·작업 공유, 작은 폴더 시간 기준 배치, 완료 캐시 보존, 동일 root 재조회시 모델 유지. 모의 IPC 브라우저에서 Scanning1+첫 행·전체완료·숨김 토글·폴더 이동·페이지 오류0을 확인했습니다.
- Repo: TS14·Rust18 및 타입·앱/Storybook 빌드·check/fmt 통과. 검사 중 임시 항목·부모관계 수정 이벤트, 취소 즉시 저장 목록 복귀, 성공 commit 후 최종 확정.
- backend 독립 리뷰는 Repo 부모관계 수정 후 실제 Git main-first/worktree-first 포함 Rust18을 재실행했고 추가 회귀 없음으로 확인했습니다. UI 독립 리뷰는 Movie 선택 보정·Tree FSD/모델 유지·세 앱 이벤트 상태를 재검토하고 관련 Movie10·Tree9·Repo8 테스트와 전체 아키텍처 검사를 직접 통과했습니다. 추가 회귀 없음으로 승인했습니다.

네이티브 창·패키징·실제 대용량 OS 탐색 벤치마크는 하지 않았습니다. Repo 목록은 discovery 종료 후 inspection 중부터 표시하며 OS I/O 자체의 즉시 중단이나 backpressure를 제공하지 않습니다. 기존 dirty 작업과 Herdr 탭을 보존했습니다. 이번 변경은 commit/push하지 않았습니다. [조사·적용 보고서](docs/streaming-exploration-report.md)와 [작업 직전 snapshot 대비 변경 목록](docs/streaming-exploration-changes.json)에 결과를 기록했습니다.

## 공통 스트리밍 변경 게시 시작

2026-10-05 계속 진행 요청에 따라 공통 저장소 게시 흐름을 이어갑니다. 여섯 저장소의 스트리밍 변경 파일이 최종 리뷰 snapshot 해시와 모두 일치하고, explorer-kit의 HEAD와 origin/main이 일치함을 확인했습니다. 공통 공개 대상에서 일반적인 자격 증명 패턴은 발견되지 않았습니다. 이미 통과한 검증·리뷰 이후 소스 변경이 없어 테스트를 반복하지 않고 fs-core 스트리밍 API·테스트·보고서를 커밋·푸시합니다. 소비 앱은 커밋·푸시하지 않습니다. streaming-exploration-changes.json은 구현·리뷰 완료 시점의 snapshot으로 유지합니다.

공통 스트리밍 구현 커밋 `13c1eb5`를 origin/main에 푸시했습니다. 구현·테스트·문서 13개 파일을 반영했고 원격 push 성공을 확인했습니다. 소비 앱의 변경은 로컬에 유지합니다. 이 완료 기록과 보고서 게시 상태를 후속 문서 커밋으로 푸시합니다.
