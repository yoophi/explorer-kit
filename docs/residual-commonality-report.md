# 남은 공통화 조사와 구현

2026-10-05. 기존 후보 14개 게시 이후의 여섯 저장소를 다시 조사했다. M=Movie, F=Folder, R=Repo, B=Bookmark, T=Tree다. 선정한 추가 공통화의 구현·소비·검증과 독립 리뷰를 마쳤다.

## 범위와 기준

기준 커밋은 common `7089174`, M `b71c9a2`, F `4bcb9a1`, R `3d0338f`, B `0c134e2`, T `45e9184`다. 작업 전 파일·symlink snapshot은 `/tmp/explorer-residual-VlDr9S`에 보존했다. 최초 14개만 반복 확인하지 않고 Rust application/domain/infrastructure/IPC, 프론트엔드 UI·CSS·상태·API adapter 및 빌드 설정을 다시 조사했다.

- 백엔드: 앱 Rust 56파일(M5/F22/R6/B18/T5)의 목록과 build/main을 제외한 실행 경로, 공통 6 crate 공개 API·정책을 대조했다.
- UI: 공통45·앱50(M14/F7/R9/B9/T11), 총95개 TSX/CSS를 목록화하고 기본 요소, 대화상자, 패널, 테마의 실제 소비를 대조했다.
- 비 UI 프론트엔드: 스캔·선택11, 설정3, 이미지·정규화 등9, API adapter5의 구현28파일과 호출 화면11개를 대조했다.
- 조정자: 다섯 Vite 구성, M/R/T TypeScript 구성, workspace/UI package export, 앱 진입점을 비교했다. 완전 동일 파일 및 정규화한 연속18줄 중복 검색은 후보 발견의 보조 근거로만 사용했다.

두 앱 이상의 동일 계약을 구현하거나 이미 공통화한 책임의 중복 소비를 제거할 때 승격한다. 외형·동작을 바꾸거나 다른 정책을 하나로 강제하는 추상화는 만들지 않는다. 새 패키지 추가 없이 기존 패키지를 확장한다.

## 추가 구현 대상

| 항목 | 실제 소비 | 보존할 계약 | 상태 |
| --- | --- | --- | --- |
| 소문자화 후 Unicode 코드포인트 이름 비교 | M `entities/movie/scan-stream.ts`, T `entities/file-system/model/stream-directory.ts` | 비 BMP 문자 순서, 동률 안정 정렬; T 디렉터리 우선 정책은 앱 유지 | 완료 |
| 호환 테마 CSS | M/R `packages/ui/src/styles/globals.css` | 동일 기존 토큰·font·radius·source; 기존 Radix 기본 테마와 별도 export | 완료 |
| 기존 Base UI 테마 직접 소비 | F/B `src/index.css` | 공통 테마와 동일한 본문, 앱별 Tailwind source 유지 | 완료 |
| 클래스명 병합 함수 재수출 | M/R `packages/ui/src/lib/utils.ts` | 기존 import 경로와 clsx/tailwind-merge 동작 | 완료 |
| AsyncFormDialog 추가 소비 | B `rename-group-key-dialog.tsx`, `markdown-import-dialog.tsx` | 문구·아이콘·간격·건수·파싱·실패 입력 보존·성공 닫기, pending 중 중복 제출/닫기 차단 | 완료 |

## 앱에 남기는 책임

| 영역 | 현재 근거와 유지 이유 |
| --- | --- |
| 파일 순회·취소 backend | M ScanMovieFiles::stream, F filesystem_directory_scanner, R discovery, T outbound는 fs-core/scan-job을 이미 소비한다. 이벤트 DTO·검사·catalog 확정은 앱 정책이다. DFS/BFS를 무제한 옵션 조합으로 다시 일반화할 실제 소비처가 없다. |
| 모든 JSON의 단일 Repository/Cache | F json_folder_cache_store의 폐기 가능 캐시, R infrastructure의 catalog, B json_bookmark_store의 원본 데이터는 버전·누락·실패 보존 계약이 다르다. 저장 기계만 json-store/settings-store로 공유한다. |
| 폴더 metadata·rename | F domain/folder 및 RenameAndRefresh 전용이다. M의 영상 glob 탐색은 같은 이름 문법·후속 부작용을 사용하지 않는다. |
| Git·worktree·README | R domain/infrastructure 전용이다. 일반 walker만 공유하고 repository identity·부모 보정은 유지한다. |
| URL·Markdown·private browser | B domain/bookmark, application/bookmarks, private_browser 전용이다. R terminal launcher와 대상·OS·fallback 계약이 달라 범용 OS 실행으로 합치지 않는다. 폼 껍데기만 재사용한다. |
| 그룹 삭제·이미지 transaction | 순수 컬렉션 규칙과 이미지 저장 결과는 이미 공유한다. B의 이미지 격리→북마크 JSON→설정 갱신 순서는 F 그룹 설정 편집과 다르다. |
| 트리 builder 전체 | M 경로 집계·단일 chain 압축, R worktree/pinned 부모, T lazy tree는 identity·갱신 단위가 다르다. |
| 범용 path normalize | R canonicalize, F 새 폴더명 검증, B URL percent encoding, T lexical ID 변환은 다른 연산이다. |
| 스캔 배치·preview 전체 | M64개/40ms, T16개/30ms, F80ms, R50ms. M/T 완료 캐시, F 중단 수집분 유지, R terminal catalog 교체를 유지한다. 생명주기는 이미 scan-client를 사용한다. |
| 이미지 target key | F 경로/종류/video ID, B group ID/path는 다른 identity다. 수명만 image-input이 소유한다. |
| 설정 parser·선택 fallback | 저장·draft·선택 primitive는 이미 공유한다. M glob/부분 결과 보존, R 깊이0–20/초기 평면순서, T layout/URL history는 앱에 둔다. |
| Clipboard·format adapter | F 텍스트 읽기/날짜·artist, R 경로 쓰기/fallback, M formatBytes 위의 기존 반올림은 같은 책임의 복제가 아니다. |
| Tauri API adapter | 명령명·DTO snake_case 변환·folder→item 이벤트 변환은 앱 프로토콜 경계다. |
| 나머지 UI | M Input/Resizable과 공통 Radix는 radius/focus/hit area가 다르다. R separator는 앱 너비/hover가 있다. F/B 평점·삭제 행은 null/범위/삭제 흐름이 다르다. T 작은 Scanning 표시는 헤더 배치에 속한다. |
| 진입점·Provider | 동일한 main/app 몇 줄은 root 조립 경계다. Router·Query cache/retry 정책을 공유 설정으로 강제하지 않는다. |
| Vite·TypeScript 설정 | M/R 동적 포트와 T/F/B 고정 포트, HMR 포트, workspace root, optimizeDeps 대상이 다르다. TS 기본값이 같아도 각 앱의 toolchain 업그레이드 경계를 유지한다. |

기존 제외 8항목(폴더 metadata, Git, URL, 단일 Repository/Cache, 전체 hook, 전체 tree builder, 범용 경로, Provider)은 위의 현재 실행 경로 근거로 유지한다. 새 실제 소비처가 생겨 동일 계약을 확인하면 재평가한다.

## 검증·리뷰

- 공통 최종 `pnpm check`: TypeScript, Node52, Rust60+doctest1, JS/CSS 소비 빌드, Storybook 모두 통과. 별도 아키텍처 검사도 다섯 앱의 선택된 FSD import·Rust 경계에서 통과했다.
- Movie: 테스트14, 타입·앱 빌드·Storybook 빌드 통과. Tree: 스트리밍 fixture7, 타입·앱 빌드 통과. 기존 Node 직접 테스트의 상대 import 문제는 bundling/기존 loader 경로로 검증했으며 core 공개 API는 loader 없이 별도로 확인했다.
- Folder·Repo: 타입 검사 포함 앱 빌드 통과, Repo Storybook 빌드 통과. 이번 두 앱의 수정은 CSS·유틸 재수출이며 Rust 소스는 변경하지 않았다.
- Bookmark: 테스트11, 타입 검사 포함 앱 빌드 통과. 실제 두 dialog를 메모리 callback fixture로 렌더하여 Enter·Escape·pending·실패 입력 보존·재시도 성공·중복 제외 건수·아이콘·block 배치를 확인했다. 상세 증거는 [폼 기록](residual-dialog-notes.md)에 있다.
- 최종 M/R/F/B 생성 CSS가 모두 변경 전 산출물과 바이트 동일하다. 폰트·토큰·유틸리티와 해시는 [테마 기록](residual-theme-notes.md)에 있다. 공통 Storybook의 별도 iframe이 새 CSS export를 소비하며 브라우저에서 배경 oklch(0.99 0 0), outline border oklch(0.89 0 0), radius8px, Geist 로딩과 오류0을 확인했다.
- 정렬 계약의 출처·테스트와 native export 보완은 [이름 비교 기록](residual-sort-notes.md)에 있다. source package·앱 경로 연결을 실제 빌드와 import로 확인했다.

### 독립 리뷰와 처리

구현자와 다른 Herdr codex/gpt-6-sol/medium 탭으로 리뷰했다. review-data는 core/M/T, folder-shared는 공통 폼/B, repo-shared는 테마/CSS/Storybook을 검토했다.

1. 조정자 리뷰: Tree의 항목당 소문자화·코드포인트 전처리와 로컬 UI CSS의 상대 @source를 보존하도록 수정했다. 두 Bookmark 폼의 기존 block 배치와 아이콘을 보존했다.
2. review-data P3: 기존 core 확장자 없는 export가 새 정렬 API의 네이티브 Node import도 막는 문제를 수정했다. format/type/sort 경로에 .ts를 명시하고 새 프로세스의 패키지명 import 테스트 및 두 앱 직접 import로 해결을 확인했다. 정렬·안정성·배열 불변성 신규 회귀 없음.
3. folder-shared: Bookmark11·빌드·공통 타입 검사를 직접 통과했고 도메인 파싱·결과 처리·폼 상태의 추가 finding 없음. 실제 브라우저 검증은 조정자가 보완했다.
4. repo-shared: 네 앱 빌드·CSS 동일성·패키지 경로·폰트·M/R 및 공통 Storybook 빌드를 직접 확인했다. iframe story 클래스가 실제 버튼과 같은 cn 병합을 거치도록 보완 후 추가 finding 없음.

### 유지한 제한

네이티브 Tauri 창·OS별 패키징·실제 디렉터리의 전체 성능 벤치마크는 수행하지 않았다. 사용자 데이터 rename·삭제·migration은 실행하지 않았다. 정렬만 측정한 3만 이름 반복 실험에서 기존/new 중앙값은 일반 이름14.6/15.5ms, 긴 접두 이름168.4/177.6ms로 약5–6% 비용 차이가 있었다. 전처리 구조는 보존했지만 동일 실행 시간이나 성능 향상을 주장하지 않는다. 실제 탐색 병목으로 확인될 경우 배열용 index 비교 최적화를 평가한다. 검증된 현재 범위에서 추가 API 복잡도는 도입하지 않았다.

## 완료 기준 감사

| 요구 | 현재 증거 |
| --- | --- |
| 14개에 한정하지 않은 잔여 조사 | Rust56·UI/CSS95·비 UI 구현28+소비11 및 구성 파일 감사, 기존 제외8항목 재판정 |
| 적정한 모든 선정 후보 구현 | 위5행 완료, 새 runtime 패키지 없이 실제 호출·CSS import로 연결 |
| 안정성·확장 가능성 보존 | 앱별 유지 책임 표, 기존 저장/IPC/Rust 스키마 무변경, 정렬·폼·CSS 계약 검증 |
| 공통 선행 검증·앱 통합 | 담당별 [정렬](residual-sort-notes.md)/[테마](residual-theme-notes.md)/[폼](residual-dialog-notes.md) 기록 |
| Storybook·문서·작업 이력 | 호환 테마 iframe·폼 조합 story, 여섯 README 및 provenance/PROMPT/CONTEXT 갱신 |
| 적용 보고 후 독립 리뷰·수정 | 위 리뷰3개와 P3 해결, 사용자 중간 적용 완료 보고 후 리뷰 수행 |
| 게시 | 아래 게시 기록 및 원격 SHA/clean 확인으로 완료 판정 |

