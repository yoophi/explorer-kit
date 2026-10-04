# 다섯 앱 백엔드 공통 동작 비교

## 결론과 범위

공통 Rust crate 연결은 정상입니다. Movie·Tree는 `explorer-fs-core`, Folder·Repo·Bookmark는 `explorer-json-store`를 실제 사용합니다. 다만 공통화는 저수준 파일 조회·JSON I/O까지이며, 마이그레이션·이미지 저장·스캔 실행 계약은 여전히 다르게 구현되어 있습니다. 아래 차이를 모두 동일한 구현으로 합칠 필요는 없습니다.

이번 점검은 현재 Rust 소스와 관련 호출부 비교입니다. 데이터 영향 3건은 실제 앱 모듈을 임시 Rust 실행 프로그램에 불러와 재현했습니다. 실제 사용자 데이터·앱 코드는 변경하지 않았습니다. 네이티브 UI 실행이나 전체 앱 테스트 재실행은 하지 않았습니다. 앞선 독립 리뷰에서 발견하지 못한 기존 문제도 포함합니다.

## 우선 처리할 문제

### 1. P2 — 미지원 JSON 버전을 legacy로 해석해 데이터가 바뀜 (재현)

- [Bookmark load](../../site-bookmark-browser/src-tauri/src/infrastructure/json_bookmark_store.rs#L56), 같은 파일의 update 102행은 `version == 2` 이외를 모두 v1으로 해석합니다.
- `version: 3`에 v2와 같은 필드를 가진 fixture를 읽으면 version 2로 저장하며 `groupId: custom → default`, `rating: 4.5 → 0`, groupKey·createdAt은 빈 값이 됩니다.
- Folder cache는 버전 불일치 시 폐기 가능한 캐시를 비우며 원본을 즉시 덮어쓰지 않습니다([cache 31행](../../movie-folder-explorer/src-tauri/src/infrastructure/json_folder_cache_store.rs#L31)). 사용자 데이터인 Bookmark에도 이 정책을 그대로 적용해서는 안 됩니다.
- Bookmark settings도 version 2 이외를 v1으로 해석하지만 legacy `baseUrl`이 없는 경우 파싱 오류가 납니다. 같은 앱의 두 저장소도 미지원 버전 처리 결과가 다릅니다.
- 권고: 버전 없음/명시된 legacy 버전, 지원 버전, 미지원 버전을 구분하고 미지원 버전은 쓰기 없이 오류로 반환합니다. 공통 버전 검사 helper는 가능하지만 schema 변환은 앱에 둡니다.
- 통합 직전 snapshot에도 동일한 Bookmark load 분기가 있었습니다. 기존 문제입니다.

### 2. P2 — JSON과 이미지 마이그레이션 완료 시점이 다름 (재현)

- [Bookmark load 83행](../../site-bookmark-browser/src-tauri/src/infrastructure/json_bookmark_store.rs#L83)이 먼저 v2 JSON을 저장하고, [Bookmarks.list 15행](../../site-bookmark-browser/src-tauri/src/application/bookmarks.rs#L15)이 이후 이미지를 이전합니다.
- legacy 이미지 디렉터리를 임시로 읽기 전용으로 두면 첫 조회가 이미지 rename 오류로 실패합니다. 권한 복원 후 다시 조회해도 이미 JSON은 v2라 `migrated_from_v1=false`입니다. legacy 파일은 남아 있지만 thumbnail은 None이며 이전을 재시도하지 않습니다.
- update를 먼저 호출해 v1 JSON을 v2로 바꾸는 경로에도 이미지 이전 완료를 알리는 별도 상태가 없습니다.
- 권고: 재실행 가능한 이미지 이전 또는 durable migration 단계/완료 표시를 둡니다. 공통 JSON의 파일 단위 원자성은 다중 파일 작업의 성공을 보장하지 않습니다.
- 이 순서 역시 통합 직전 snapshot과 같습니다. 기존 문제입니다.

### 3. P2 — 같은 load라도 조회에 쓰기 권한이 필요한 앱이 있음 (재현)

- [Bookmark settings 34행](../../site-bookmark-browser/src-tauri/src/infrastructure/json_settings_store.rs#L34)은 정상 v2도 `self.update`를 호출해 매 조회마다 교체 저장합니다. 정상 settings.json을 0444로 두면 읽을 수 있어도 조회는 `JSON file is read-only`로 실패합니다.
- Folder는 마이그레이션이 필요할 때만 잠금 안에서 다시 읽고 씁니다([settings 41행](../../movie-folder-explorer/src-tauri/src/infrastructure/json_last_opened_directory_store.rs#L41)). Repo의 카탈로그·메타데이터 조회는 load_json입니다([497행](../../repo-explorer/apps/desktop/src-tauri/src/lib.rs#L497), 559행).
- 권고: 공통 API에 `변경 없음` 결과를 지원하거나, 정상 schema의 read 경로와 잠금 내 재확인·migration 경로를 분리합니다. 이전에 해결한 lost-update를 다시 만들지 않아야 합니다.
- 매 조회 저장 자체는 Bookmark 통합 전에도 있었습니다. 현재의 읽기 전용 거부는 공통 writer의 명시적 보호 정책과 결합한 결과입니다.

### 4. P2 — Bookmark 목록의 legacy load는 여전히 읽기·쓰기 잠금이 분리됨 (코드 근거)

- [Bookmark load 46–83행](../../site-bookmark-browser/src-tauri/src/infrastructure/json_bookmark_store.rs#L46)은 load_json으로 읽은 v1을 나중에 save_json으로 저장합니다. 공통 mutex는 이 두 호출 사이를 보호하지 않습니다.
- A가 v1을 읽음 → B가 update_json으로 새 북마크를 저장함 → A가 이전 목록의 v2를 save함 순서에서는 B의 갱신을 잃을 수 있습니다. Bookmark settings는 지난 수정으로 이 경로를 직렬화했으나 목록 migration은 남아 있습니다.
- 다중 스레드/호출 중첩 시 가능한 저장소 계층 문제입니다. 현재 동기 Tauri command에서 이 순서가 실제로 발생하는지까지는 재현하지 않았습니다.
- 권고: 버전 판단·변환·저장을 하나의 잠금 구간에 넣고, 이미지 migration의 재시도 상태와 함께 설계합니다. 이전 리뷰의 settings 수정과 구분되는 기존 문제입니다.

## 같은 기능의 구현 차이

| 기능 | 현재 차이 | 판단·공통화 후보 |
| --- | --- | --- |
| 파일 탐색 대상 | Movie: 재귀 영상 파일 glob. Folder: root 포함 폴더 DFS+메타데이터. Repo: 깊이 제한 BFS+Git 판별·제외 폴더. Tree: 한 단계 목록 | 결과·탐색 정책은 의도적인 도메인 차이. walker를 추출한다면 방문/가지치기/취소/오류 정책을 주입하고 전체 알고리즘을 강제 통합하지 않음 |
| symlink | Movie 재귀·Folder 하위 탐색·Repo 하위 탐색은 디렉터리 symlink를 따라가지 않음. Tree는 탐색 가능하게 표시. 사용자가 root로 지정한 symlink는 별도 처리 가능 | 순환 방지와 직접 탐색의 의도적인 차이. 기본 정책을 계약·테스트로 명시 |
| 숨김·오류 | Tree는 show_hidden, 개별 entry/metadata 오류를 생략. Movie는 read/metadata 오류 시 전체 실패. Folder는 read_dir 실패 시 전체 실패, 개별 entry/type 오류 생략. Repo는 디렉터리 PermissionDenied를 생략 | 누락이 사용자에게 같은 의미인지 결정 필요. 공통 scan warning 구조와 FailFast/SkipUnreadable 정책 후보 |
| 스캔 생명주기 | Folder는 scanId·즉시 ack·취소·completed/cancelled/failed. Repo는 phase 진행 이벤트, scanId·취소 없음, 실패는 invoke 오류. Movie는 일괄 응답. Tree는 한 단계 일괄 응답 | 공통 scan-client는 현재 Folder용 adapter만 사용. Repo 동시 scan 이벤트는 구별 불가하며 frontend listener도 모든 event를 수신. Repo의 작업 ID와 terminal 계약을 우선 정렬할 수 있음 |
| blocking I/O | Folder scan/cache와 Repo scan은 spawn_blocking. Movie scan·Tree list·Repo list/metadata·Bookmark 명령은 동기 함수 | 실행 어댑터 차이. Repo list는 Git 프로세스/README를 순차 조회하므로 특히 offload 후보. 체감 지연이나 UI 정지는 이번에 측정하지 않음 |
| 이미지 교체 | Folder는 command에서 직접 write 후 이전 확장자 삭제 실패를 Err로 반환. Bookmark는 LibraryImages에서 write 후 삭제 오류 무시 | 같은 실패에 성공/실패 응답이 다름. 둘 다 이미지 바이트 저장은 비원자적. 공통 byte writer와 교체 결과/cleanup 경고 계약 후보 |
| thumbnail 선택 | Folder는 case-insensitive stem/extension 검사 후 read_dir에서 먼저 발견한 이미지. Bookmark는 png→jpg→jpeg→webp→gif 순서의 정확한 경로 조회 | 여러 이미지가 남으면 선택 정책이 다름. Bookmark에서 옛 png 삭제 실패 후 새 jpg 저장 시 다음 조회가 옛 png를 택할 수 있음(코드 추론). 공통 후보 선택·정렬 helper 후보 |
| 그룹 삭제 | Folder는 단일 settings에서 참조를 갱신. Bookmark는 settings→bookmarks→images 순서로 여러 자원을 변경 | 그룹 ID/name 정책은 유지. Bookmark의 중간 실패 복구는 별도 필요. library 디렉터리가 없으면 remove_group_images read_dir가 오류를 반환하는 경로도 있음 |
| 경로·DTO·시각 | Repo canonicalize, 다른 탐색기는 주로 입력 경로 유지. Movie snake_case/modified_ms u128, Tree camelCase/modifiedMs u64. Repo timestamp 초, Bookmark 생성 시각 로컬 문자열 | 기존 공개 계약이며 일괄 변경하지 않음. 내부 공통 타입을 도입할 경우 앱 adapter에서 기존 형식을 유지 |
| 구조·에러 | Folder는 trait port+application+infrastructure. Bookmark application은 concrete JSON/image store 의존. Repo는 lib.rs에 command·Git·JSON·도메인 통합. String 오류는 한/영·context가 다름 | Repo는 자신의 AGENTS의 hexagonal 지침과 구현 차이가 있음. 공통 에러 kind/context를 두고 Tauri 경계에서 문자열 변환 가능. 전면 계층 개편은 별도 작업 |

근거: [fs-core/list.rs](../crates/fs-core/src/list.rs), [scan.rs](../crates/fs-core/src/scan.rs), [Folder scanner](../../movie-folder-explorer/src-tauri/src/infrastructure/filesystem_directory_scanner.rs), [Folder commands](../../movie-folder-explorer/src-tauri/src/interface/commands.rs), [Repo backend](../../repo-explorer/apps/desktop/src-tauri/src/lib.rs), [Bookmark images](../../site-bookmark-browser/src-tauri/src/infrastructure/library_images.rs), [Tree commands](../../tauri-tree-file-explorer/apps/desktop/src-tauri/src/lib.rs).

## 재현 증거와 검증 한계

실제 Bookmark domain/store/application 소스를 `#[path]`로 불러오는 독립 임시 Cargo 프로그램을 작성하고 `cargo run --offline --quiet`로 실행했습니다. 앱 코드를 복사해 수정하거나 mock으로 대체하지 않았습니다. 실행 경로:

`/var/folders/3z/mcf5cp4n0t567wk9p_kjrpp80000gn/T/backend-parity-audit-4jb0tzsy`

```text
unknown_version: migrated=true group=default rating=0 disk.version=2
readonly_valid_settings: Err("설정을 갱신할 수 없습니다: JSON file is read-only")
migration_first: Err("기존 이미지를 이전할 수 없습니다: Permission denied (os error 13)")
migration_retry: thumbnail=None legacy_exists=true
```

권한은 fixture에만 적용하고 재현 후 복원했습니다. 통합 전 비교에는 기존 baseline snapshot을 사용했습니다. 동시 호출 순서, 이미지 cleanup 실패, UI 지연은 코드상 조건을 분석했으며 실행 재현으로 표시하지 않았습니다.

## 권장 순서

1. 미지원 버전 덮어쓰기 방지와 Bookmark migration의 원자성·재시도 문제를 먼저 해결합니다.
2. 공통 JSON API의 변경 없는 조회/갱신 계약을 정리하고 세 앱의 저장소 adapter에 적용합니다.
3. 이미지 byte 저장·확장자 정리·후보 선택을 공통 Rust 모듈로 추출하되 저장 위치와 이름 정책은 앱에 둡니다.
4. Repo scan의 job ID·취소·terminal 규약 및 blocking I/O 처리를 정렬합니다.
5. 경로·오류·시간 표현은 외부 계약을 유지하는 adapter와 함께 정리합니다. 폴더·영상·Git·한 단계 조회의 도메인 탐색 정책은 유지합니다.
