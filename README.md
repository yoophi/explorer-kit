# Explorer Kit

다섯 데스크톱 탐색기에서 복사한 공통 구현을 제공하는 [공개 GitHub 저장소](https://github.com/yoophi/explorer-kit)입니다. TypeScript source package 11개, 개발 도구 1개, Rust crate 5개로 구성됩니다. 기존 앱의 도메인 모델과 데이터 저장 위치는 소비 앱이 관리합니다.

## 패키지

| 경로 | 패키지 | 제공 기능 |
| --- | --- | --- |
| packages/ui-base | @yoophi/ui-base | 폴더·북마크의 Base UI 컴포넌트 13개와 테마 |
| packages/ui-radix | @yoophi/ui-radix | 파일 탐색기의 Radix 계열 UI와 resizable, 테마 |
| packages/core | @yoophi/explorer-core | FileEntry 타입, 크기·수정일 표시 |
| packages/file-tree | @yoophi/file-tree | controlled 가상화 폴더 트리 |
| packages/file-list | @yoophi/file-list | controlled 파일 목록과 loading/empty/error 상태 |
| packages/scan-client | @yoophi/scan-client | transport를 주입받는 제네릭 스캔 이벤트 소비·취소 |
| packages/image-input | @yoophi/image-input | 클립보드 이미지 추출, MIME 검사, 바이트 변환, preview 수명 관리 |
| packages/rating | @yoophi/rating | 북마크의 0~5점·0.5점 단위 평점 표시·입력 |
| packages/collection-core | @yoophi/collection-core | 태그 집계·크기, 문자열 정규화, seeded shuffle 순위 |
| packages/settings-core | @yoophi/settings-core | 검증·버전 보호·오류 복구를 갖춘 브라우저 설정 저장과 React 구독 |
| packages/settings-ui | @yoophi/settings-ui | 설정 섹션·필드·토글·저장 상태 구성 요소 |
| packages/dev-tools | @yoophi/explorer-dev-tools | 사용 가능한 포트로 Vite와 Tauri 동시 실행 |
| crates/fs-core | explorer-fs-core | 단일 디렉터리 조회, glob 기반 재귀 파일 검색 |
| crates/json-store | explorer-json-store | JSON 읽기, 조건부 갱신, 버전 검사, 원자적 byte 저장 |
| crates/image-store | explorer-image-store | 이미지 확장자·후보 선택·원자적 교체와 정리 결과 |
| crates/scan-job | explorer-scan-job | 스캔 작업 등록·취소·수명·종료 판정 |
| crates/settings-store | explorer-settings-store | 앱 정책 callback으로 기존 schema를 유지하는 JSON 설정 transaction |

## 설치와 검증

Node 22 이상, pnpm 9.15.5, Rust stable이 필요합니다.

```sh
pnpm install --frozen-lockfile
pnpm check
```

`pnpm check`는 모든 패키지와 소비 예제의 TypeScript 검사, Node 테스트, 브라우저용 JS·CSS bundle, Rust 테스트를 실행합니다. `pnpm build` 산출물은 `dist/consumer.js`, `dist/consumer.css`이며 배포 앱이 아닌 통합 빌드 검증용입니다. 네이티브 창과 브라우저 렌더링 검증은 포함하지 않습니다.

## 로컬 앱에서 사용

이 저장소에서 먼저 `pnpm install`을 실행합니다. 원본 앱의 package.json에 앱 디렉터리 기준의 `link:` 의존성을 추가합니다. 단일 앱 저장소가 이 저장소와 형제 디렉터리이면 다음과 같습니다.

```json
{
  "dependencies": {
    "@yoophi/ui-base": "link:../explorer-kit/packages/ui-base",
    "@yoophi/scan-client": "link:../explorer-kit/packages/scan-client"
  }
}
```

`apps/desktop` 안의 package.json에서는 `../../../explorer-kit/packages/...`를 사용합니다. 링크된 패키지의 전이 의존성은 Explorer Kit에서 설치하므로 두 저장소를 함께 checkout하고 각각 install해야 합니다. registry 배포와 단독 앱 checkout은 현재 지원 범위에 포함되지 않습니다.

```tsx
import { Button } from "@yoophi/ui-base/components/button";
import { consumeScan } from "@yoophi/scan-client";
```

Vite에서는 링크된 소스와 React의 단일 인스턴스를 사용하도록 구성합니다. 기존 설정과 병합해야 합니다.

```ts
resolve: { dedupe: ["react", "react-dom"] },
optimizeDeps: { exclude: ["@yoophi/ui-base", "@yoophi/scan-client"] }
```

앱 CSS에서 필요한 테마 하나를 가져옵니다. 기존 디자인을 유지하려면 앱 테마를 유지한 채 `@source`만 추가할 수도 있습니다. source 경로는 해당 CSS 파일 기준입니다.

```css
@import "@yoophi/ui-base/globals.css";
/* 이 예제는 examples/consumer/src/styles.css 위치 기준 */
@source "../../../packages";
```

공통 패키지에 외부 파일이므로 Vite의 파일 접근 제한이 있는 앱은 기존 `server.fs.allow`에 Explorer Kit 경로를 추가합니다. 기존 workspace 경로도 유지합니다. 자세한 소비 형태는 `examples/consumer`가 검증합니다.

Rust에서는 앱의 Cargo.toml 위치를 기준으로 path dependency를 추가합니다.

```toml
# 원본 단일 앱의 src-tauri/Cargo.toml 기준
explorer-json-store = { path = "../../explorer-kit/crates/json-store" }
explorer-fs-core = { path = "../../explorer-kit/crates/fs-core" }
```

## 유지하는 동작과 제한

- `consumeScan<T>` 이벤트는 `item`, `completed`, `cancelled`, `failed`와 `scanId`를 사용합니다. 기존 `folder` 이벤트는 앱 transport에서 `item`으로 변환합니다. start 응답은 등록 확인이며, 실제 종료는 terminal 이벤트입니다.
- 파일 트리는 기존 POSIX 절대 경로 계약을 유지합니다. root 변경은 remount해야 하며 Windows 경로 대응은 별도 작업입니다.
- `scan_files`는 symlink를 따라가지 않고, 읽기 실패 시 오류를 반환합니다. 빈 패턴의 기본값은 모든 파일입니다. Movie의 영상 확장자 기본값은 앱에서 전달합니다. `list_dir`는 단일 폴더 조회이며 디렉터리 symlink를 허용합니다.
- JSON `load_json`은 파일 없음만 `None`으로 반환합니다. 손상·권한 오류는 오류입니다. `update_json`은 읽기→수정→쓰기를 프로세스 내에서 직렬화합니다. 서로 다른 프로세스 사이 lock, 여러 파일의 트랜잭션, 스키마 자동 마이그레이션은 제공하지 않습니다. update callback 안에서 저장 함수를 재호출하지 않습니다.
- JSON 저장은 최종 symlink 대상을 갱신하고 기존 파일 권한을 보존합니다. 읽기 전용 파일과 순환 링크는 오류로 처리합니다. 파일 교체 방식이므로 상위 디렉터리의 쓰기 권한이 필요하며 inode·hard link 관계·소유권·확장 속성 보존은 제공하지 않습니다.
- 이미지 입력은 MIME과 바이트 변환을 처리합니다. 실제 이미지 decode 검증과 저장 위치·이름은 앱이 담당하고, Rust 이미지 교체는 `explorer-image-store`를 사용합니다. preview는 교체·unmount 시 `dispose()` 해야 합니다.
- 평점의 `null` 의미, 폴더 이름 변경, Git 검사, URL 중복 판별, 그룹 삭제 정책은 공통화하지 않았습니다.
- 개발 CLI는 소비 앱 cwd에서 실행합니다. 모노레포는 `TAURI_PACKAGE=desktop explorer-tauri-dev`, 단일 앱은 `explorer-tauri-dev`입니다.

복사 원본, 파생 변경과 통합 순서는 [출처](docs/provenance.md), [아키텍처](docs/architecture.md)에 기록합니다. 모든 패키지는 private이며 별도 라이선스를 임의로 부여하지 않았습니다.

## 조건부 JSON 갱신

`update_json_if_changed`는 잠금 안에서 읽기와 갱신 여부를 결정합니다. `UpdateAction::Unchanged(result)`는 쓰기를 생략하고, `Write { value, result }`는 저장 후 결과를 반환합니다. 기존 `update_json`은 항상 저장하는 호환 API입니다. 정상 설정을 조회할 때 Unchanged를 반환하면 읽기 전용 파일도 조회할 수 있습니다.

`document_version(&value, current, legacy_versions)`는 객체의 버전이 없거나 명시한 legacy 버전일 때만 Legacy, 현재 버전일 때 Current를 반환합니다. null·문자열·미지원 버전은 InvalidData 오류입니다. legacy schema 자체의 검증과 변환은 앱의 책임입니다.

`write_bytes_atomic(path, bytes)`는 JSON과 이미지에 사용하는 잠금 없는 파일 교체 primitive입니다. 호출자가 갱신·정리 구간을 직렬화해야 합니다. JSON callback에서 다른 JSON 저장·갱신 함수를 호출하면 안 됩니다. 여러 파일 migration은 재시도 가능한 앱 절차로 구성해야 합니다.

## 이미지와 스캔 작업 API

`explorer-image-store`의 `save_image`는 저장 경로와 cleanup warnings를 반환합니다. 경고가 있으면 기존 variant가 남아 재조회 결과가 다를 수 있으므로 교체 미완료를 표시해야 합니다. `find_image`는 확장자 우선순위와 파일명으로 결정적으로 선택합니다. 대소문자 일치 정책은 `StemMatch`로 전달합니다. [상세 API](crates/image-store/README.md)를 참고하세요.

`explorer-scan-job`의 `ScanRegistry::register(id)`는 `JobGuard`를 반환하며 중복 ID는 거부합니다. guard의 `token()`을 blocking worker에 넘겨 `is_cancelled()`로 확인합니다. `cancel(id)`는 활성 작업의 취소를 요청하고, guard의 `finish(result)`는 `TerminalState`를 판정하며 등록을 해제합니다. guard가 drop되어도 등록을 해제합니다. 앱은 등록 후 ack, terminal 이벤트 전달과 결과 DTO를 책임집니다.

## 공통 설정

[settings-core](packages/settings-core/README.md)는 화면 선호 설정을, [settings-store](crates/settings-store/README.md)는 기존 Rust JSON 설정을 담당합니다. [settings-ui](packages/settings-ui/README.md)는 두 방식에 공통으로 사용하는 UI입니다. 설정 항목과 기본값·schema·저장 key/경로는 앱이 정하며 같은 설정을 양쪽에 복제하지 않습니다.

## 공통 UI Storybook

`pnpm storybook`으로 설정·파일 탐색·평점·Base UI·Radix UI의 33개 스토리를 확인합니다. `pnpm build-storybook`은 정적 사이트를 생성하며 전체 `pnpm check`에도 포함됩니다. 실행 방법과 검증 범위는 [Storybook 안내](docs/storybook.md)를 참조하세요.

## 소비 앱 아키텍처 검사

다섯 앱을 sibling checkout으로 둔 환경에서 `pnpm check:apps-architecture`로 FSD import 경계와 Rust domain/application의 명시적 외부 구현 경로를 검사합니다. 독립 공통 패키지 검사인 `pnpm check`와 별도입니다. [아키텍처 수정 기록](docs/architecture-fix-report.md)에 검사 범위와 한계를 기록합니다.

## 기능 리뷰 후 수정

이미지의 점으로 끝나는 stem 호환, JSON 변경과 조합할 이미지 임시 보관·복원 API, POSIX 루트와 끝 구분자 경로 변환을 보완했습니다. [후속 수정·검증 기록](docs/remaining-review-fixes-report.md)에서 소비 앱 적용 상태와 복구 한계를 확인할 수 있습니다.
