# Explorer Kit 공통 코드 적용과 리뷰

당신은 다섯 데스크톱 앱의 공통 코드 적용을 조정하는 에이전트입니다. 아래 지시에 따라 공통 저장소를 먼저 검증하고, Herdr에서 저장소마다 Codex 에이전트 탭을 만들어 구현을 진행하세요. 모든 앱의 적용이 완료되면 결과를 보고하고 독립 리뷰를 진행하세요. 리뷰에서 발견한 문제를 수정하고 필요한 검증을 마친 뒤 최종 보고하세요.

## 작업 경로와 현재 상태

- 작업 루트: `/Users/yoophi/project`
- 공통 저장소: `/Users/yoophi/project/explorer-kit`
- 공통 저장소 초기 구현 커밋: `9ac1e4f`
- 원본 저장소:
  - `/Users/yoophi/project/movie-explorer`
  - `/Users/yoophi/project/movie-folder-explorer`
  - `/Users/yoophi/project/repo-explorer`
  - `/Users/yoophi/project/site-bookmark-browser`
  - `/Users/yoophi/project/tauri-tree-file-explorer`

사용자가 언급한 `movie-eexplorer`, `site-bookmark-explorer`는 위 실제 디렉터리명으로 해석했습니다.

공통 저장소에는 TypeScript source package 9개, 개발 도구 1개, Rust crate 2개가 구현되어 있습니다. 초기 검증에서 TypeScript 검사, JS·CSS 통합 빌드, Node 테스트 16개, Rust 테스트 6개가 통과했습니다. 이전 작업에서는 원본 앱을 수정하지 않았고 Herdr 탭 생성·앱별 적용·독립 리뷰도 시작하지 않았습니다. 재개 시에는 실제 Git 상태와 실행 중인 에이전트를 확인하여 이후 변경이나 이미 진행된 작업을 중복 수행하지 마세요.

## 먼저 읽을 자료

각 저장소에 적용되는 `AGENTS.md`를 읽고 다음 공통 문서를 확인하세요.

- `explorer-kit/README.md`: 패키지 API, 로컬 연결 방법, 지원 범위
- `explorer-kit/docs/architecture.md`: 공유 경계와 앱별 계약
- `explorer-kit/docs/provenance.md`, `explorer-kit/provenance.json`: 복사 출처와 파생 변경
- `explorer-kit/docs/validation.md`: 기존 검증 범위
- `explorer-kit/docs/integration-handoff.md`: 앱별 작업 조건

문서에 적힌 과거 상태보다 현재 소스와 실행 결과를 우선하세요.

## 1단계 공통 기능 완료 확인

공통 기능이 완료되고 검증된 후에만 원본 앱 통합 작업을 시작하세요.

```sh
cd /Users/yoophi/project/explorer-kit
pnpm install --frozen-lockfile
pnpm check
```

실패하면 원인을 확인하여 공통 저장소에서 먼저 해결하세요. 테스트 통과만으로 네이티브 UI까지 검증되었다고 보고하지 마세요. 공통 구현을 수정했다면 출처·변경 설명과 관련 테스트를 함께 갱신하세요.

## 2단계 Herdr 에이전트 탭 구성

각 원본 저장소마다 별도의 Herdr agent tab을 생성하세요. 다섯 구현 에이전트 모두 다음 설정을 사용합니다.

- Agent kind: `codex`
- Model: `gpt-6-sol`
- Reasoning effort: `medium`
- 작업 디렉터리: 각 담당 저장소의 절대 경로
- 권장 에이전트 이름: `movie-shared`, `folder-shared`, `repo-shared`, `bookmark-shared`, `tree-shared`

설치된 Herdr CLI의 도움말과 `herdr --skill`을 읽고 실제 지원하는 명령으로 구성하세요. 모델·추론 수준 전달 방식도 설치된 Codex CLI 도움말로 확인하세요. 다른 모델이나 내장 병렬 에이전트로 임의 대체하지 마세요.

Herdr 제어 전에 `HERDR_ENV=1`인지 확인하세요. 이전 세션은 이 변수가 없어 제어를 시작하지 못했습니다. 현재도 Herdr 밖이라면 환경을 위조하거나 사용자의 다른 세션을 임의 제어하지 말고, 공통 저장소 작업만 마친 뒤 Herdr 안의 세션에서 이어갈 수 있도록 정확한 상태를 보고하세요.

탭은 사용자 포커스를 바꾸지 않도록 생성하고, 생성 응답의 실제 탭·pane ID를 사용하세요. 기존 에이전트가 이미 같은 일을 수행 중이면 상태를 읽고 이어서 조정하세요. 정상 동작 중인 탭을 중복 생성하거나 사용자 소유 탭을 닫지 마세요.

## 3단계 앱별 공통 코드 적용

각 에이전트에게 이 문서의 공통 조건과 자신의 담당 행을 전달하세요. 한 구현 에이전트는 한 원본 저장소만 수정합니다. 공통 저장소 변경이 필요하면 조정자에게 요청하고, 여러 에이전트가 공통 저장소를 동시에 수정하지 않도록 하세요.

| 담당 저장소 | 적용할 공통 구현 | 보존하고 검증할 동작 |
| --- | --- | --- |
| movie-explorer | `@yoophi/explorer-core`의 formatBytes, `explorer-fs-core`의 scan_files, `@yoophi/explorer-dev-tools` | 영상 기본 glob, 빈 패턴 처리, snake_case DTO, glob 오류, 세 가지 보기 모드, 기존 테마 |
| movie-folder-explorer | `@yoophi/ui-base`, `@yoophi/scan-client`, `@yoophi/image-input`, `@yoophi/collection-core`, `explorer-json-store` | folder 이벤트를 item으로 변환하는 adapter, scanId·취소·종료 순서, 캐시 version/rootPaths, 설정 migration, rename 후 경로 갱신, 이미지 저장 위치 |
| repo-explorer | `explorer-json-store`, `@yoophi/explorer-dev-tools` | 중앙 repositories.json과 저장소별 .repo-explorer.json의 경로·schema, README, worktree 관계, 설명·태그·고정 상태 |
| site-bookmark-browser | `@yoophi/ui-base`, `@yoophi/rating`, `@yoophi/image-input`, `@yoophi/collection-core`, `explorer-json-store` | v1/v2 migration, groupId+path identity, 이미지 경로, 중복 URL 정리, 0.5점 평점, 그룹과 Markdown 가져오기 |
| tauri-tree-file-explorer | `@yoophi/ui-radix`, `@yoophi/explorer-core`, `@yoophi/file-tree`, `@yoophi/file-list`, `explorer-fs-core`의 list_dir | URL 선택·뒤로/앞으로 이동, 지연 로딩, 디렉터리 symlink, 숨김 표시, 패널 비율 저장 |

### 모든 구현 에이전트의 조건

1. 변경 전에 Git 상태·diff·untracked 파일을 확인하고 기존 사용자 변경을 보존하세요. 이전 조사에서 movie-explorer는 초기 구현이 untracked였고, movie-folder-explorer와 site-bookmark-browser에는 미커밋 변경이 있었습니다.
2. 공통 패키지 의존성만 추가하지 말고 실제 실행 경로가 공통 구현을 호출하도록 바꾸세요. 불필요해진 로컬 중복 구현은 이번 작업 범위에서 제거하거나 호환 wrapper로 축소하세요. 외부 호출 계약이 필요하면 wrapper를 유지하고 이유를 기록하세요.
3. 로컬 TypeScript source package는 README의 `link:` 방식으로 연결하세요. 단일 앱과 `apps/desktop`에서 상대 경로가 다릅니다. Vite의 React dedupe, dependency prebundle 제외, 파일 접근 허용 범위와 Tailwind source 경로를 확인하세요. 기존 설정은 보존하세요.
4. Rust는 Cargo.toml 위치 기준의 path dependency로 연결하세요. Tauri command, 앱 데이터 경로, DTO 변환과 도메인 규칙은 앱에 남기세요.
5. Base UI와 Radix UI의 API를 섞지 말고 기존 화면·동작을 유지하세요. 파일 트리를 worktree 관계 트리로 강제 통합하지 마세요.
6. 공통 `scan_files`의 빈 패턴 기본값은 모든 파일입니다. Movie의 영상 확장자 기본값은 앱에서 명시적으로 유지하세요.
7. JSON 스키마·파일 위치·migration을 유지하세요. 필요한 read-modify-write는 공통 갱신 API를 사용하고, 단순 save 호출만으로 전체 갱신이 원자적이라고 간주하지 마세요. 여러 프로세스·여러 파일의 트랜잭션은 제공되지 않습니다.
8. 이미지 preview URL의 교체·unmount 해제, 스캔 구독 cleanup과 늦은 이벤트 처리를 유지하세요.
9. 원본 사용자의 실제 데이터에 대해 rename·삭제·migration을 시험하지 마세요. 테스트 fixture나 임시 디렉터리를 사용하세요.
10. 요청 범위를 벗어난 기능 추가나 전면 아키텍처 개편을 섞지 마세요. 사용자 변경을 포함한 일괄 commit, reset, clean, push와 원격 게시를 하지 마세요.

## 4단계 적용 검증과 중간 보고

각 에이전트는 담당 앱에서 제공하는 typecheck/build와 기존 테스트를 실행하고 Rust 테스트 또는 check를 수행하세요. 필요한 경우 관련 회귀 테스트를 추가하세요. 실행 가능한 개발 환경에서는 실제 앱의 핵심 탐색 흐름을 확인하고, 시각·네이티브 검증을 하지 못하면 그 범위를 명시하세요.

에이전트별로 다음 내용을 조정자에게 보고하게 하세요.

- 적용한 공통 패키지와 변경 파일
- 제거한 중복 구현 또는 유지한 wrapper와 이유
- 실행한 검증 명령과 결과
- 기존 실패와 이번 변경으로 생긴 실패의 구분
- 데이터 호환성과 남은 위험·미검증 항목

조정자는 다섯 앱의 결과를 모아 사용자에게 **공통 코드 반영 완료 상태를 먼저 보고**하세요. 일부 실패·미완료가 있으면 전체 완료로 표현하지 마세요. 이어서 아래 독립 리뷰를 진행하세요.

## 5단계 독립 리뷰와 수정

구현자와 다른 에이전트에게 최종 diff와 검증 결과를 리뷰하도록 배정하세요. 필요하면 별도의 Herdr 리뷰 탭을 생성하며, 리뷰 에이전트도 `codex / gpt-6-sol / medium` 설정을 사용하세요. 리뷰 범위에는 공통 저장소와 다섯 앱의 연결부를 포함합니다.

다음 항목을 우선 확인하세요.

- 공통 코드가 실제 사용되며 오래된 중복 구현이 계속 실행되지 않는가
- React 중복 인스턴스, 링크 경로, CSS 누락, source package 빌드 문제가 없는가
- DTO·JSON 스키마·기존 데이터 경로·migration이 호환되는가
- 스캔의 시작·완료·실패·취소와 구독 정리가 올바른가
- 파일 검색·symlink·기본 glob·worktree 관계가 유지되는가
- 이미지 preview 정리, 평점 의미와 저장 부작용이 유지되는가
- 검증 결과가 실제 실행 증거와 일치하는가

리뷰 결과에는 심각도, 파일·라인, 재현 조건 또는 근거를 포함하세요. 발견 사항은 담당 구현자에게 전달하고 수정을 조정하세요. 수정 후 관련 검증과 재리뷰를 진행하세요. 미해결 중대한 문제가 있으면 완료를 선언하지 말고 정확한 차단 원인을 보고하세요.

## 최종 완료 기준

- 공통 저장소 검증이 통과했다.
- 다섯 원본 앱 모두 관련 공통 구현을 실제로 사용한다.
- 기존 사용자 변경과 데이터 계약이 보존되었다.
- 각 앱의 적용 결과와 검증 증거가 정리되었다.
- 독립 리뷰를 마쳤고 발견 사항의 처리 상태가 기록되었다.
- 사용자에게 저장소별 변경 요약, 검증 결과, 리뷰 결과, 남은 제한을 보고했다.

최종 보고와 검증·리뷰 기록은 공통 저장소의 `docs/`에 한국어로 남기고 링크를 제공하세요. 문서 파일명은 영어 kebab-case, 다이어그램이 필요하면 Mermaid를 사용하세요. 원격 게시나 push는 이 작업에 포함되지 않습니다.

## 후속 요청: 백엔드 공통 기능 승격

1차 적용 이후 사용자가 백엔드 구현 차이를 점검하고 공통 기능으로 승격하는 방식을 실행하도록 요청했습니다. 상세 요구와 재현 결과는 `docs/backend-consistency-audit.md`, 작업 결과는 `docs/backend-promotion-report.md`에 있습니다.

추가 범위는 JSON Unchanged/Write 갱신·버전 보호, 공통 image-store, 공통 scan-job, Bookmark migration 재시도, Folder/Repo 스캔 생명주기 정렬, Movie/Tree의 blocking I/O offload입니다. 기존 앱 schema·파일 경로·도메인 탐색 정책을 유지합니다. 공통 모듈을 먼저 검증한 후 앱에 적용하고 독립 리뷰합니다.

진행 상태는 CONTEXT의 최신 기록을 우선합니다. 이미 완료된 구현·탭 생성을 중복하지 말고, 남아 있는 리뷰 지적 사항부터 처리하세요.

## 후속 요청: 다섯 앱 설정 UI·저장 공통화

공통 settings-ui 구성 요소와 settings-core 브라우저 저장소, Rust settings-store를 먼저 구현·검증합니다. Movie(폴더·적용 glob·보기), Repo(검색 루트·깊이), Tree(숨김 표시·기존 패널 배치)는 공통 브라우저 저장 계약을 사용합니다. Folder·Bookmark의 기존 도메인 설정은 기존 JSON 경로·스키마를 유지하는 공통 Rust 저장소 어댑터를 사용합니다. 기존 UI 안에서 공통 섹션·필드·토글·오류 상태를 적용하며 별도 저장 원본을 만들지 않습니다.

기존 Herdr codex/gpt-6-sol/medium 앱 탭을 재사용합니다. 공통 검증 후 앱별 통합, 적용 결과 보고, 독립 리뷰 순서를 지킵니다. 이전 shared-code-review의 미해결 항목은 별도 이력으로 유지하며 이번 설정 변경이 닿는 부분만 필요한 범위에서 처리합니다. 실제 데이터 테스트·commit/push·도구 업그레이드는 하지 않습니다.

## 후속 요청: 공통 UI Storybook

공통 저장소에 구현된 프론트엔드 UI를 Storybook으로 구성한다. 기존 공통 패키지의 public API를 직접 소비하고 Base UI/Radix UI 구분, 설정·파일 탐색·평점의 상태별 예제, 메모리 fixture, 밝은/어두운 테마와 자동 문서를 제공한다. 타입·전체 검사·정적 빌드와 주요 브라우저 동작을 확인하고 CONTEXT.md에 기록한다.

## 후속 요청: 두 앱 이상 공통 기능 조사

다섯 앱 전체가 아닌 두 앱 이상에서 사용되는 백엔드 기능·프론트엔드 UI·상태관리의 공통 승격 가능성을 조사한다. 이미 승격된 기능은 구분하고 현재 두 소비처의 코드 근거, 다른 정책, 공통화 경계, 우선순위와 검증 조건을 문서화한다. 이번 요청의 범위는 조사이며 후보 구현을 자동 시작하지 않는다.

## 후속 요청: 아키텍처 리뷰 지적 수정

사용자가 다음 작업으로 아키텍처 리뷰 지적 수정을 선택했다. architecture-review.md의 H1~H5/F1~F3를 대상으로 기존 동작·schema·IPC·transaction/취소 계약을 유지하면서 다섯 앱의 port/adapter 및 FSD 경계를 정리한다. 공통 기능14개 추가 승격은 이번 범위가 아니다. 기존 Herdr 담당 탭을 재사용하고 적용 보고 후 독립 리뷰를 진행한다. 변경 전 snapshot을 기준으로 기존 사용자 작업을 보존한다.

## 후속 요청: 남은 기능 리뷰 지적 수정

계속 진행 요청에 따라 shared-code-review의 이미지1·2·3 및 root 경로5를 수정한다. 공통 기능을 먼저 구현·검증하고 Bookmark/Tree 소비 경로를 연결한다. JSON/이미지 실패 양방향에서 데이터 보존과 재시도, 점으로 끝나는 path의 legacy 호환, 그룹 이미지 외 파일·디렉터리 보호, 루트 경로 왕복을 검증한다. 기존 Herdr 탭을 재사용하고 적용 보고 후 독립 리뷰한다. 실제 데이터·commit/push·업그레이드는 제외한다.

## 후속 요청: 공통 저장소 공개 및 커밋·푸시

사용자의 명시적 요청에 따라 공통 모듈 explorer-kit을 `gh repo create yoophi/explorer-kit --public`으로 생성하고 현재 구현·문서를 커밋하여 main 브랜치에 푸시한다. 이번 요청은 공통 저장소에 한해 앞선 commit/push 제외 조건을 대체한다. 다섯 소비 앱의 커밋·푸시나 npm/crates.io 배포는 포함하지 않는다.

## 후속 요청: 탐색 스트리밍·점진적 렌더링 확대

다섯 앱의 디렉터리 탐색 결과 스트리밍 및 점진적 렌더링 구현을 조사하고 개선 가능한 앱에 적용한다. 공통 fs-core 콜백·취소 API를 먼저 구현·검증한 뒤 Movie·Tree·Repo 담당 탭에서 연결하고 적용 보고와 독립 리뷰를 진행한다. 기존 정렬·필터·저장 확정 계약과 헥사고날/FSD 경계를 보존한다. 이번 변경의 커밋·푸시는 별도 요청 전 수행하지 않는다.

## 후속 요청: 검증된 공통 스트리밍 변경 게시

계속 진행 요청에 따라 앞서 승인한 공통 저장소 게시 흐름을 이어간다. 리뷰가 완료된 explorer-kit의 스트리밍 API·테스트·문서를 커밋하고 origin/main에 푸시한다. 소비 앱의 커밋·푸시는 포함하지 않는다.
