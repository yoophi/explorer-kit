# 공통 화면 요소

UI2~UI6의 순수 표시·입력 조합을 제공합니다. `./components/*` subpath가 공개 API이며 React를 peer dependency로 사용합니다. 앱의 Tauri, Router, React Query, 저장소에 접근하지 않습니다.

- `facet-chips`: `FacetChips`와 `TagCloud`는 `{key,label,count}` 목록과 현재 선택, 클릭 callback을 받습니다. Folder의 artist/video code 및 Bookmark의 group key 집계·정규화·토글 해제 규칙은 앱에 둡니다. 기존 `collection-core` 크기 함수를 `sizeClassName`으로 전달하고 context menu가 필요하면 `renderChip`으로 감쌉니다.
- `thumbnail-field`: 앱이 변환한 `src`, 대체 텍스트, placeholder, busy, error, action slot만 표시합니다. 이미지 저장·clipboard·object URL 수명은 앱 또는 image-input에 둡니다.
- `async-form-dialog`: `onSubmit`의 Promise 동안 제출과 닫기를 막고 오류를 보여줍니다. `false` 반환은 성공 닫기를 막습니다. `closeOnSuccess` 기본값은 false이며, 앱은 저장 후 닫을 시점을 직접 정할 수 있습니다. `pending`은 앱 외부 작업에 사용합니다.
- `group-controls`: `GroupSelector`, `GroupCreateRow`, `GroupRowActions`를 따로 조합합니다. Folder는 이름과 폴더 수, Bookmark는 id와 base URL을 자체 모델로 유지합니다. `renderControl`은 기존 Select primitive 보존에 사용합니다.
- `scan-status-panel`: phase, counts, path, message, summary, 취소·재시도 동작을 전달합니다. 전체 수가 없는 스캔에 percent를 가정하지 않습니다.

Storybook의 `Composite UI` 사례와 `tests/composite-contract.test.tsx`가 공개 상태·접근성 계약을 보여줍니다.
