# Radix UI 호환 버튼

`@yoophi/ui-radix/components/compatible-button`은 Movie/Repo의 기존 로컬 버튼 class, variant, size, `asChild` 계약을 그대로 옮긴 별도 공개 subpath입니다. 기존 `components/button`의 시각 디자인은 변경하지 않습니다.

두 앱의 로컬 `button.tsx`는 다음처럼 얇게 재수출할 수 있습니다.

```ts
export { CompatibleButton as Button, compatibleButtonVariants as buttonVariants } from "@yoophi/ui-radix/components/compatible-button";
```

소비 앱은 패키지 link, Tailwind `@source`, React dedupe를 기존 공통 UI와 같은 방식으로 설정합니다. Storybook의 `Radix UI/호환 버튼`과 `tests/compatible-button.test.tsx`에서 형태·상태를 확인합니다.

## Movie·Repo 호환 테마

`@yoophi/ui-radix/compatible-theme.css`는 두 앱의 기존 밝은 테마·Geist 폰트·radius를 보존합니다. `globals.css`의 기본 Radix 테마와 서로 바꾸어 사용하지 않습니다. 각 앱은 자신의 컴포넌트와 소비 공통 UI의 Tailwind `@source`를 지정합니다. 로컬 CSS export를 유지하는 경우 그 파일의 기존 상대 `@source`도 남깁니다. Storybook `Radix UI/호환 테마`는 다른 테마를 덮어쓰지 않도록 별도 iframe 안에서 실제 CSS export를 소비합니다.
