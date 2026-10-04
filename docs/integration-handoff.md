# 원본 앱 통합 작업 지시

공통 저장소 검증이 완료된 후 각 앱에 Codex gpt-6-sol medium 에이전트를 하나씩 배정합니다. 사용자가 요청한 실행 장소는 Herdr agent tab입니다. 현재 작성 세션은 HERDR_ENV가 없어 Herdr 제어를 시작하지 않았습니다.

## 모든 에이전트의 공통 조건

- 담당 원본 저장소에서 AGENTS.md와 현재 git diff를 먼저 확인합니다. movie-explorer는 초기 구현이 untracked 상태였고, movie-folder-explorer와 site-bookmark-browser에는 사용자 미커밋 변경이 있습니다. 이 변경을 보존합니다.
- `/Users/yoophi/project/explorer-kit/README.md`와 `docs/architecture.md`의 로컬 source package 계약을 사용합니다. 공통 저장소 자체는 담당 앱 작업 중 수정하지 말고 필요한 변경을 조정자에게 보고합니다.
- 앱 기능·데이터 schema·화면 디자인을 유지하면서 중복 구현을 공통 코드 호출로 바꿉니다. public API가 다른 UI 계열을 강제로 치환하지 않습니다.
- 링크 의존성을 쓸 경우 Vite의 React dedupe, optimizeDeps.exclude, server.fs.allow, Tailwind source 경로를 확인합니다. 사용하지 않는 의존성은 추가하지 않습니다.
- 해당 앱의 typecheck/build, 기존 테스트, Rust 테스트 또는 check를 실행합니다. 실행하지 못한 검사는 이유를 기록합니다.
- 사용자 변경과 섞인 전체 commit, reset, clean, push를 하지 않습니다. 완료 시 변경 파일, 검증 명령과 결과, 남은 위험을 보고하고 리뷰를 기다립니다.

## 앱별 작업

| 담당 저장소 | 적용할 공통 구현 | 확인할 회귀 |
| --- | --- | --- |
| movie-explorer | explorer-core의 formatBytes, fs-core의 scan_files, explorer-dev-tools | 빈 입력의 영상 기본 glob, snake_case DTO, glob 오류, 기존 3종 보기와 테마 |
| movie-folder-explorer | ui-base, scan-client, image-input, collection-core, json-store | folder→item 이벤트 adapter, cancel·완료 순서, 캐시 version/rootPaths, 설정 migration, 폴더 rename의 경로 갱신 |
| repo-explorer | json-store, explorer-dev-tools | repositories.json와 .repo-explorer.json 경로·schema, README와 worktree 관계, 기존 Rust 테스트 |
| site-bookmark-browser | ui-base, rating, image-input, collection-core, json-store | v1/v2 migration, groupId+path identity, 이미지 저장 위치, 중복 URL 삭제, 평점 0.5 단위 |
| tauri-tree-file-explorer | ui-radix, explorer-core, file-tree, file-list, fs-core list_dir | URL 선택과 뒤로·앞으로 이동, lazy loading, symlink, 숨김 표시, 패널 비율 저장 |

## 완료 후 리뷰

먼저 각 담당자의 완료 보고와 검증 결과를 모읍니다. 독립 리뷰에서는 공통 import가 실제 실행 경로에 연결되는지, 원본 중복 로직이 남아 의미 없이 dependency만 추가되지 않았는지, 데이터·이벤트·CSS·React 인스턴스가 호환되는지 확인합니다. 발견 사항은 담당자에게 수정 요청하고 관련 검사를 재실행한 뒤 최종 보고합니다.
