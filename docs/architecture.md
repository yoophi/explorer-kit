# 공유 경계와 통합

UI와 Rust I/O는 별도 패키지로 제공하고 앱이 연결합니다. Base UI와 Radix UI API는 섞지 않습니다. 스캔 클라이언트와 이미지 입력에는 Tauri 의존성이 없습니다.

```mermaid
flowchart TB
    App[앱의 도메인과 사용자 동작]
    UI[UI와 트리 목록 평점]
    Client[스캔 이미지 컬렉션 함수]
    IPC[앱의 Tauri adapter]
    Rust[파일 조회 JSON 이미지 저장 스캔 작업 crate]
    App --> UI
    App --> Client
    Client --> IPC
    IPC --> Rust
```

공통 저장소 검증 후 소비 앱별로 관련 패키지를 적용합니다. 원본의 미커밋 작업을 보존하고, 기능 변경을 공통 코드 적용과 함께 섞지 않습니다.

| 앱 | 우선 적용 | 유지할 계약 |
| --- | --- | --- |
| movie-explorer | core formatter, fs-core scan, dev-tools | 영상 기본 glob, snake_case DTO, 세 가지 목록 보기, 기존 테마 |
| movie-folder-explorer | ui-base, scan-client, image-input, collection-core, json-store | folder 이벤트 adapter, 폴더명 메타데이터, rename 부작용, cache schema |
| repo-explorer | json-store, dev-tools | repository별 메타데이터 위치, 카탈로그 schema, worktree 관계 |
| site-bookmark-browser | ui-base, rating, image-input, collection-core, json-store | URL identity, 0.5점 평점, v1/v2 migration과 이미지 경로 |
| tauri-tree-file-explorer | ui-radix, core, file-tree, file-list, fs-core list | URL 선택 동기화, 지연 로딩, 숨김 토글, 패널 저장 |

통합 결과는 각 앱의 typecheck/build, 기존 도메인 테스트, Rust 테스트로 확인합니다. 추가 리뷰에서는 원본 데이터 호환성, React 중복 인스턴스, CSS 탐색 범위, 이벤트 종료·cleanup을 우선 확인합니다.

## 백엔드 공통 기능 승격

```mermaid
flowchart LR
    A[앱의 schema naming traversal 정책] --> J[json-store 조건부 transaction]
    A --> I[image-store 교체와 후보 선택]
    A --> S[scan-job 등록 취소 수명]
    J --> W[atomic byte writer]
    I --> W
    S --> T[앱의 Tauri 이벤트 adapter]
```

공통 JSON transaction은 Unchanged와 Write를 구분하며, schema를 모르는 저수준 버전 검사만 제공합니다. 이미지 저장은 filename stem을 입력받고 저장 위치와 key 생성은 앱이 정합니다. 정리 실패는 저장 경로와 함께 보고하고 묵시적 성공으로 취급하지 않습니다. 스캔 registry는 작업 ID 중복·취소 token·RAII 정리·terminal 판정을 담당하며 탐색 순서·Git 검사·영상 확장자는 알지 못합니다.

Movie와 Tree의 단일 응답 계약은 유지하며 blocking I/O는 앱 adapter에서 offload합니다. Folder의 stream DTO는 유지하고 Repo는 scanId와 취소를 앱 호출부까지 연결합니다. 모든 파일에 걸친 transaction이나 프로세스 간 lock으로 확대 해석하지 않습니다.

## 설정 UI와 저장

```mermaid
flowchart TD
    App[앱별 설정 항목과 검증 정책] --> UI[settings-ui 섹션 필드 토글 상태]
    App --> Browser[settings-core 브라우저 설정]
    App --> IPC[Tauri 설정 adapter]
    Browser --> Local[앱별 localStorage key]
    IPC --> Rust[settings-store 정책 callback]
    Rust --> JSON[json-store 공통 잠금과 atomic write]
    JSON --> File[기존 앱 설정 JSON]
```

Movie/Repo의 화면 설정과 Tree의 숨김/패널 배치는 브라우저 설정입니다. Folder/Bookmark의 그룹·경로·별칭은 기존 Rust JSON 설정에 남깁니다. 두 저장 계층은 서로 다른 설정을 담당하며 같은 값을 중복 저장하지 않습니다. UI는 어떤 저장 방식을 사용하는지 알지 못합니다.

## 탐색 스트리밍 확대

Movie/Tree의 기존 배열 IPC는 호환용으로 유지하고, 화면용 탐색에는 항목·종료 이벤트를 추가합니다. 공통 fs-core는 항목 callback·취소 predicate만 알며 transport를 참조하지 않습니다. application port는 앱 DTO·정책을 정의하고 outbound adapter가 fs-core를 호출합니다. Tauri inbound adapter는 작업 등록과 blocking worker, 이벤트 전달을 담당합니다.

React는 임시 탐색 결과와 완료한 서버 상태를 구분합니다. 폴더/glob/숨김 설정이 바뀌면 이전 작업의 이벤트를 새 목록에 섞지 않으며, 완료 전 전체 결과를 캐시에 확정하지 않습니다. Repo의 Git 검사와 catalog commit은 도메인 전용 흐름으로 남깁니다. 적용·검증 상태는 [탐색 스트리밍 보고서](streaming-exploration-report.md)를 참고하세요.

## 추가 후보의 공통 경계

`collection-policy`는 그룹 컬렉션과 숫자 평점의 순수 Rust 규칙을 제공한다. 폴더명·URL 문법, nullable 의미, JSON 및 이미지 연쇄 삭제는 앱의 domain/application이 소유한다. `fs-core/walk`는 두 기존 순회 정책을 명시적으로 구분하며 방문 callback에 검사·DTO 생성을 맡긴다.

```mermaid
flowchart LR
    Page[앱 페이지와 feature] --> Composite[공통 필터 썸네일 폼 그룹 스캔 UI]
    Page --> Draft[settings-core 초안]
    Page --> Paste[image-input 대상과 요청 수명]
    Page --> Scan[scan-client ID ack 취소 수명]
    Page --> Selection[collection-core 선택 보정]
    App[앱 application과 adapter] --> Policy[collection-policy 순수 규칙]
    App --> Walk[fs-core 순회 정책]
    App --> Image[image-store 완료와 정리 경고]
```

공통 React에는 Tauri·React Query·라우터·앱 store 의존성이 없다. 스캔 세션의 ID gate를 공유하되 이벤트 구독, 배치 갱신, 서버 캐시 확정은 앱에 유지한다. 이미지 붙여넣기 hook은 시작 전 오래된 저장 요청을 버리지만 이미 시작한 파일 쓰기를 취소하지 않는다. Movie/Repo의 초기·부분 결과 선택 정책은 공통 선택 함수에 전달할 목록과 fallback을 만드는 앱 adapter에서 보존한다. [적용 보고서](promotion-14-report.md)에 실제 두 소비 경로를 기록한다.
