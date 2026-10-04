# 잔여 이름 정렬 공통화

## 출처와 계약

- Movie의 `apps/desktop/src/entities/movie/scan-stream.ts`는 영화 파일 이름을 소문자화한 뒤 Unicode 코드포인트 순으로 정렬했다.
- Tree의 `apps/desktop/src/entities/file-system/model/stream-directory.ts`는 동일한 이름 비교를 사용하면서 디렉터리를 파일보다 먼저 배치했다.
- 두 앱의 기존 비교 동작을 `@yoophi/explorer-core`의 `compareLowercasedCodePoints(left, right)`와 `compareCodePoints(left, right)`로 옮겼다. 전자는 소문자화와 비교를 함께 하고, 후자는 문자열 또는 미리 분리한 코드포인트 배열을 비교한다. 배열의 각 요소는 코드포인트 하나여야 한다. locale 정렬이나 JavaScript UTF-16 문자열 비교로 바꾸지 않는다. 소문자화 후 같은 이름은 동률로 반환하여 호출부의 안정 정렬을 유지한다.

## 적용 결과

- Movie의 `sortByName`은 이름을 비교할 때 소문자화한다. Tree의 `sortDirectoryEntries`는 기존처럼 항목별 소문자화와 코드포인트 분리를 한 번 수행한 뒤 공통 비교 함수를 소비한다.
- Tree의 디렉터리 우선 규칙, 각 앱의 scan 배치 크기·시간·취소·완료 정책은 앱에 남긴다.
- 공통 테스트는 U+E000/U+10000 순서, 대소문자, 접두사, 동률을 확인한다. 두 앱의 기존 테스트·타입 검사·빌드 결과는 작업 완료 보고에 기록한다.

독립 리뷰에서 core의 기존 확장자 없는 export가 네이티브 Node 직접 import를 막는 점을 확인했다. 새 정렬 API도 같은 제약을 물려받으므로 `types.ts`/`format.ts`/`sort.ts` 경로를 명시하고, loader 없이 별도 Node 프로세스가 패키지명으로 import하는 회귀 테스트를 추가했다. 전처리를 항목당 한 번 수행하는 Tree 호출 구조는 유지한다. 시간 비교는 엔진 warmup·입력에 따라 달랐으므로 정량적 성능 향상이나 동일 실행 시간을 주장하지 않는다.
