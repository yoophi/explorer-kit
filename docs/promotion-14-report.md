# 추가 후보 14개 구현·통합 보고서

2026-10-05 사용자가 요청한 후보 **14개 전체**를 공통 구현으로 승격하고 항목별 최소 두 앱의 실제 실행 경로에 연결했다. 공통 구현·검증 후 소비 앱 적용과 독립 리뷰 순서를 따랐다. 구현·검증과 최종 독립 리뷰를 완료했다. 게시 상태는 아래에 기록한다.

## 실제 소비 경로

| ID | 공통 API | 실제 소비 코드 |
| --- | --- | --- |
| BE1 | `walk_directories` | [movie-folder-explorer: src-tauri/src/infrastructure/filesystem_directory_scanner.rs](../../movie-folder-explorer/src-tauri/src/infrastructure/filesystem_directory_scanner.rs) · [repo-explorer: apps/desktop/src-tauri/src/infrastructure.rs](../../repo-explorer/apps/desktop/src-tauri/src/infrastructure.rs) |
| BE2 | `upsert_by_key` | [movie-folder-explorer: src-tauri/src/infrastructure/json_last_opened_directory_store.rs](../../movie-folder-explorer/src-tauri/src/infrastructure/json_last_opened_directory_store.rs) · [site-bookmark-browser: src-tauri/src/application/groups.rs](../../site-bookmark-browser/src-tauri/src/application/groups.rs) |
| BE3 | `RatingScale` | [movie-folder-explorer: src-tauri/src/domain/folder.rs](../../movie-folder-explorer/src-tauri/src/domain/folder.rs) · [site-bookmark-browser: src-tauri/src/domain/bookmark.rs](../../site-bookmark-browser/src-tauri/src/domain/bookmark.rs) |
| BE4 | `into_completion` | [movie-folder-explorer: src-tauri/src/infrastructure/image_thumbnail_store.rs](../../movie-folder-explorer/src-tauri/src/infrastructure/image_thumbnail_store.rs) · [site-bookmark-browser: src-tauri/src/infrastructure/library_images.rs](../../site-bookmark-browser/src-tauri/src/infrastructure/library_images.rs) |
| UI1 | `compatible-button` | [movie-explorer: packages/ui/src/components/button.tsx](../../movie-explorer/packages/ui/src/components/button.tsx) · [repo-explorer: packages/ui/src/components/button.tsx](../../repo-explorer/packages/ui/src/components/button.tsx) |
| UI2 | `TagCloud` | [movie-folder-explorer: src/pages/home/ui/home-page.tsx](../../movie-folder-explorer/src/pages/home/ui/home-page.tsx) · [site-bookmark-browser: src/pages/bookmarks/ui/bookmark-browser-page.tsx](../../site-bookmark-browser/src/pages/bookmarks/ui/bookmark-browser-page.tsx) |
| UI3 | `ThumbnailField` | [movie-folder-explorer: src/features/folder-browser/ui/rename-folder-dialog.tsx](../../movie-folder-explorer/src/features/folder-browser/ui/rename-folder-dialog.tsx) · [site-bookmark-browser: src/features/bookmark-browser/ui/bookmark-edit-dialog.tsx](../../site-bookmark-browser/src/features/bookmark-browser/ui/bookmark-edit-dialog.tsx) |
| UI4 | `AsyncFormDialog` | [movie-folder-explorer: src/features/folder-browser/ui/rename-folder-dialog.tsx](../../movie-folder-explorer/src/features/folder-browser/ui/rename-folder-dialog.tsx) · [site-bookmark-browser: src/features/bookmark-browser/ui/bookmark-edit-dialog.tsx](../../site-bookmark-browser/src/features/bookmark-browser/ui/bookmark-edit-dialog.tsx) |
| UI5 | `GroupSelector` | [movie-folder-explorer: src/features/folder-browser/ui/manage-folders-dialog.tsx](../../movie-folder-explorer/src/features/folder-browser/ui/manage-folders-dialog.tsx) · [site-bookmark-browser: src/pages/bookmarks/ui/bookmark-browser-page.tsx](../../site-bookmark-browser/src/pages/bookmarks/ui/bookmark-browser-page.tsx) |
| UI6 | `ScanStatusPanel` | [movie-folder-explorer: src/pages/home/ui/home-page.tsx](../../movie-folder-explorer/src/pages/home/ui/home-page.tsx) · [repo-explorer: apps/desktop/src/pages/repository/ui/RepositoryPage.tsx](../../repo-explorer/apps/desktop/src/pages/repository/ui/RepositoryPage.tsx) |
| ST1 | `syncSettingsDraft` | [movie-explorer: apps/desktop/src/features/preferences/model.ts](../../movie-explorer/apps/desktop/src/features/preferences/model.ts) · [repo-explorer: apps/desktop/src/pages/repository/ui/RepositoryPage.tsx](../../repo-explorer/apps/desktop/src/pages/repository/ui/RepositoryPage.tsx) |
| ST2 | `useImagePaste` | [movie-folder-explorer: src/features/folder-browser/ui/rename-folder-dialog.tsx](../../movie-folder-explorer/src/features/folder-browser/ui/rename-folder-dialog.tsx) · [site-bookmark-browser: src/features/bookmark-browser/ui/bookmark-edit-dialog.tsx](../../site-bookmark-browser/src/features/bookmark-browser/ui/bookmark-edit-dialog.tsx) |
| ST3 | `ScanLifecycle` | [movie-folder-explorer: src/features/folder-browser/api/consume-folder-scan.ts](../../movie-folder-explorer/src/features/folder-browser/api/consume-folder-scan.ts) · [repo-explorer: apps/desktop/src/entities/repository/scan-session.ts](../../repo-explorer/apps/desktop/src/entities/repository/scan-session.ts) |
| ST4 | `reconcileSelection` | [movie-explorer: apps/desktop/src/pages/home/selection.ts](../../movie-explorer/apps/desktop/src/pages/home/selection.ts) · [repo-explorer: apps/desktop/src/entities/repository/selection.ts](../../repo-explorer/apps/desktop/src/entities/repository/selection.ts) |

ST3의 Folder adapter는 `consumeScan`을 통해 공통 `ScanLifecycle`을 소비한다. Movie와 Tree도 같은 `consumeScan` 내부 승격을 사용한다. UI5는 Folder·Bookmark가 공유하는 GroupSelector를 연결했고 Folder의 그룹 생성 행도 공통 UI를 사용한다. 공통 구성 요소의 API·경계·출처는 각 패키지 README와 [출처 기록](provenance.md)에 정리했다.

## 검증

| 저장소 | Node/TS 테스트 | Rust 테스트 | 추가 검증 |
| --- | --- | --- | --- |
| explorer-kit | 49 | 60 + 문서1 | 전체 check, 소비 JS/CSS·Storybook 빌드, Rust fmt |
| Movie | 14 | 8 | 타입, 앱·Storybook 빌드 |
| Folder | 12 | 33 | 타입, 앱 빌드, Cargo check, 수정 Rust fmt |
| Repo | 16 | 20 | 타입, 앱·Storybook 빌드, Cargo check/fmt |
| Bookmark | 11 | 42 | 타입, 앱 빌드, Cargo check, 수정 Rust fmt |
| Tree | 14 | 6 | 타입, 앱 빌드 |

공통 source package를 기존 native Node 테스트에서도 소비할 수 있도록 settings-core·scan-client 내부 `.ts` 경로를 명시하고 클래스 parameter property를 일반 필드 할당으로 바꿨다. 공개 scan API 로딩 회귀 테스트는 type stripping을 지원하는 Node에서 실행한다. 5개 앱 FSD/선택 Rust 경계 정적 검사도 통과했다.

공통 Storybook 브라우저에서 pending 시 제출·취소 비활성화와 Escape 차단, 성공 닫힘, 실패 alert/입력 보존, Tab+Enter 필터 선택과 aria-pressed·disabled·빈 상태를 확인했다. 최종 페이지 오류0이며 서버·검사 세션은 종료했다.

## 보존한 계약과 리뷰 수정

- 순회: Folder의 정렬 DFS·root 포함·오류 정책, Repo의 BFS·깊이·제외 목록·취소·진행 이벤트를 유지한다. metadata·Git 검사·DTO는 앱 callback이다.
- 그룹·평점·이미지: name/id 식별 차이·누락/legacy 중복 그룹·활성 fallback·마지막 그룹·nullable 평점·저장 경고 문구를 앱에 유지한다. Bookmark 이미지 stage/rollback/commit 순서를 바꾸지 않았다.
- UI: Movie/Repo 버튼은 원본 스타일 전용 export를 사용한다. Folder의 아티스트 검색과 미입력 필터가 동시에 선택될 수 있도록 별도 action 슬롯을 유지하고 alias 문맥 메뉴와 생성 입력 포커스를 보존했다.
- 상태: 설정 dirty 초안·실패 보존, Movie의 부분/실패 탐색 선택 보존, Repo의 초기 평면 목록 우선 선택과 이후 필터 보정을 앱 adapter에 남겼다.
- 이미지: 저장 시작 전 닫힘·대상 전환·새 요청을 검사해 오래된 저장을 시작하지 않는다. 같은 대상의 저장만 직렬화하며 다른 대상은 이전의 느린 저장을 기다리지 않는다. A 저장 중 B 저장 및 A 복귀 순서를 fixture로 검증한다. 이미 시작된 파일 쓰기는 취소하지 않는다.

공통 BE는 UI 담당이, UI는 백엔드 담당이, ST는 UI 담당이 본인이 작성하지 않은 범위를 독립 리뷰했다. 앱 연결은 구현 담당과 다른 리뷰 탭에서 검사한다. Backend 최종 독립 테스트 Folder33·Bookmark42·Repo20이 통과했고 추가 회귀는 발견하지 못했다. 프론트엔드의 다른 대상 이미지 저장 대기 문제를 보완한 뒤 독립 임시 fixture와 image-input5 테스트로 재리뷰했다. 앱 테스트 Movie14·Folder12·Bookmark11·Repo16을 리뷰 담당이 직접 실행했으며 최종 추가 회귀는 발견하지 못했다. 수정 후 공통 전체 check(Node49·Rust60+문서1)와 Folder/Bookmark의 테스트·빌드를 다시 통과했다.

## 원격과 게시

Bookmark는 사용자가 지정한 **비공개** [yoophi/site-bookmark-browser](https://github.com/yoophi/site-bookmark-browser)를 생성하고 잘못된 Folder origin을 교체했다. Repo 원격의 두 후속 커밋을 병합해 resizable panes, Git 상태, 터미널 열기, 경로 복사와 Spec Kit 문서를 유지했다. 원격 문서의 기존 trailing whitespace는 보존했다.

게시 대상 파일에서 일반적인 인증정보 패턴·자격 증명 파일명은 발견하지 않았다. 공통과 다섯 앱은 최종 리뷰 후 main에 커밋·푸시하며, npm/crates.io 배포는 하지 않는다.

## 검증 한계

실제 Tauri 창·OS 터미널 실행·패키징·대용량 탐색 성능은 검증하지 않았다. Storybook은 모의 UI 검사다. Bookmark의 기존 private_browser.rs 미포맷은 보존해 전체 fmt 대신 수정 파일을 검사했다. 기존 Vite 큰 chunk 및 의존성 경고가 있으나 빌드는 성공했다. 앱은 explorer-kit 형제 checkout과 각 저장소 의존성 설치가 필요하다.

[리뷰 완료 시점 변경 목록](promotion-14-changes.json)은 작업 직전 snapshot과 비교한 파일 해시이며, 이후 게시 상태를 기록하는 CONTEXT·이 보고서·목록 자체는 제외한다. Repo 원격 병합으로 보존한 파일도 비교에 포함한다.
