# Bookmark 잔여 대화상자 공통화

## 변경 출처와 범위

- 요청: Bookmark의 `rename-group-key-dialog.tsx`, `markdown-import-dialog.tsx`를 `@yoophi/ui-base` `AsyncFormDialog`로 전환.
- root 후속 지시: Markdown 제출 아이콘·`gap-2`, 기존 두 form의 block 배치를 보존. 공통 `AsyncFormDialog`에 선택적 합성 prop을 추가하고 공통 테스트·타입 검사를 먼저 수행.
- 공통 변경: `explorer-kit/packages/ui-base/src/components/async-form-dialog.tsx`의 `submitLabel`·`pendingLabel`을 `ReactNode`로 확장하고, `formClassName`·`submitClassName` 선택 prop 추가. 기본 라벨과 `grid gap-4`는 유지. `packages/ui-base/README.md`와 Storybook 실제 옵션 사례 갱신. 공통 core/CSS나 다른 앱은 수정하지 않음.
- 앱 변경: 두 dialog만 공통 컴포넌트로 전환. Rename은 기존 문구·영향 건수·새 키 입력·정규화 중복 검사와 `formClassName="block"` 유지. Markdown은 기존 regex·중복 URL 제거·그룹/경로 preview·추가 가능/중복 건수·입력 textarea를 유지하며 아이콘과 버튼 `gap-2`, block form을 공통 prop으로 전달.

## 동작 계약

- `onRename`/`onImport`의 성공 여부를 boolean으로 반환하고 `closeOnSuccess`를 사용. 실패 시 입력을 지우거나 dialog를 닫지 않음. Markdown 성공 시에만 입력을 지움.
- 제출 불가 조건은 기존과 같고, 공통 컴포넌트가 pending 중 닫기·Escape와 중복 제출을 차단함. textarea의 Enter 입력은 기존 textarea 그대로 유지.
- Markdown의 동적 제출 건수와 ClipboardPaste 아이콘은 `submitLabel`/`pendingLabel` ReactNode로 보존.

## 검증

- 공통 기존 composite 계약 테스트 4개 통과. 새 prop을 단순 확인하는 테스트는 Portal이 SSR에서 내부를 렌더하지 않아 실제 동작 검증이 불가능하므로 root 리뷰 지시에 따라 제거.
- `pnpm --filter @yoophi/ui-base typecheck`, `pnpm --filter @yoophi/explorer-kit-storybook typecheck`, Storybook build 통과. Storybook에 합성 제출 라벨·class 옵션 실제 사례 추가.
- Bookmark `pnpm test`: 11개 통과. `pnpm exec tsc --noEmit`, `pnpm build`: 통과.
- 실제 포털 상호작용(Enter, Escape, 중복 제출, 실패 입력 유지, 성공 닫기, 아이콘/간격)은 root의 `/tmp/explorer-residual-browser` 모의 callback browser harness 검증 대상. 이 작업에서는 별도 브라우저를 실행하지 않음.

## 조정자 브라우저 검증

실제 두 앱 컴포넌트를 번들한 `/tmp/explorer-residual-browser` 메모리 callback fixture에서 확인했다. Rename의 Enter 제출·저장 중 Escape/중복 Enter 차단·false/예외 실패 후 입력 유지·재시도 성공 닫힘이 통과했다. Markdown은 같은 URL 중복과 기존 등록 URL을 구분하여 `2개 추가 (중복 1개 제외)`를 표시하고 실제 callback에 두 URL만 전달했다. pending 중 닫기/제출 차단·아이콘 유지, null/예외 실패 후 내용 유지, 성공 후 닫힘·재열기 빈 내용·빈 제출 disabled를 확인했다. 두 form의 computed display는 block이다. 밝은/어두운 테마 화면을 확인하고 페이지 오류는 0이었다. 서버와 브라우저 세션은 검사 후 종료한다. 실제 Tauri 저장이나 사용자 데이터 작업은 이 검사의 범위가 아니다.
