# 공통 구현 출처

작업 폴더의 미커밋 변경까지 포함해 복사했습니다. 파일별 원본 경로·SHA256·가능한 HEAD는 루트 `provenance.json`에 기록되어 있습니다. HEAD만으로 원본 내용을 재현할 수 없는 파일이 있으므로 SHA256을 기준으로 비교합니다.

| 결과 | 출처 | 조정 |
| --- | --- | --- |
| ui-base | movie-folder-explorer/src/components/ui, src/lib/utils.ts, src/index.css | 패키지 import로 변경, CSS source 추가 |
| ui-base의 select/textarea/alert-dialog | site-bookmark-browser/src/components/ui | 패키지 import로 변경 |
| ui-radix, core, file-tree, file-list | tauri-tree-file-explorer/packages | UI namespace를 ui-radix로 변경. 기존 컴포넌트 API 유지 |
| rating | site-bookmark-browser의 rating.tsx | cn import를 ui-base로 변경 |
| scan-client | movie-folder-explorer의 consume-folder-scan.ts와 tests/folder-scan.test.mjs | FolderEntry 의존성을 T로 바꾸고 folder 이벤트를 item으로 일반화. 기존 테스트 이식, terminal 이후 늦은 이벤트 무시 추가 |
| image-input | 북마크·폴더 편집 dialog의 이미지 paste 처리 | DOM listener와 저장 callback을 앱에 남기고 Blob 변환·이미지 선택을 추출. 명시적 preview dispose 추가 |
| collection-core | 폴더·북마크의 tagCloudSizeClass, 폴더 shuffledRank와 태그 집계 | item별 정규화·중복 제거를 selector 기반 순수 함수로 구성 |
| dev-tools | movie-explorer/scripts/tauri-dev.mjs, repo-explorer/scripts/tauri-dev.mjs의 동일 계열 구현 | Movie 버전을 복사. cwd와 TAURI_PACKAGE를 소비 앱에서 결정 |
| fs-core/list | tauri-tree-file-explorer/apps/desktop/src-tauri/src/lib.rs | Tauri command 제거, 타입·함수 공개 |
| fs-core/scan | movie-explorer/apps/desktop/src-tauri/src/lib.rs | MovieFile→ScannedFile. Tauri 제거, 빈 패턴 기본값을 전체 파일로 변경 |
| json-store | movie-folder-explorer의 json_folder_cache_store.rs와 command 저장 lock | 도메인 스키마 제거. 임시 파일을 고유 이름으로 생성, sync 후 교체, read-modify-write API·오류 구분 추가 |

검색·정렬 전체 hook, 그룹 CRUD, OS 실행, 앱 전체 shell은 복사하지 않았습니다. 앱별 부작용과 정책을 먼저 유지하고, 두 소비 앱의 계약이 확인된 부분만 후속 추출합니다.
