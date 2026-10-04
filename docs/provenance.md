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

## 통합 리뷰 후 파생 변경

JSON 저장기의 원자적 파일 교체가 기존 `fs::write`와 달리 symlink를 교체하고 권한을 바꾸는 회귀를 수정했습니다. 최종 링크 대상을 최대 64단계로 해석하고 그 대상과 같은 디렉터리에 임시 파일을 만듭니다. 기존 대상의 파일 권한을 보존하며 읽기 전용 대상은 오류로 처리합니다. 상대 링크 체인·dangling link·순환 링크·읽기 전용 파일을 임시 fixture 테스트로 확인했습니다. 원본 출처 해시는 복사 당시 이력을 유지합니다.

## 백엔드 승격 2차

- JSON 조건부 갱신·버전 검사는 Folder의 migration 재확인 패턴과 Bookmark 감사 결과에서 파생했습니다. 기존 JSON 함수는 호환 wrapper로 유지하며 byte 교체를 공개 primitive로 추출했습니다.
- image-store는 Folder의 save_video_thumbnail/find_video_thumbnail과 Bookmark의 LibraryImages에서 공통 동작을 추출합니다. 저장 위치와 key 생성은 앱에 남깁니다.
- scan-job는 Folder ActiveScans의 등록·취소·정리를 Tauri-free RAII 작업으로 승격합니다. traversal과 이벤트 DTO는 앱에 남깁니다.

후속 독립 리뷰에서 이미지 정리의 regular-file 검사·반복 가능한 삭제와 legacy 이전 잠금을 보강했습니다. JSON/image 잠금은 분리하며 앱이 JSON 갱신 callback에서 이미지 작업을 수행할 수 있습니다. 스키마 이전·그룹 보호·이미지 identity는 앱 책임으로 유지했습니다.

## 설정 UI·저장 승격

- settings-ui: Movie/Repo 탐색 설정 필드와 Folder/Bookmark 그룹 설정의 공통 섹션·label·토글·오류 표시 패턴을 조합 컴포넌트로 추출했습니다. 도메인 폼·dialog와 Base/Radix API는 앱에 유지합니다.
- settings-core: Tree의 explorer-layout localStorage read/write에서 브라우저 설정 저장 책임을 추출하고 검증·버전 보호·구독·저장 실패 복구를 추가했습니다. Movie/Repo 화면 설정의 재실행 복원에도 사용합니다.
- settings-store: Folder의 json_last_opened_directory_store와 Bookmark의 json_settings_store에서 경로 소유·잠금·조건부 쓰기 계약을 추출했습니다. 기존 json-store를 재사용하며 migration·validation 정책은 앱 callback으로 유지합니다. 최초 복사본 provenance.json 해시는 변경하지 않습니다.

## 기능 리뷰 후 경계 조건 보완

file-tree의 원본 paths helper를 유지하면서 POSIX 루트 `/`와 끝 구분자 정규화를 추가했습니다. root 자체는 하위 Tree ID로 포함하지 않으며 유사 prefix를 거부합니다. 공개 함수와 기존 POSIX 계약을 유지하고 Windows 경로 지원을 새로 추가하지 않았습니다. 최초 복사본 해시는 기존 이력으로 유지합니다.

image-store의 끝점 stem 검증을 확장자 결합 파일명 계약에 맞춰 수정했습니다. Bookmark의 JSON 실패 시 이미지 선삭제 문제에서 파생한 `stage_remove_images`를 추가했습니다. 여러 stem/명시 파일명을 잠금 안에서 임시 보관하고 JSON 결과에 따라 복원·확정하며 그룹 소유권과 JSON schema는 앱에 남깁니다. 상대 symlink, 부분 실패, 복원 충돌, 격리 정리 실패를 fixture로 검증합니다. tempfile은 기존 workspace 버전을 runtime 의존성으로 재사용합니다.

## 탐색 스트리밍 확대

Folder의 항목 이벤트/취소/80ms 화면 갱신 패턴을 기준으로 기존 fs-core/list(Tree 출처)와 fs-core/scan(Movie 출처)에 callback 기반 스트리밍 API를 추가했습니다. 원본 복사본의 필터·symlink·오류 정책을 유지하고 배열 API는 동일 탐색을 수집·정렬하는 호환 wrapper로 구성했습니다. 취소 확인과 sink 오류 전파를 추가했으며 Tauri event, 앱 기본 glob, 서버상태 캐시 정책은 소비 앱에 남겼습니다. 최초 provenance.json 해시는 변경하지 않습니다.

## 추가 후보 14개 승격

2026-10-05 후보 조사에 있던 공통 경계를 구현한다. 최초 복사본 `provenance.json` 해시는 유지한다. 새 파생 구현의 출처와 정책은 다음과 같다.

- fs-core/walk: Folder의 filesystem_directory_scanner와 Repo의 infrastructure discovery에서 DFS/BFS·오류·깊이·symlink 정책을 분리한다. 검사·DTO·이벤트 전달은 앱 callback에 둔다.
- collection-policy: Folder의 json_last_opened_directory_store, Bookmark의 application/groups 및 두 domain 평점 검증에서 메모리 컬렉션·숫자 규칙만 추출한다. 파일 삭제·트랜잭션·migration은 옮기지 않는다.
- image-store/SaveCompletion: Folder command와 Bookmark LibraryImages가 중복 판단하던 저장 성공·정리 미완료 해석을 공통화한다. 경로와 경고를 보존한다.
- ui-radix/compatible-button: Movie/Repo의 동일한 로컬 button을 복사하여 기존 모양을 유지하는 별도 export로 제공한다.
- ui-base 복합 UI: Folder/Bookmark의 필터·썸네일·편집·그룹 화면 및 Folder/Repo 스캔 표시에서 도메인을 제외한 표시·접근성·상호작용 계약을 추출한다.
- settings-core/draft, collection-core/reconcileSelection: Movie/Repo의 저장 초안과 현재 선택 보정에서 순수 상태 규칙을 추출한다.
- image-input/react: Folder/Bookmark 이미지 붙여넣기의 대상·요청 수명과 미리보기 해제를 공통화한다. 저장 callback과 텍스트 붙여넣기는 앱 책임이다.
- scan-client/session: Folder consumeScan과 Repo ScanSession의 ID/ack/취소/terminal 수명 규칙을 공통화하고 transport·결과 확정 정책은 앱에 남긴다.

실제 연결·검증·리뷰 완료 여부는 [후보 14개 보고서](promotion-14-report.md)에 기록한다.

## 잔여 공통화

게시 기준 `7089174` 이후 현재 두 소비처의 계약을 다시 대조했다. Movie/Tree의 Unicode 이름 비교는 core로, Movie/Repo의 동일 테마는 ui-radix의 별도 compatible-theme export로 옮겼다. Folder/Bookmark의 동일 테마 본문은 기존 ui-base CSS 직접 import로 전환했다. Movie/Repo의 cn은 기존 경로를 공통 함수 재수출로 유지한다. Bookmark의 그룹 키/Markdown 폼은 기존 AsyncFormDialog를 소비하며 아이콘 라벨과 기존 block 배치를 보존하는 선택적 합성 props를 추가했다. 기본 폼 동작은 유지한다.

최초 복사본 해시는 덮어쓰지 않는다. 파생 출처·계약은 [이름 비교](residual-sort-notes.md), [테마](residual-theme-notes.md), [폼](residual-dialog-notes.md), 전체 선정·유지 판단과 검증은 [잔여 보고서](residual-commonality-report.md)에 기록한다.
