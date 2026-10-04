# 탐색 공통 값과 이름 비교

파일 항목 타입과 크기·수정일 표시 외에 두 이름 비교 함수를 제공한다.

- `compareLowercasedCodePoints(left, right)`: 문자열을 소문자화한 뒤 Unicode 코드포인트 순서로 비교한다. locale collation이나 Unicode 전체 case folding은 하지 않는다. 소문자화한 값이 같으면 0이다.
- `compareCodePoints(left, right)`: 문자열 또는 **각 요소가 코드포인트 하나인** iterable을 비교한다. Tree처럼 정렬 전 항목별 소문자화·코드포인트 분리를 한 번만 수행하는 호출부가 사용한다.

둘 다 음수/0/양수 비교 계약을 제공하며 항목 컬렉션을 변경하지 않는다. 디렉터리 우선, 정렬 안정성, 입력 배열 복사와 스캔 배치 정책은 소비 앱의 책임이다. [출처와 소비처](../../docs/residual-sort-notes.md)를 참고한다.
