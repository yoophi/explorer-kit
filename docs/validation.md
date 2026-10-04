# 공통 저장소 검증 결과

초기 구성에서 다음 검사를 실행했습니다.

| 검사 | 결과 |
| --- | --- |
| pnpm typecheck | 9개 TypeScript 패키지와 소비 예제 통과 |
| pnpm test | Node 테스트 16개 통과 |
| pnpm build | 모든 public 컴포넌트 import를 포함한 브라우저 JS·Tailwind CSS bundle 생성 |
| cargo test --workspace | JSON 저장 3개, 파일 조회·스캔 3개 통과 |
| node --check packages/dev-tools/bin/tauri-dev.mjs | CLI 구문 검사 통과 |
| 원본 SHA256 비교 | provenance.json의 44건 일치 |

검증은 패키지 단위와 소비 예제 빌드 범위입니다. 원본 앱의 통합, 실제 브라우저·Tauri 렌더링, 개발 CLI의 실제 앱 실행은 별도 검증 대상입니다. Herdr agent tab 생성과 원본 앱 적용은 아직 수행하지 않았습니다.

코드 검토에서 스캔 terminal 이벤트 뒤의 늦은 item이 callback으로 전달될 수 있는 경계를 보완하고 회귀 테스트를 추가했습니다. React 복사본은 hooks 호출 위치, callback 의존성, radio label과 focus 상태, 앱 상태와의 분리 여부를 검토했습니다. UI 계열 차이를 보존했고 이미지 preview의 해제 책임을 API로 노출했습니다. 이 검토는 독립 에이전트 리뷰가 아닙니다.
