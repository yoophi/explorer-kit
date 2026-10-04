# 개발 지침

- 기존 앱의 구현을 출처가 추적되는 복사본으로 유지한다. 원본 저장소는 명시적으로 요청된 통합 작업에서만 수정한다.
- 도메인 규칙은 소비 앱에 둔다. 공통 React 패키지는 Tauri, Router, React Query, 앱별 store에 직접 의존하지 않는다.
- Base UI와 Radix UI의 public API를 별도 패키지로 유지한다.
- TypeScript는 source package이며 소비 앱의 bundler가 컴파일한다. React는 peer dependency로 유지한다.
- Rust crate는 Tauri에 의존하지 않는다. blocking I/O 실행 방식, 앱 설정 경로, 스키마·마이그레이션 정책은 소비 앱이 결정한다.
- 공통 동작 변경 시 관련 테스트와 provenance 문서를 갱신한다. 전체 검증은 `pnpm check`이다.
- 문서는 한국어, 파일명은 영어 kebab-case, 다이어그램은 Mermaid를 사용한다.
