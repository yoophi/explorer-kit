# 공통 UI Storybook

공통 React 패키지를 앱·Tauri 없이 탐색하는 독립 workspace입니다. 구현은 `examples/storybook`에 있으며 소비 앱 소스를 복제하지 않고 공통 패키지의 public export를 직접 import합니다.

## 실행

저장소 루트에서 실행합니다.

```sh
pnpm install --frozen-lockfile
pnpm storybook
```

기본 주소는 `http://localhost:6006`입니다. 포트를 바꾸려면 `pnpm storybook --port 6007`, 로컬 인터페이스에만 바인딩하려면 `pnpm storybook --host 127.0.0.1`을 사용합니다.

```sh
pnpm build-storybook
pnpm check
```

정적 산출물은 `examples/storybook/storybook-static`에 생성되며 Git에서 제외합니다. `pnpm check`는 기존 타입·Node·Rust·소비 예제 빌드에 Storybook 빌드를 추가합니다. 자동 배포는 구성하지 않습니다.

## 카탈로그

| 분류 | 예제 |
| --- | --- |
| Settings | 편집·초기화, 쓰기 실패, 미래 버전 보호, 저장 진행, 비활성 토글 |
| Explorer | 파일 목록, 로딩, 빈 목록, 오류, 폴더 트리와 목록 연동 |
| Rating | 0.5점 단위 입력, 표시 값, 비활성 입력 |
| Base UI | 버튼 변형, 입력, 카드, 스크롤, badge/label/textarea/separator, select, combobox, dialog, alert dialog, context menu |
| Radix UI | 버튼 변형, 입력, 카드, 스크롤, skeleton, empty, table, resizable panels |

총 33개 스토리와 자동 문서 페이지 5개입니다. toolbar에서 Light/Dark를 전환할 수 있고 Controls와 Accessibility addon을 제공합니다. 공통 Base 테마 토큰으로 두 UI 계열을 비교합니다. 모든 접근성 항목의 자동 통과를 보장하는 인증 구성은 아닙니다.

설정 예제는 스토리별 메모리 저장소를 사용합니다. 실제 localStorage·앱 JSON·파일시스템을 읽거나 수정하지 않습니다. fail/invalid Controls를 바꾸면 해당 예제의 저장소를 새로 생성합니다. 파일 탐색은 고정 fixture이며 Rust/Tauri와 연결하지 않습니다. image-input·scan-client 등 렌더링 없는 유틸리티는 컴포넌트 카탈로그 대상에서 제외했습니다.

## 확장

`examples/storybook/src/*.stories.tsx`에 CSF 스토리를 추가합니다. 상태가 필요한 예제는 별도 React 컴포넌트로 만들고 hooks를 그 안에서 사용합니다. workspace 의존성은 예제 package.json에 추가하며, 공통 패키지에 Storybook 의존성을 넣지 않습니다. `.storybook/main.ts`가 React/Vite·Tailwind를 연결하고 preview가 테마와 자동 문서를 구성합니다.

구성은 [Storybook React/Vite 공식 문서](https://storybook.js.org/docs/get-started/frameworks/react-vite)를 따랐고, 기존 Movie 앱과 같은 Storybook 10.4.6을 사용했습니다.

## 검증

- `pnpm check`: 타입 검사, Node25, Rust35, 소비 예제와 Storybook 정적 빌드 통과.
- 설정 Controls 변경 시 메모리 저장소를 재구성하는 후속 보완 후 Storybook 타입·정적 빌드를 다시 확인했습니다.
- Aside 브라우저: 카탈로그/자동 문서 표시, 설정 토글 true→초기화 false, 쓰기 실패 alert와 이전 값 보존, Dialog 열기·포커스·닫기, 트리 선택에 따른 /demo/Movies 목록 전환·Archive 자식 추가, combobox 검색(Mov→Movies), 평점 2.5→4 변경을 확인했습니다. Resizable separator의 렌더링도 확인했습니다.
- Node의 module.register deprecation, 의존성 use-client directive/sourcemap, Vite 큰 chunk 경고가 있으나 빌드는 완료됐습니다. 네이티브 앱·모든 스토리의 접근성 자동 검사·배포 검증은 범위에 포함하지 않았습니다.
