# settings-core

브라우저 설정을 검증하고 저장하는 공통 모듈입니다. 앱별 key·기본값·검증 함수는 앱에 둡니다. localStorage 접근은 주입할 수 있고, React 사용은 별도 `/react` export입니다.

```tsx
const preferences = createSettingsStore({
  key: "app.preferences",
  defaults: { showHidden: false },
  parse(value: unknown) {
    if (!value || typeof value !== "object" || !("showHidden" in value)
      || typeof value.showHidden !== "boolean") throw new Error("잘못된 설정입니다.");
    return { showHidden: value.showHidden };
  },
});
// 컴포넌트에서:
const { value, error } = useSettings(preferences);
preferences.update(current => ({ ...current, showHidden: true }));
```

기본 저장 형식은 `{version: 1, value: ...}`입니다. 기존 unversioned JSON key는 `format: "raw"`로 그대로 유지할 수 있습니다. 조회와 값이 같은 update는 쓰지 않습니다. update는 저장된 최신 값을 다시 읽으며 손상된 값·미지원 버전은 보존하고 false를 반환합니다. 저장 실패 시 마지막 확인된 UI 값과 error가 유지됩니다. `reset()`은 명시적 사용자 초기화용이며 손상된 값도 기본값으로 교체합니다. parse/update 함수는 입력을 변경하지 않는 순수 함수로 작성합니다.

한 앱/key에 하나의 module-scope store를 만들고 `useSettings(store)`로 구독합니다. storage 이벤트로 다른 창 변경을 반영합니다. 다른 창 사이 원자적 read-modify-write는 제공하지 않습니다. DOM이 없는 테스트는 storage를 주입하세요.

도메인 JSON 설정은 Rust `explorer-settings-store`를 사용합니다. 이 모듈로 별도 복제하여 두 저장 원본을 만들지 않습니다. Tauri command와 기존 schema는 앱 adapter 책임입니다.

## 편집 초안

`createSettingsDraft`·`editSettingsDraft`·`syncSettingsDraft`는 확정 값과 문자열 초안을 분리합니다. 외부 저장값 변경은 깨끗한 초안에만 반영하고 편집 중인 문자열은 보존합니다. `planSettingsDraft(draft, parse)`는 파싱 실패 시 `value: null, needsWrite: false`를 반환합니다. 저장 성공 후에만 `confirmSettingsDraft`를 호출하세요. 실패하면 초안과 dirty 상태를 유지합니다. glob 문자열, 숫자 범위·빈 문자열 처리와 저장 시점은 앱에서 결정합니다.
