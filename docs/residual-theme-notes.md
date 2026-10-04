# 잔여 UI 테마 중복 정리

## 출처와 범위

게시된 기준은 explorer-kit `7089174`, Movie `b71c9a2`, Repo `3d0338f`, Folder `4bcb9a1`, Bookmark `0c134e2`이다. Movie·Repo의 `packages/ui/src/styles/globals.css`는 58줄이 바이트 단위로 같았다. Folder·Bookmark의 `src/index.css`는 앱별 `@source` 지시문을 제외하면 `@yoophi/ui-base/src/styles/globals.css`와 같은 내용이었다. Movie·Repo의 `packages/ui/src/lib/utils.ts`도 같은 `cn(clsx → twMerge)` 구현이었다.

공통 `ui-radix`에 `compatible-theme.css`를 별도 export로 추가했다. 기존 `globals.css`는 토큰과 radius가 다르므로 그대로 사용하지 않았다. Movie·Repo의 기존 UI 패키지 `globals.css` 경로는 공통 compatible theme를 가져오는 얇은 CSS wrapper로 유지했다. 두 앱의 `cn` 경로도 공통 `@yoophi/ui-radix/lib/utils` 재수출로 유지했다. Folder·Bookmark는 기존 `@yoophi/ui-base/globals.css` export를 사용한다. 다이얼로그와 앱 도메인 코드는 변경하지 않았다.

## Tailwind와 폰트

compatible theme의 색상·radius·base 선언은 Movie·Repo 원본과 같다. 원본 CSS의 상대 경로 `@source "../components"`는 각 로컬 UI 패키지의 wrapper에 유지했다. 이로써 해당 CSS export를 독립적으로 소비하는 경우에도 로컬 컴포넌트가 스캔된다. 양쪽 앱의 `apps/desktop/src/app/styles/index.css`도 각자의 `packages/ui/src`, settings-ui 및 필요한 공통 UI 소스를 명시한다. `@source`를 공통 테마 파일로 옮겨 다른 위치를 가리키게 하지 않았다.

`ui-base/globals.css`는 자체 컴포넌트에 대한 `@source "../components"`를 포함한다. Folder 앱에는 settings-ui, Bookmark 앱에는 rating·settings-ui의 앱 상대 경로 `@source`를 남겼다. 앱의 `src` 파일은 Vite/Tailwind 자동 탐지 대상이다. 네 앱 빌드 모두 Geist 폰트 파일 다섯 개를 같은 해시 이름으로 생성했다.

## 검증

수정 전 네 앱에서 `pnpm build`를 실행하고 CSS를 임시 fixture `/var/folders/3z/mcf5cp4n0t567wk9p_kjrpp80000gn/T/residual-theme-baseline-ve14tnrj`에 보관했다. 공통 export를 추가한 뒤 explorer-kit `pnpm check`(타입검사, Node 테스트, 빌드, Rust 테스트, Storybook 빌드)를 통과시켰고, 그 후 네 앱의 CSS 연결과 `cn` 재수출을 적용했다. 네 앱 `pnpm build`가 모두 통과했다.

| 앱 | 생성 CSS 크기 | 수정 전·후 SHA-256 | 결과 |
| --- | ---: | --- | --- |
| Movie | 19,827 bytes | `1de45827729545a6a661a738f0512356a566a5c3b3c8a8a5c7c7d2fee6df8fec` | 바이트 동일 |
| Repo | 46,987 bytes | `1843292d32a74d61ea8b0ca9c88fe246bf967d101b7f1c5ae1bfde6e452678e6` | 바이트 동일 |
| Folder | 50,290 bytes | `b5b724aa5c90988ac850488d404f0ac455c0333bb8eccdef6047d3eeefc716f1` | 바이트 동일 |
| Bookmark | 64,591 bytes | `5f0199b062cb77643e31bfe45efec9899576df26e52ba9701777fe6b3ff0795f` | 바이트 동일 |

Movie·Repo는 로컬 `@source` 복원 후에도 다시 빌드해 위 CSS 해시와 바이트 동일함을 확인했다. Folder·Bookmark의 비교는 테마 연결 직후의 산출물 기준이다. Bookmark dialog에는 별도 담당자의 후속 변경이 진행 중이므로, 이후 CSS 차이는 그 변경과 구분해 평가해야 한다. CSS 바이트 비교에는 생성된 토큰, 유틸리티와 폰트 URL이 포함된다. JavaScript 번들은 `cn` 재수출에 따른 모듈 그래프 변화와 다른 작업의 동시 수정을 포함할 수 있어 CSS 동일성의 근거로 사용하지 않았다. 브라우저 화면을 별도로 실행하지 않았다.

최종 독립 리뷰(repo-shared)와 조정자가 Bookmark 폼 변경까지 포함한 네 앱을 다시 확인했으며 위 CSS 해시와 모두 동일했다. M/R 및 common Storybook 빌드가 통과했다. 공통 Storybook의 별도 iframe 예제는 compatible-theme export를 실제 import하고 기본 Base UI 문서의 토큰과 격리한다. 최종 브라우저 검사에서 outline border oklch(0.89 0 0), radius8px, Geist 폰트 로딩 및 페이지 오류0을 확인했다.
