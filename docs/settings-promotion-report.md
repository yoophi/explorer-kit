# 설정 UI·저장 공통화 결과

## 공통 경계

- `@yoophi/settings-ui`: 설정 섹션·접근성 label이 연결된 필드·토글·저장 진행/오류 표시. 앱의 기존 페이지와 dialog에서 사용합니다.
- `@yoophi/settings-core`: 앱별 key/기본값/검증 함수, 버전 문서 또는 기존 raw JSON, no-op 무저장, 저장 실패 시 값 보존, 명시적 초기화, React 구독과 다른 창 storage 이벤트.
- `explorer-settings-store`: 기존 json-store의 잠금을 공유하는 경로 소유형 설정 저장소. 앱 callback이 schema·migration·normalization과 Unchanged/Write를 결정합니다.

같은 설정을 브라우저와 Rust 파일에 중복 저장하지 않습니다. 브라우저 저장은 여러 창 사이 원자적 transaction이 아니며, Rust 저장도 프로세스 간 transaction은 제공하지 않습니다.

## 앱별 적용

| 앱 | 저장 대상과 형식 | 상태 |
| --- | --- | --- |
| Movie | movie-explorer.preferences v1: directoryPath, includePatternText, viewMode | 적용·검증 완료 |
| Repo | repo-explorer.preferences v1: rootPath, maxDepth | 적용·검증 완료 |
| Folder | 기존 folder-explorer.json과 version 없는 schema | 적용·검증 완료 |
| Bookmark | 기존 settings.json과 v1/v2 migration | 적용·검증 완료 |
| Tree | 기존 explorer-layout raw JSON; tauri-tree-file-explorer.preferences v1 숨김 표시 | 적용·검증 완료 |

Movie/Repo는 원래 메모리에만 있던 탐색 설정을 재실행 시 복원합니다. 검색어·스캔 상태·선택한 항목은 설정 저장 대상이 아닙니다. Folder/Bookmark의 그룹·경로·URL 정책과 삭제 절차는 앱에 유지합니다.

## 검증 기록

공통 gate: TypeScript·Node23·JS/CSS 빌드·Rust34 통과 후 앱 적용을 시작했습니다. 후속 no-op/storage-event 테스트를 포함한 최종 전체 check는 Node25·Rust35·타입·빌드 모두 통과했습니다. Rust 설정 crate는 7개이며 전체 Rust fmt도 통과했습니다.

- Movie: 설정 Node4·Rust2·cargo check·typecheck·앱/Storybook 빌드·frozen install 통과.
- Repo: TS9·typecheck·build·cargo check --locked·frozen install 통과.
- Folder: Rust20·Node10·typecheck·build·cargo check·frozen offline install 통과.
- Bookmark: Rust30·Node5·cargo check·build·수정 Rust fmt 통과.
- Tree: 설정 Node5·typecheck·build·cargo check·frozen offline install 통과.

브라우저 검증은 Aside를 이용한 별도 localhost 포트에서 수행했습니다. Movie의 glob 적용 후 새 페이지에서 복원, 패턴 초기화, 미지원 버전 경고와 명시적 설정 초기화를 확인했습니다. Repo는 /tmp/settings-review와 깊이7을 입력하고 새로고침 후 복원을 확인했습니다. 네이티브 Tauri bridge가 없는 브라우저이므로 Repo scan 구독 오류가 표시되며 실제 스캔 검증과 구분합니다. 테스트 후 브라우저 설정은 UI로 초기화했습니다.

## 추적과 제한

설정 작업 직전 snapshot은 `/var/folders/3z/mcf5cp4n0t567wk9p_kjrpp80000gn/T/settings-promotion-baseline-bp9nv1wn`입니다. 이전 미커밋 변경을 포함하므로 Git HEAD만을 비교 기준으로 삼지 않습니다. 실제 사용자 데이터, 도구 업그레이드, commit/push는 사용하지 않았습니다. 이전 shared-code-review.md의 별도 결함은 이번 설정 범위와 구분합니다.

다섯 앱 적용 결과를 먼저 보고한 뒤 review-data(저장·데이터 호환성)와 review-ui(UI·React 동기화)에 독립 리뷰를 배정했습니다.

Tree test.html의 메모리 파일시스템에서 숨김 폴더 표시를 새 페이지에서 복원하고, 설정별 목록이 캐시에 있는 상태에서 on/off를 반복해 숨김 행이 트리·목록에서 함께 제거됨을 확인했습니다. separator의 aria-valuenow는 키보드 변경으로 12.5→17.5, 새 페이지에서도 17.5, Panel layout Reset 후 12.5였습니다. 브라우저 테스트용 Vite 서버는 확인 후 종료했습니다. 이 검증은 실제 네이티브 파일시스템 접근이 아닙니다.

초기 Tree 리뷰의 숨김 행 잔존 항목은 이번 설정 소비 코드 변경으로 보완됐습니다. 기존 이미지 관련 3건과 루트 경로 변환 P3는 별도 미해결 사항으로 유지합니다.

## 독립 리뷰 후속 조치

- review-data P2(기존 문제): Folder가 명시적 미래 version의 새 필드를 갱신 중 삭제했습니다. 이번 설정 저장 경계에서 보호하도록 보완했습니다. version 필드가 있으면 load/update 모두 거부하며 기존 무버전 형식은 유지합니다. null·문자열·배열·불리언·객체 버전과 원본 bytes 보존 fixture를 포함한 Folder Rust20/check 통과. review-data가 실제 앱 모듈 fixture로 거부·원본 보존·무버전 migration을 재확인했고 설정 범위의 추가 결함을 발견하지 못했습니다.
- review-ui P2(도입 회귀): Repo 숫자 필드에 포커스만 둔 상태에서 외부 변경을 받은 뒤 blur하면 오래된 값을 저장할 수 있었습니다. focus와 실제 dirty 상태를 분리했습니다. 편집하지 않은 필드는 외부 값을 반영하고 blur에서 저장하지 않으며, 실제 편집한 초안만 명시적으로 저장합니다. TS9·typecheck·build 통과.
- review-ui P3(도입 회귀): Movie 미적용 glob 초안이 외부 설정 변경으로 덮어써질 수 있었습니다. dirty 초안을 보존하고 Apply/Reset 성공 시에만 dirty를 해제하도록 보완했습니다. 동일 값 저장과 저장 실패도 회귀 테스트에 포함했습니다. Node4·typecheck·build 통과.

최종 review-ui 재리뷰 승인: 두 입력 동기화 문제가 해소됐으며 저장 실패·초기화 경로에서도 추가 회귀를 발견하지 못했습니다. 리뷰어가 Movie4·Repo9 테스트를 직접 재실행했습니다. 마지막 수정 후 여러 창 브라우저와 네이티브 앱 검증은 수행하지 않았습니다. 두 리뷰 모두 설정 범위의 남은 actionable finding은 없습니다.
