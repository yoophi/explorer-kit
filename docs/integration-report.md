# 공통 코드 적용 결과

다섯 원본 앱에 Explorer Kit 구현을 연결했습니다. 구현은 저장소별 Herdr 탭에서 `codex / gpt-6-sol / medium`으로 진행했고, 공통 저장소는 원본 통합 전에 `pnpm check`를 통과했습니다. 이 문서는 구현 완료 보고와 후속 리뷰 결과를 기록합니다.

## 저장소별 적용과 검증

| 앱 | 적용 내용 | 확인한 결과 |
| --- | --- | --- |
| movie-explorer | 공통 크기 formatter, Rust 파일 스캔, 개발 CLI. 영상 기본 glob·DTO 유지, 기존 반올림용 wrapper 유지 | frozen install, typecheck, build, Rust 테스트 2개, cargo check, rustfmt 통과 |
| movie-folder-explorer | Base UI, 스캔 adapter, 이미지 입력, 태그·셔플, JSON 저장. 로컬 중복 제거 | frozen offline install, typecheck, build, 스캔 테스트 10개, Rust 테스트 14개, cargo check 통과. 개발 서버가 외부 공통 소스에 HTTP 200 응답 |
| repo-explorer | JSON 저장·카탈로그 update API, 개발 CLI. 저장 경로·schema·worktree 유지 | frozen install, typecheck, build, Rust 테스트 6개, cargo check, rustfmt 통과. 기존 Rust 테스트 5개에 카탈로그 fixture 1개 추가 |
| site-bookmark-browser | Base UI, 평점, 이미지, 태그, JSON update API. 기존 평점·중복 URL 작업 보존 | frozen install, build, Node 테스트 5개, Rust 테스트 11개, cargo check 통과. migration·정규화·동시 갱신 fixture 포함 |
| tauri-tree-file-explorer | 공통 core·Radix UI·트리·목록과 Rust list_dir 연결. 로컬 packages 중복 제거 | frozen offline install, typecheck, build, cargo test/check, rustfmt 통과. 브라우저 fixture에서 중첩 이동·URL history·숨김 토글·패널 복원 확인 |

공통 저장소의 최종 `pnpm check`가 통과했습니다. Node 테스트 16개와 Rust 테스트 10개(JSON 7개·파일 3개)를 포함합니다. 앱의 `cargo test`는 의존 crate 내부 테스트를 자동 실행하지 않으므로 공통 crate의 검증 결과와 앱 테스트 수를 구분합니다. 파일 트리 앱 자체 Rust 테스트 수는 0이며 파일 조회·symlink는 공통 crate의 fixture로 검증했습니다.

표의 앱 결과는 각 구현 에이전트의 실행 출력과 완료 보고를 확인한 내용입니다. 독립 리뷰의 추가 확인은 아래에 별도로 기록합니다. 모든 mutation 테스트는 임시 fixture를 사용했습니다.

## 설치와 호환성

- 소비 앱은 형제 디렉터리 `explorer-kit`의 source package를 `link:`로 참조합니다. 두 checkout을 유지하고 공통 저장소의 의존성을 먼저 설치해야 합니다.
- 폴더·북마크 앱은 `link:` 지원을 위해 npm lockfile에서 pnpm lockfile로 전환하고 README에 설치 절차를 기록했습니다.
- React 타입 중복은 타입 버전·TypeScript 경로 해석을 조정해 해결했습니다. Vite React dedupe와 외부 source 허용, Tailwind source 설정을 함께 적용했습니다.
- 북마크 앱은 기존 npm lock의 직접 의존성 버전을 고정해 부수적인 업그레이드를 줄였습니다. 파일 트리 앱은 공통 checkout과 React·타입 버전을 정렬했습니다.
- 네이티브 Tauri 창의 실제 파일 선택·탐색·표시 검증은 수행하지 않았습니다. 파일 트리의 브라우저 fixture 검증과 네이티브 검증을 동일하게 간주하지 않습니다.

## 변경 추적과 작업 범위

초기 사용자 변경을 포함한 통합 직전 파일 복사본을 기준으로 [변경 파일 목록](integration-changes.json)을 만들었습니다. Movie의 초기 구현이 untracked이고 폴더·북마크에 기존 미커밋 변경이 있어 Git HEAD diff만을 통합 차이로 사용하지 않았습니다.

원본 앱의 변경은 commit하거나 push하지 않았습니다. 공통 저장소의 초기 커밋은 `9ac1e4f`이며 후속 JSON writer 수정과 문서 변경은 미커밋 상태입니다.

파일 트리의 브라우저 검증 과정에서 담당 에이전트가 Aside CLI를 1.26.906.1630에서 1.26.916.1741로 업데이트했고 관련 aside-browser skill도 갱신했습니다. 이는 앱 코드 변경과 별개인 검증 도구 환경 변경입니다.

## 독립 리뷰

구현 완료 상태를 사용자에게 보고한 뒤, 별도의 `review-ui`와 `review-data` Herdr 에이전트에 리뷰를 요청했습니다. 두 에이전트도 `codex / gpt-6-sol / medium`입니다.

- review-ui: TypeScript·React·CSS·source package 연결, 이미지 수명, 스캔 adapter, 개발 CLI
- review-data: Rust·JSON migration·데이터 경로·동시 갱신·파일 스캔·DTO

초기 지적과 후속 처리 내역은 다음과 같습니다. 위치는 최초 리뷰 당시 기준이며 수정으로 줄 번호가 이동할 수 있습니다.

| 구분 | 최초 위치·재현 조건 | 수정과 확인 |
| --- | --- | --- |
| P2 통합 회귀 | `explorer-kit/crates/json-store/src/lib.rs:53` — symlink로 저장하면 링크가 일반 파일로 바뀌고 대상은 갱신되지 않음. 기존 파일 권한도 0600으로 변경 | 최종 링크 대상 해석·권한 보존·읽기 전용 거부. 상대 링크 체인·dangling link·순환 링크·읽기 전용 fixture 추가. review-data 재리뷰 및 JSON 7개 통과 |
| P3 통합 회귀 | `movie-folder-explorer/src/features/folder-browser/ui/rename-folder-dialog.tsx:227` — A 이미지 저장 중 B dialog를 열면 A 성공 응답이 B의 오류로 표시 | layout effect의 generation으로 close·전환·unmount를 구분. await 이후 성공·실패 모두 stale 결과 무시. tsc·Node 10개·build 통과, review-ui 해결 확인 |
| P2 기존 문제 | `site-bookmark-browser/src/features/bookmark-browser/ui/bookmark-edit-dialog.tsx:86` — pending 이미지 저장 도중 unmount 후 URL 생성·누수 | active/latestPaste 및 layout effect generation guard 추가. passive cleanup 전 경계도 보완. build·Node 5개 통과, review-ui 최종 재리뷰에서 해결 확인 |
| P2 기존 문제 | `site-bookmark-browser/src-tauri/src/infrastructure/json_settings_store.rs:61` — load와 update가 겹치면 오래된 설정으로 덮어씀 | load의 읽기·정규화·migration·쓰기를 update_json 안에서 직렬화. v2 정규화·동시 load/update fixture 추가. Rust 11개·cargo check 통과, review-data 해결 확인 |

review-data는 수정 후 공통 JSON 7개, Folder 14개, Repo 6개, Bookmark 11개 Rust 테스트와 Bookmark cargo check를 직접 재실행했습니다. 최초 리뷰에서는 공통 Node 16개·Folder Node 10개·Bookmark Node 5개도 재실행했습니다. review-ui의 UI 재리뷰는 코드 검토이며 이미지 경합을 실제 네이티브 창에서 재현한 검증은 아닙니다.

## 남은 제한

- JSON은 파일 교체로 저장하므로 부모 디렉터리 쓰기 권한이 필요합니다. inode·hard link 관계·소유권·확장 속성 보존은 지원하지 않습니다. macOS 임시 fixture에서 기존 xattr 소실과 0555 부모 디렉터리 저장 실패를 재현했습니다. 최초 추가 리뷰의 P2/P3 지적을, 원자적 교체를 유지하는 공통 저장 계약의 명시된 제한으로 기록했습니다. 기존 파일 내용만 덮어쓰던 앱과의 동작 차이이며 코드로 해소한 항목은 아닙니다.
- 여러 프로세스 사이의 동시 쓰기와 여러 파일의 transaction은 제공하지 않습니다.
- 네이티브 Tauri 창의 최종 시각·OS 연동 검증은 남아 있습니다. 브라우저 fixture와 빌드·단위 테스트 통과가 이 검증을 대신하지 않습니다.

## 최종 상태

다섯 앱의 적용, 빌드·관련 테스트, 독립 리뷰와 수정 후 재리뷰를 완료했습니다. 두 리뷰어는 명시된 일반 앱 저장·UI 계약 범위에서 추가 actionable finding이 없다고 보고했습니다. 위 filesystem 제한과 네이티브 검증 미실시 범위는 남아 있습니다. Herdr 구현·리뷰 탭은 결과를 확인할 수 있도록 유지했습니다.
