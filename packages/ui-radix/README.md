# Radix UI 호환 버튼

`@yoophi/ui-radix/components/compatible-button`은 Movie/Repo의 기존 로컬 버튼 class, variant, size, `asChild` 계약을 그대로 옮긴 별도 공개 subpath입니다. 기존 `components/button`의 시각 디자인은 변경하지 않습니다.

두 앱의 로컬 `button.tsx`는 다음처럼 얇게 재수출할 수 있습니다.

```ts
export { CompatibleButton as Button, compatibleButtonVariants as buttonVariants } from "@yoophi/ui-radix/components/compatible-button";
```

소비 앱은 패키지 link, Tailwind `@source`, React dedupe를 기존 공통 UI와 같은 방식으로 설정합니다. Storybook의 `Radix UI/호환 버튼`과 `tests/compatible-button.test.tsx`에서 형태·상태를 확인합니다.
