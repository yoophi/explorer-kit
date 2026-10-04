# 공통 코드와 소비 앱 재검토

> 2026-10-05 후속 상태: 아래 1·2·3·5번을 수정하고 독립 리뷰를 완료했습니다. 4번은 이전 설정 작업에서 수정했습니다. [후속 수정·검증 결과](remaining-review-fixes-report.md)를 참고하세요. 아래 지적과 재현 출력은 수정 전 기록입니다.

사용자 요청에 따라 공통 Rust·TypeScript 구현과 다섯 앱의 실제 소비 경로를 재검토했습니다. 기존 Herdr review-data/review-ui 탭(codex / gpt-6-sol / medium)을 재사용했습니다. 소스 수정 없이 임시 fixture로 확인했습니다.

이전 완료 보고의 검증 범위에서 놓친 도입 회귀 2건과 기존 문제 3건을 확인했습니다. 아래 항목은 아직 수정하지 않았습니다.

## 발견 사항

### 1. P2 · 도입 회귀: JSON 저장 실패 시 이미지 유실

`site-bookmark-browser/src-tauri/src/application/bookmarks.rs:73`에서 이미지를 먼저 삭제하고, 공통 `update_json_if_changed`는 callback 종료 후 JSON을 저장합니다. 정상 v2 bookmarks.json을 0444로 설정하면 삭제는 오류를 반환하고 JSON 항목은 유지되지만 이미지가 사라집니다. 백엔드 승격 전 snapshot에서는 같은 실패 조건에서 이미지가 보존됐습니다. 그룹 삭제의 88행도 같은 순서입니다.

권고: 이미지 정리를 복구 가능한 임시 이동으로 준비하고 JSON 갱신 성공 후 최종 삭제하는 등 실패 시 복구할 수 있는 절차를 적용합니다. JSON을 먼저 삭제하는 방식으로 단순 복귀하면 이전에 해결한 이미지 정리 실패 시 재시도 불가 문제가 돌아옵니다. JSON 읽기 전용과 이미지 디렉터리 읽기 전용 두 방향을 함께 검증해야 합니다.

### 2. P2 · 도입 회귀: 점으로 끝나는 북마크 경로 차단

`explorer-kit/crates/image-store/src/lib.rs:54`의 마지막 점 거부와 Bookmark의 점을 보존하는 image_file_stem 계약이 충돌합니다. `/trailer.`는 이전에 `default%3A%2Ftrailer..png`로 정상 저장·조회됐지만 현재 저장은 Unsafe image filename stem 오류, 기존 이미지 조회는 None입니다. 같은 path의 legacy 이미지가 있으면 필수 v1 이전 실패로 목록 조회도 막힙니다.

권고: 확장자를 붙인 최종 파일명 기준으로 검증하여 기존 파일명 호환성을 유지합니다. stem 끝점은 최종 파일명의 끝점이 아닙니다. 저장·조회·삭제·legacy 이전을 함께 검사해야 합니다.

### 3. P2 · 기존 문제: 그룹 정리가 공통 삭제 보호를 우회

`site-bookmark-browser/src-tauri/src/infrastructure/library_images.rs:100`은 그룹 prefix에 일치하는 모든 항목을 remove_file로 삭제합니다. 지원 이미지 확장자와 regular-file 검사가 없습니다. fixture의 `default%3Aprivate-notes.txt`와 `default%3Aorphan.png` 디렉터리 symlink가 삭제됐습니다. symlink 대상 디렉터리는 남았습니다. 승격 전 snapshot에서도 동일하므로 신규 회귀로 분류하지 않습니다.

권고: 앱이 그룹별 대상 stem을 결정하고 공통 이미지 삭제의 확장자·파일 종류 검증을 적용하도록 통합합니다. 고아 이미지 정리도 같은 계약을 사용해야 합니다.

### 4. P2 · 기존 문제: 숨김 설정 복원 후 트리 행 잔존

`explorer-kit/packages/file-tree/src/FolderTree.tsx:85`는 경로를 추가만 합니다. Tree 앱의 `FolderTreePanel.tsx:43`은 숨김 설정별 root 목록이 캐시에 있으면 같은 인스턴스를 유지합니다. 숨김 폴더 표시 후 다시 숨기면 파일 목록과 달리 트리에는 행이 남습니다. React Query fixture는 토글 전후 rootEntries가 정의된 상태임을, 실제 트리 모델 fixture는 hiddenStillPresent=true를 확인했습니다. 최초 공통화 전부터 같은 로직이 있었습니다.

권고: 숨김 정책 변경 시 트리 모델을 재생성하거나, 각 부모의 권위 있는 자식 목록과 모델의 추가·삭제를 동기화합니다. 아직 로드하지 않은 childDirs=[]와 실제 빈 목록을 구분해야 합니다.

### 5. P3 · 기존 제약: 루트 및 끝 구분자 경로 변환 실패

`explorer-kit/packages/file-tree/src/lib/paths.ts:7`은 root에 항상 `/`를 추가합니다. `toTreeId('/tmp', '/')`는 null, `toAbsolutePath('tmp/', '/')`는 `//tmp`를 반환합니다. 끝에 `/`가 있는 root도 하위 경로를 인식하지 못합니다. 앱 홈 경로가 이런 형태여야 하므로 일반 환경의 도달성은 낮습니다.

권고: 루트 구분자를 보존하면서 경로 경계를 정규화하고 `/`, 일반 경로, 끝 구분자, 유사 prefix 경로를 검사합니다.

## 범위와 근거

| 대상 | 검토 범위와 결과 |
| --- | --- |
| explorer-kit | JSON transaction/버전/atomic writer, image 저장/조회/이전/삭제, fs 조회/스캔, scan-job, TS scan-client/image-input/tree/list/UI 연결. 위 2·4·5 확인 |
| movie-explorer | fs-core 호출·glob/DTO·blocking adapter·패키지 연결. 추가 확인된 결함 없음 |
| movie-folder-explorer | JSON 설정·이미지 저장/조회·scan adapter·dialog 수명. 추가 확인된 결함 없음 |
| repo-explorer | 등록/취소/완료·catalog commit 경계·구독 수명·패키지 연결. 추가 확인된 결함 없음 |
| site-bookmark-browser | JSON/legacy migration·이미지·삭제/그룹 adapter. 위 1·2·3 확인 |
| tauri-tree-file-explorer | fs adapter·공통 tree/list 소비·숨김 설정·경로 변환. 위 4·5 확인 |

신규 회귀 비교 기준은 `backend-promotion-baseline-vegfb0x_`, Tree 기존 문제 비교는 `explorer-integration-baseline-i6ok2ys4`입니다. 실제 앱 Rust 모듈을 불러온 임시 Cargo fixture와 실제 Tree/React Query 모델을 사용했습니다. 네이티브 UI·다중 프로세스 동시 접근·모든 파일시스템 실패 시점을 검증하지 않았으며 전체 테스트 스위트는 이번 리뷰에서 재실행하지 않았습니다. 이전 테스트 통과는 위 경계 조건의 정확성을 보장하지 않습니다.

재현 핵심 출력:

```text
JSON 0444 / current: json_unchanged=true image_exists=false
JSON 0444 / baseline: json_unchanged=true image_exists=true
dot path / current: find=None save=Unsafe image filename stem
dot path / baseline: find=Some save=Ok
group directory symlink / current and baseline: cleanup=Ok link_exists=false target_exists=true
Tree model: hiddenStillPresent=true visiblePresent=true
React Query: beforeDefined=true afterDefined=true
```

Rust fixture는 시스템 임시 디렉터리의 bookmark-fresh-review-*, bookmark-baseline-compare-*, bookmark-dot-migration-*, bookmark-symlink-current-*, bookmark-symlink-baseline-*에 생성한 뒤 자동 삭제했습니다. 실제 사용자 데이터는 사용하지 않았습니다.

## 설정 공통화 후 상태 갱신

위 리뷰의 4번 숨김 트리 행 잔존은 설정 공통화 과정에서 `homeDir/showHidden`에 따른 트리 재구성으로 수정했습니다. 캐시가 있는 상태의 on/off 반복을 브라우저 fixture로 확인했습니다. 이미지 관련 1·2·3번과 루트 경로 5번은 미해결로 유지합니다. [설정 승격 결과](settings-promotion-report.md)에 후속 검증을 기록했습니다.
