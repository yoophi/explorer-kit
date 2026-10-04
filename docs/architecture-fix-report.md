# 아키텍처 리뷰 수정 결과

구현·검증·독립 리뷰를 완료했습니다. 대상은 [구조 리뷰](architecture-review.md)의 H1~H5/F1~F3이며, 추가 공통 기능14개 승격은 포함하지 않습니다. 기존 기능 결함의 미해결 상태도 별도로 유지합니다.

변경 전 snapshot: `/var/folders/3z/mcf5cp4n0t567wk9p_kjrpp80000gn/T/architecture-fix-baseline-1jkxu9_k`.

## 변경 경계

- 기존 JSON schema·migration·IPC DTO·저장 위치·UI 동작 유지.
- repository port를 도입해도 update callback과 잠금 범위를 유지.
- 스캔 ack·cancel·terminal·catalog commit 계약 유지.
- FSD 공개 API는 필요한 export만 명시하고 feature 교차 의존·Shared 역방향 제거.
- 앱별 README를 실제 구현에 맞게 갱신하고, 독립 리뷰 후 완료 여부 기록.

## 반복 확인

공통 저장소 루트에서 `pnpm check:apps-architecture`를 실행합니다. 다섯 sibling checkout이 필요하므로 독립 공통 저장소의 `pnpm check`에는 포함하지 않습니다.

TypeScript compiler API로 정적 import/export 및 문자열 dynamic import의 `@/`·상대 경로를 확인합니다. 레이어 역방향, 다른 feature/entity slice 참조, 공개 API 우회를 검사합니다. Rust는 domain/application의 production 부분에 명시된 infrastructure·Tauri·std I/O 경로를 검색하는 보조 검사입니다. 별칭을 통한 Rust 접근이나 모든 semantic dependency를 증명하는 검사가 아니므로 port 구현과 유스케이스 책임은 코드 리뷰를 병행합니다.

변경 전 snapshot에 실행하여 공개 API 우회25·slice 교차2·역방향1·application의 infrastructure import3을 탐지했습니다. 이 초기 실패는 기존 리뷰와 일치합니다.

## 앱별 수정

| 앱 | 반영 내용 | 해당 지적 |
| --- | --- | --- |
| Movie | ScanMovieFiles와 scanner 포트, 공통 FS outbound adapter, preferences 공개 API | H5/F2 |
| Folder | 그룹 순수 규칙, streaming/cancel 포트, thumbnail·rename application, 화면 pages 이동·공개 API | H3/F2 |
| Repo | domain/application/infrastructure 분리, FS/Git/JSON·progress 포트, Storybook 조립을 .storybook로 이동 | H1/F2/F3 |
| Bookmark | callback형 repository·image 포트, 그룹 mutation lock과 DeleteGroup application, 화면 pages 이동·공개 API | H2/H4/F2 |
| Tree | settings slice에 숨김 토글 통합, 공개 API, home/list application 포트 | H5/F1/F2 |

## 중간 검토에서 보완한 동작

Folder의 rename 조합을 이동하면서 설정 저장소 경로 해석이 rename 앞으로 이동한 것을 발견했습니다. 지연 callback으로 복구했으며 `update_last_opened_directory=false`이면 조회하지 않고, true이면 rename 성공 후 설정을 조회합니다. 설정 실패는 thumbnail 조회 전에 반환합니다. 이 순서를 fake 테스트로 검증했습니다.

Repo catalog도 path resolver를 지연시켜 metadata 저장 이후 catalog 조회·쓰기 순서를 유지했습니다. scan timestamp는 경로 정규화 뒤 started 이벤트 전, metadata timestamp는 catalog 저장 뒤에 생성합니다. fake-port 테스트로 저장 성공 뒤 catalog 실패가 전달되는 순서를 확인했습니다.

FSD 화면 이동은 hook·상태·이벤트 핸들러를 유지하고 import와 화면 export 경계를 변경합니다. 공개 index는 명시적으로 export하며 내부 파일은 상대 import를 유지해 자기 index를 통한 순환을 피합니다. 기존 이미지 처리3건과 root 경로 P3는 이 작업의 해결 대상이 아닙니다.

## 검증 기록

| 범위 | Node/TypeScript 테스트 | Rust 테스트 | 추가 검증 |
| --- | --- | --- | --- |
| 공통 저장소 | 25 | 35 | 타입·소비 빌드·Storybook 정적 빌드 |
| Movie | 4 | 5 | 타입·빌드·cargo check·fmt |
| Folder | 10 | 26 | 타입·빌드·cargo check |
| Repo | 9 | 15 | 타입·빌드·Storybook 정적 빌드·cargo check·fmt |
| Bookmark | 5 | 33 | 타입·빌드·cargo check·수정 Rust fmt |
| Tree | 5 | 4 | 타입·빌드·cargo check·fmt |

공통 전체 검사는 조정자가 실행했고 앱 검사는 각 Herdr 담당자가 실행했습니다. 조정자가 `pnpm check:apps-architecture`를 다시 실행해 다섯 앱의 정적 경계 검사 통과를 확인했습니다. 변경 전 FSD28건·Rust 직접 import3건은 해당 검사에서 더 이상 검출되지 않습니다. README 로컬 링크와 여섯 저장소 `git diff --check`도 확인했습니다. 검사에 통과했다는 사실이 모든 의존 관계와 기능의 완전한 증명은 아닙니다.

네이티브 앱 실행·패키징 및 변경 후 UI 수동 재검증은 이번 범위에서 수행하지 않았습니다. 실제 사용자 데이터 변경, commit/push, 도구 업그레이드는 하지 않았습니다.

## 독립 리뷰

다섯 앱 반영을 사용자에게 보고한 뒤 기존 `review-ui`·`review-data` 탭에 현재 snapshot 기준의 독립 리뷰를 배정했습니다. 두 리뷰 모두 완료했으며 현재 변경에서 재현 가능한 추가 회귀는 발견하지 못했습니다.

`review-data`는 다섯 앱의 실제 호출 경로를 baseline과 비교하고 Rust 테스트 Movie5/Folder26/Repo15/Bookmark33/Tree4를 직접 재실행했습니다. Folder 지연 설정 조회, Repo 저장·timestamp·commit/취소 순서, Bookmark callback 잠금과 삭제 순서를 확인했으며 새 도입 회귀는 발견하지 못했습니다. 네이티브 이벤트 전달과 모든 동시 실행 순서까지 검증한 것은 아닙니다.

`review-ui`는 다섯 앱의 변경 소스를 대조했습니다. Folder·Bookmark의 화면 본문과 handler 유지, Tree의 동일 settings store 연결, 새 import cycle 부재, Repo의 전역 Storybook decorator를 확인했습니다. 현재 경계 검사 통과와 baseline의 기존 31건 탐지도 직접 확인했습니다. `.storybook`은 검사 스크립트 대상 밖이므로 provider 경로를 수동으로 검토했습니다.

## 남은 별도 과제

2026-10-05 후속 갱신: 아래 이미지3건과 root 경로 P3는 이후 [기능 리뷰 수정 작업](remaining-review-fixes-report.md)에서 해결했습니다. 아래 목록은 아키텍처 수정 완료 시점의 이력입니다.

- 이전 기능 리뷰의 이미지 처리3건과 root 경로 P3는 미해결 상태를 유지합니다. [기능 리뷰](shared-code-review.md)를 참고하세요.
- 추가 공통 기능14개는 조사 결과이며 아직 구현하지 않았습니다.
- Movie/Repo의 큰 page 전용 모델 분리 등 별도 개선 권고는 이번 H1~H5/F1~F3 수정 완료와 구분합니다.

[변경 파일·해시 목록](architecture-fix-changes.json)은 현재 작업 직전 snapshot과 비교합니다. git diff 전체에는 이전 공통화 작업이 포함되므로 이번 변경 목록과 구분해야 합니다.
