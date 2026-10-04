# 남은 기능 리뷰 지적 수정

2026-10-05 구현·검증·독립 리뷰를 완료했습니다. [기능 리뷰](shared-code-review.md)의 이미지 관련1·2·3과 루트 경로5를 대상으로 합니다. 숨김 트리 행 잔존4는 이전 설정 작업에서 수정했습니다. 추가 공통 후보14개 승격은 이번 범위가 아닙니다.

변경 전 snapshot: `/var/folders/3z/mcf5cp4n0t567wk9p_kjrpp80000gn/T/remaining-fixes-baseline-_rzae4t3`.

## 수정 조건

- JSON 갱신 실패 시 항목과 이미지 모두 보존하고 재시도할 수 있어야 합니다.
- 이미지 준비 실패 시 JSON을 삭제하지 않아야 합니다. 여러 이미지 중 일부만 준비된 경우 복원해야 합니다.
- 점으로 끝나는 북마크 path의 저장·조회·삭제·legacy 이전을 유지합니다.
- 그룹 정리 시 지원 이미지 파일만 처리하고 비이미지 파일·디렉터리·디렉터리 symlink를 보존합니다.
- 트리 경로 변환은 `/`와 끝 구분자를 처리하며 유사 prefix의 다른 경로를 포함하지 않습니다.

## 진행 순서

공통 image-store와 file-tree의 회귀 테스트 → 공통 전체 검사 → Bookmark 적용·Tree 소비 검증 → 적용 보고 → 독립 리뷰 순서로 진행합니다. 기존 Herdr codex/gpt-6-sol/medium 탭을 재사용합니다.

이미지 임시 보관·복원은 프로세스 내 협력 호출의 실패 복구를 위한 방식입니다. 여러 파일 전체의 crash 원자성이나 다른 프로세스와의 직렬화를 자동으로 보장하지 않습니다. 실패 시 보관 경로와 상태를 확인할 수 있도록 결과 계약을 검토합니다.

## 공통 구현

### 이미지 파일

`explorer-image-store`는 끝점 stem을 허용하면서 경로 구분자·제어 문자·위험한 단일 파일명은 계속 거부합니다. 최종 이름이 `stem.extension`이므로 `/trailer.`에서 파생한 `default%3A%2Ftrailer..png`를 다시 처리할 수 있습니다.

새 `stage_remove_images`는 여러 대상의 이미지 파일을 같은 파일시스템의 숨김 디렉터리로 보관합니다. `StagedRemoval`이 이미지 잠금을 유지하고 JSON 결과에 따라 명시적으로 복원 또는 확정합니다. 복원 충돌은 다른 파일을 덮지 않고 보관 자료와 오류 경로를 남깁니다. 확정 후 파일 정리 실패는 `CommitOutcome::CleanupFailed`로 구분합니다. [API와 복구 절차](../crates/image-store/README.md)를 참고하세요.

단일 파일명을 여러 철자로 중복 지정하는 것을 자동으로 병합하지 않습니다. 대소문자 구분 파일시스템의 서로 다른 파일은 모두 처리할 수 있고, 구분하지 않는 파일시스템의 중복 별칭은 실패 시 복원합니다. 소비 앱은 디렉터리에서 읽은 정확한 파일명으로 대상 집합을 구성해야 합니다.

### 트리 경로

root와 입력 경로의 끝 슬래시를 정규화하고 `/`에는 중복 슬래시를 붙이지 않습니다. root 자체는 하위 Tree ID에서 제외하며 `/home/user`와 `/home/username`을 구분합니다. 기존 POSIX 계약을 유지하고 Windows 경로 지원을 새로 추가하지 않았습니다.

## 검증 기록

공통 최종 `pnpm check`가 통과했습니다. Node29개, Rust46개(image-store21개 포함), 전체 타입·소비 빌드·Storybook 정적 빌드가 포함됩니다. 로그는 작업 환경의 `/tmp/remaining-common-check-final.log`에 있습니다.

Folder 영향 검증: Rust26·cargo check·타입·빌드 통과. 앱 소스는 바꾸지 않았고 Cargo.lock의 image-store 런타임 tempfile 의존성 항목만 갱신했습니다.

Tree 소비 검증: paths 경계4·설정 Node5·Rust4·타입·빌드 통과. 실제 `@pierre/trees` 모델 fixture에서 `/`와 `/home/user/`의 초기 행·하위 경로 추가·선택 ID 왕복을 확인했습니다. 앱 소스 변경 없이 README의 미해결 문구를 갱신했습니다.

Bookmark 최종 검증: Rust40·Node9·타입·빌드·cargo check·아키텍처 검사·수정 Rust fmt 통과. 전체 `cargo fmt --check`는 수정하지 않은 기존 `private_browser.rs` 포맷으로 실패하며 해당 파일은 baseline과 동일합니다. Movie/Repo는 이번 소비 변경 대상이 아니므로 앱 테스트를 재실행하지 않았습니다. 테스트는 임시 fixture를 사용하며 실제 사용자 데이터 변경·commit/push·도구 업그레이드는 하지 않습니다.

명시 파일명의 실제 확장자는 입력 정규화와 분리했습니다. `.png `·`. png`·개행 suffix 파일을 거부·보존하는 회귀 테스트를 추가했고 공통 전체 검사를 재통과했습니다. 기존 `StemMatch::AsciiCaseInsensitive` 조회의 확장자 정규화 정책은 변경하지 않았습니다. Bookmark 그룹 정리는 명시 파일명 검증을 사용합니다.

## Bookmark 적용 결과

`ImageRepository`의 associated Removal과 `ImageRemoval` 포트로 application이 공통 구체 guard에 의존하지 않도록 했습니다. `BookmarkRepository.update` callback 안에서 migration 이후 이미지를 준비하고, JSON 쓰기 결과가 나온 뒤 명시적으로 복원 또는 확정합니다. library/image 잠금은 그 수명 동안 유지합니다. 그룹 현재 이미지는 정확한 디렉터리 파일명으로 수집하고, legacy 대상은 기본 그룹의 알려진 북마크 path에서만 생성합니다.

읽기 전용 JSON의 단일·그룹 삭제 실패 시 JSON bytes·현재 이미지·legacy·orphan을 보존하며 권한 복구 후 재시도할 수 있습니다. 읽기 전용 이미지 디렉터리와 잘못된 후속 이미지 후보도 JSON을 삭제하지 않습니다. `/trailer.`의 v1 이전·저장·조회·삭제, 대문자 확장자 orphan 정리, 다른 그룹·비이미지·공백 suffix·디렉터리 링크 보존을 fixture로 검증했습니다.

JSON 반영 이후 격리 정리만 실패하면 기존 IPC 오류 응답에 삭제 완료 상태를 명시합니다. 프론트엔드는 목록을 재조회하며, 재조회까지 실패하면 이미 삭제된 것으로 확인된 항목은 로컬에서도 제거하고 두 오류를 함께 표시합니다. 중복 일괄 정리는 해당 항목을 완료 개수에 포함한 뒤 중단합니다. 성공 응답의 기존 형태는 유지했습니다.

## 독립 리뷰와 보완

- 공통 image-store의 잠금·rollback·commit·symlink·별칭 처리와 최종 명시 파일명 보호를 리뷰했고, reviewer가 공통 Rust21개를 직접 재실행했습니다.
- Tree paths4개와 실제 @pierre/trees 모델의 두 root 형식·graft·선택 왕복을 독립 재검증했습니다.
- Bookmark backend는 실제 모듈을 사용한 별도 임시 fixture에서 JSON 읽기 전용 실패와 이미지 보존, 재시도, 비이미지 보존을 확인했습니다. 최종 Rust40개를 reviewer가 다시 실행하고 추가 회귀 없음으로 확인했습니다.
- UI 리뷰에서 발견한 일괄 삭제 count 과소표시와 그룹 삭제 후 재조회 실패 시 상태 불일치 P3 두 건을 수정했습니다. 새 Node4개를 reviewer가 직접 실행하고 두 건 해결·추가 회귀 없음으로 확인했습니다.

## 남는 한계

네이티브 UI 실행·패키징, 프로세스 중단 후 자동 복구, 다중 프로세스 직렬화는 검증·제공 범위 밖입니다. 그룹 삭제 마지막 settings 쓰기가 실패하면 앞서 반영된 bookmarks·이미지 삭제를 되돌리지 않는 기존 다중 파일 부분성은 유지합니다. 격리 정리·복구 실패 자료는 경로를 보고하고 보존하므로 수동 확인이 필요할 수 있습니다.

[변경 파일·해시 목록](remaining-review-fixes-changes.json)은 이번 작업 직전 snapshot 기준입니다. 기존 미커밋 공통화·아키텍처 작업은 이 변경 범위와 구분합니다.
