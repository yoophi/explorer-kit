# explorer-image-store

이미지 파일의 공통 저장·조회 함수입니다. Tauri에 의존하지 않습니다. 앱이 저장 디렉터리와 안전한 단일 파일명 stem을 생성하고, 이 crate는 `png → jpg → jpeg → webp → gif` 순서로 이미지를 조회합니다. 확장자 입력은 대소문자와 단일 앞쪽 점을 정규화합니다.

`save_image(directory, stem, extension, bytes, StemMatch)`는 공통 JSON 저장소의 `write_bytes_atomic`으로 먼저 저장한 다음 같은 stem의 다른 확장자를 정리합니다(AsciiCaseInsensitive는 대소문자 변형도 포함). `StemMatch::Exact`는 북마크, `AsciiCaseInsensitive`는 폴더처럼 stem 대소문자를 무시하는 용도입니다. 저장과 정리, 조회는 crate 내부 mutex로 같은 프로세스의 협력 호출을 직렬화합니다.

저장이 성공하고 정리만 실패하면 `SaveOutcome { saved_path, cleanup_warnings }`를 반환합니다. 호출자는 경고를 확인해야 합니다. 이전 `png`가 남은 상태에서 단순 `find_image`를 다시 호출하면 확장자 우선순위에 따라 그 파일이 선택될 수 있으므로, 경고가 해결되기 전에는 `saved_path`를 사용하거나 교체 작업을 미완료로 처리해야 합니다. 여러 프로세스 사이 직렬화나 여러 파일에 걸친 원자성은 제공하지 않습니다.

`SaveOutcome::is_complete()`는 정리 경고가 없는지 확인합니다. `into_completion()`은 `SaveCompletion::Complete { saved_path }` 또는 `SaveCompletion::CleanupIncomplete { saved_path, warnings }`를 반환합니다. 두 경우 모두 저장은 성공했으며, 정리 미완료 경우에도 저장 경로와 개별 경고를 잃지 않습니다. 앱은 사용자 문구와 IPC 형식을 결정합니다.

stem의 경로 구분자, 제어 문자, Windows 특수 문자, 앞뒤 공백은 거부합니다. stem 끝의 점은 확장자가 뒤에 붙으므로 허용하며, `.`·`..` 자체는 거부합니다. 앱별 이름 생성·경로·정체성 규칙, 이미지 내용 decode/MIME 검사는 이 crate의 범위 밖입니다. 테스트는 `tempfile` fixture만 사용합니다.

`migrate_image_if_absent(directory, legacy_stem, target_stem, StemMatch)`는 같은 이미지 mutex 안에서 이전합니다. 대상 stem의 이미지가 어느 확장자로든 이미 존재하면 이를 보존합니다. 대상이 없으면 legacy 후보 하나를 같은 디렉터리의 새 stem으로 rename합니다. 실패 시 legacy 파일은 유지되므로, 앱이 JSON version을 전환하기 전에 호출하고 실패 시 재시도할 수 있습니다. 앱의 여러 이미지 migration 전체에 대한 transaction은 제공하지 않습니다.

Exact 조회와 migration 후보 확인은 기존 Bookmark 방식처럼 소문자 확장자 5개의 경로를 직접 검사합니다. 대량 라이브러리를 북마크마다 순회하지 않습니다. AsciiCaseInsensitive 조회만 디렉터리를 순회하며, Exact 정리도 같은 5개 경로를 사용하며 파일시스템 고유의 대소문자 의미를 따릅니다. AsciiCaseInsensitive 정리는 대소문자 변형을 찾기 위해 디렉터리를 순회합니다.

`remove_images(directory, stem, StemMatch)`는 저장·이전과 같은 mutex로 variant 삭제를 직렬화합니다. 없는 파일은 성공으로 처리하며 다른 실패는 오류입니다. default group의 legacy stem도 지울지 여부는 앱이 결정합니다. 서로 다른 stem 여러 개의 삭제나 JSON 삭제까지 하나의 transaction으로 묶지는 않습니다.

정리·삭제는 metadata가 regular file인 후보에만 적용합니다. 디렉터리나 디렉터리를 가리키는 symlink는 삭제하지 않고 cleanup warning 또는 오류로 반환합니다. 읽을 수 없거나 손상된 후보를 안전하게 정리했다고 가정하지 않습니다.

## JSON 변경과 함께 이미지 삭제 준비

`stage_remove_images(directory, targets)`는 선택한 이미지들을 같은 디렉터리 아래의 `.explorer-image-stage-*`에 임시 보관하고 `StagedRemoval`을 반환합니다. `RemovalTarget::Stem { stem, stem_match }` 또는 정확한 파일명을 지정하는 `RemovalTarget::FileName(name)`으로 대상을 선택합니다. group prefix와 legacy stem 등 소유권 판단은 앱에 남습니다. 명시 파일명도 지원 이미지 확장자와 단일 파일명 검사를 통과해야 합니다. 실제 파일명의 확장자에는 공백·제어 문자를 정규화하지 않으므로 `notes.png ` 등은 거부합니다. 사용자 입력용 `normalize_extension`의 공백 정규화는 유지합니다.

1. JSON update callback 안에서 이미지 준비를 호출합니다. JSON 읽기·migration이 이미지 잠금을 쓸 수 있으므로 먼저 guard를 잡은 채 JSON update를 시작하지 않습니다.
2. guard를 callback 밖에 유지해 JSON 쓰기 결과가 나온 뒤 명시적으로 `rollback()` 또는 `commit()`합니다. guard가 있는 동안 같은 image-store의 다른 함수는 호출하지 않습니다.
3. JSON 실패 시 `rollback()` 오류도 확인합니다. 목적지에 다른 파일이 있으면 덮어쓰지 않고 복구하지 못한 자료와 경로를 남깁니다.
4. JSON 성공 후 `commit()`의 `CleanupFailed`는 DB 반영 실패가 아닙니다. `quarantine_directory`와 warnings를 처리하고 이미 반영된 DB를 되돌렸다고 표시하지 않습니다.

보관 중 image mutex를 유지합니다. 여러 대상의 준비가 실패하면 이미 이동한 파일을 복원합니다. 일반 파일을 가리키는 symlink는 링크 자체를 보관·복원·정리하며 대상 파일을 삭제하지 않습니다. 디렉터리와 디렉터리 symlink는 준비를 거부합니다. 비이미지 파일도 명시 대상으로 지정할 수 없습니다. 원래 파일명을 보관 디렉터리에서도 유지합니다.

`FileName`은 디렉터리 목록에서 확인한 정확한 철자를 전달하세요. 같은 물리 파일을 다른 대소문자 철자로 `Stem`과 `FileName`에 중복 지정하면, 대소문자를 구분하지 않는 파일시스템에서는 두 번째 이동이 실패하고 앞선 이동을 rollback합니다. 대소문자를 구분하는 파일시스템의 서로 다른 파일은 둘 다 준비할 수 있습니다. 이 API는 파일 identity를 기준으로 중복을 자동 병합하지 않습니다. 앱은 그룹 대상 파일을 실제 디렉터리 목록의 `FileName` 집합으로 선택하고 중복을 피해야 합니다.

명시 종료 없이 drop되면 복원을 시도하지만 실패는 로그로만 남으므로 정상 오류 경로에서는 반드시 `rollback()` 결과를 처리해야 합니다. 프로세스 중단 후 자동 복구, 다중 프로세스 동시 변경, 여러 파일의 crash 원자성을 제공하지 않습니다. 중단 후 남은 디렉터리는 JSON의 현재 상태와 원래 파일명을 확인해 복구 또는 정리해야 하며 자동으로 삭제하지 않습니다.
