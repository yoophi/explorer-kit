# 백엔드 공통 기능 승격 결과

## 공통 계약

| 모듈 | 승격 내용 | 도메인 경계 |
| --- | --- | --- |
| explorer-json-store | 조건부 transaction Unchanged/Write, 명시적 지원 버전 검사, atomic byte writer | schema 변환·경로·기본값은 앱 |
| explorer-image-store | 확장자·stem 검증, 원자적 저장, cleanup 결과, 결정적 조회, 재시도 가능한 legacy 이전 | 이미지 key·저장 위치·마이그레이션 순서는 앱 |
| explorer-scan-job | 작업 ID 중복 차단, 취소 token, RAII 등록 정리, terminal 판정 | traversal·Tauri 이벤트·응답 DTO는 앱 |

기존 fs-core의 영상 glob/한 단계 목록과 TypeScript 패키지 계약은 유지합니다. 공통 JSON은 미지원 버전을 legacy로 간주하지 않으며 정상 조회는 파일을 다시 쓰지 않을 수 있습니다. 이미지 cleanup 실패는 저장 성공과 구분해 호출자에 전달합니다. 여러 파일·여러 프로세스 transaction은 제공하지 않습니다.

## 공통 검증

최종 `pnpm check`가 종료 코드 0으로 통과했습니다. TypeScript 검사, Node 테스트 16개, JS/CSS bundle 빌드, Rust 테스트 28개를 포함합니다. Rust 구성은 fs-core 3개, json-store 10개, image-store 10개, scan-job 5개입니다. `cargo test --workspace --locked`와 `cargo fmt --all --check`도 통과했습니다.

## 앱 적용 결과

- Movie: scan_movie_files를 async spawn_blocking adapter로 변경. 명령·glob·DTO 유지. Rust 2개, cargo check/fmt, typecheck/build 통과.
- Tree: list_dir를 async spawn_blocking adapter로 변경. 명령·DTO 유지. cargo test(앱 0개)/check/fmt, typecheck/build 통과.
- Folder: 공통 이미지 저장·조회, scan-job, 조건부 settings transaction 적용 완료. 이미지 cleanup 오류는 dialog에 노출. typecheck·Node 10개·build·Rust 18개·cargo check·diff 검사 통과.
- Bookmark: 버전 보호·조회 무저장·재시도 migration·공통 이미지 저장 적용 완료. build·Node 5개·Rust 28개·cargo check·수정 파일 rustfmt·diff 검사 통과. 전체 fmt check는 변경하지 않은 private_browser.rs의 기존 포맷 때문에 실패.
- Repo: scan-job·작업 ID·진행/terminal 이벤트·취소 UI·blocking I/O offload 적용 완료. 구독 정리와 ack 전 취소 재전송을 app scan-session으로 분리. TS 3개·Rust 10개·typecheck/build·cargo check/fmt·diff 검사 통과.

## 변경 추적과 제한

이 작업 직전 source snapshot: `/var/folders/3z/mcf5cp4n0t567wk9p_kjrpp80000gn/T/backend-promotion-baseline-vegfb0x_`. 최초 공통화 이전 snapshot과 구분합니다. Git HEAD에는 기존 사용자 변경이 포함되지 않으므로 리뷰는 이번 snapshot을 기준으로 수행합니다.

실제 사용자 데이터는 테스트하지 않고 임시 fixture만 사용합니다. 네이티브 UI 검증은 아직 수행하지 않았습니다. 이미지 decode 검증·프로세스 간 lock·파일 inode/xattr 보존은 이번 공통 계약에 포함되지 않습니다. 기존 사용자 변경과 데이터 schema/경로를 유지하고 commit/push/환경 도구 업그레이드는 하지 않습니다.

다섯 앱 적용 완료를 사용자에게 먼저 보고한 뒤 review-data(저장·migration·이미지), review-ui(스캔·취소·adapter)에게 독립 리뷰를 요청했습니다. 두 에이전트는 기존 Herdr codex/gpt-6-sol/medium 탭을 재사용합니다. 독립 리뷰와 후속 재검토를 완료했으며 이번 범위에서 남은 도입 회귀는 발견하지 못했습니다.

## 감사 재현 조건의 재검증

조정자는 실제 Bookmark 모듈을 import하는 별도 임시 Cargo 프로그램으로 이전 감사의 3가지 조건을 다시 실행했습니다. `cargo run --offline --quiet` 종료 코드 0이며 모든 assertion이 통과했습니다.

```text
unknown_version: rejected=true original_preserved=true
readonly_valid_settings: Ok("ok")
migration_first: Err("... Permission denied (os error 13)")
migration_retry: thumbnail=Some(".../library/default%3A%2Fone.png") legacy_exists=false
```

검증 경로: `/var/folders/3z/mcf5cp4n0t567wk9p_kjrpp80000gn/T/backend-promotion-verify-h3agffac`. 첫 이전 실패는 의도적으로 fixture 디렉터리 권한을 제한한 결과이며, 권한 복원 뒤 재조회 성공을 확인했습니다. 실제 사용자 데이터는 사용하지 않았습니다.

## 독립 리뷰와 수정

앱별 적용 완료 보고 후 기존 Herdr `codex / gpt-6-sol / medium` 탭에서 독립 리뷰했습니다. `review-ui`는 스캔·취소·어댑터, `review-data`는 JSON·이미지·마이그레이션을 담당했습니다.

| 발견 사항 | 수정 | 재검토 상태 |
| --- | --- | --- |
| Repo effect 재설치 시 이전 readiness/실행 상태 잔존 | 상태 초기화, 두 구독 설치 완료 후 세션 공개 | review-ui 해결 확인 |
| 정상 Bookmark v2의 이미지 접근 오류가 메타데이터 조회까지 차단 | v1 필수 이전과 v2 best-effort 복구 분리 | review-data 해결 확인 |
| 기본 그룹 삭제 후 legacy 이미지 재연결 | 현재 이미지와 해당 legacy variant 함께 삭제, 다른 그룹 보존 | review-data 정상·실패 후 재시도 경로 확인 |
| 이미지 정리 중 디렉터리 symlink 삭제 | 실제 regular file 확인, 디렉터리 링크는 보존하고 오류 반환 | review-data fixture 확인 |
| 이미지 삭제 실패 전에 JSON 항목이 제거되어 재시도 불가 | JSON callback에서 이미지 정리 후 항목 제거; 그룹 존재/마지막 그룹 사전 검증 | review-data 독립 fixture 및 Rust28 재검증 통과 |

마지막 수정에는 북마크·그룹 삭제 실패 시 원본 보존, 권한 복구 후 재시도, 마지막 그룹 보호 테스트를 추가했습니다. Bookmark Rust 테스트 28개가 통과했습니다. JSON 잠금을 중첩하지 않으며, 여러 파일에 대한 완전 rollback transaction을 제공한다는 의미는 아닙니다.

Exact 이미지 조회는 canonical 소문자 확장자 다섯 개에 직접 접근합니다. 기존 Bookmark와 동일한 파일시스템 case 의미를 사용하며 전체 이미지 폴더를 열거하지 않습니다. Folder는 명시적인 ASCII 대소문자 무시 모드를 사용합니다.

최종 review-data fixture는 마지막 그룹 보호, 단일 항목·그룹 삭제의 이미지 정리 실패 시 JSON/settings 보존, 권한 복원 후 재시도 성공을 확인했습니다. 리뷰어가 Bookmark Rust28·Node5·cargo check·build와 공통 Rust28을 직접 재실행했습니다. 테스트 중 의도한 권한 거부 로그는 실패 복구 조건의 일부입니다.
