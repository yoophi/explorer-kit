# Explorer Kit

다섯 데스크톱 탐색기에서 복사한 공통 구현을 제공하는 로컬 Git 저장소입니다. TypeScript source package 9개, 개발 도구 1개, Rust crate 2개로 구성됩니다. 기존 앱의 도메인 모델과 데이터 저장 위치는 소비 앱이 관리합니다.

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
| packages/dev-tools | @yoophi/explorer-dev-tools | 사용 가능한 포트로 Vite와 Tauri 동시 실행 |
| crates/fs-core | explorer-fs-core | 단일 디렉터리 조회, glob 기반 재귀 파일 검색 |
| crates/json-store | explorer-json-store | JSON 읽기, 임시 파일 교체 저장, 프로세스 내 갱신 직렬화 |

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
- 이미지 입력은 MIME과 바이트 변환을 처리합니다. 실제 이미지 decode 검증, 저장 위치·이름, 파일 교체 정책은 앱이 담당합니다. preview는 교체·unmount 시 `dispose()` 해야 합니다.
- 평점의 `null` 의미, 폴더 이름 변경, Git 검사, URL 중복 판별, 그룹 삭제 정책은 공통화하지 않았습니다.
- 개발 CLI는 소비 앱 cwd에서 실행합니다. 모노레포는 `TAURI_PACKAGE=desktop explorer-tauri-dev`, 단일 앱은 `explorer-tauri-dev`입니다.

복사 원본, 파생 변경과 통합 순서는 [출처](docs/provenance.md), [아키텍처](docs/architecture.md)에 기록합니다. 모든 패키지는 private이며 별도 라이선스를 임의로 부여하지 않았습니다.
