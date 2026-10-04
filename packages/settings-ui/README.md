# settings-ui

설정 UI 구성 요소이며 Tauri·Router·앱 store·Base UI/Radix UI에 의존하지 않습니다. 앱의 기존 dialog나 페이지 안에 조합합니다. Tailwind source에 이 패키지 src 경로를 포함해야 합니다.

- `SettingsSection`: title, description?, actions?, children, className?
- `SettingsField`: label, description?, children: `(props: {id, aria-describedby?}) => ReactNode`. props를 실제 input/select에 전달합니다.
- `SettingsToggle`: label, description?, checked, disabled?, onChange(boolean).
- `SettingsStatus`: error?, saving?. 오류 role=alert, 진행 role=status.

기존 컴포넌트의 label 연결과 접근성을 유지하며 실제 값 검증·저장 완료 판단·도메인별 삭제 확인은 앱이 담당합니다. 저장 오류는 SettingsStatus에 표시하고 성공한 것으로 UI를 확정하지 않습니다.
