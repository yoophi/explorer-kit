# 파일시스템 탐색

Tauri와 실행 런타임에 의존하지 않는 blocking API입니다. 소비 앱은 blocking worker에서 실행하고 경로·필터·이벤트 DTO·정렬·화면 상태를 결정합니다.

| 함수 | 탐색 범위 | 결과 |
| --- | --- | --- |
| `list_dir` | 한 디렉터리 | 디렉터리 우선·이름순 배열 |
| `list_dir_stream` | 한 디렉터리 | 발견한 항목을 callback으로 즉시 전달 |
| `scan_files` | 재귀 파일 검색 | glob에 일치하는 파일의 이름순 배열 |
| `scan_files_stream` | 재귀 파일 검색 | 일치한 파일을 callback으로 즉시 전달 |

스트리밍 함수는 `cancelled: &dyn Fn() -> bool`과 `on_item: &mut dyn FnMut(Item) -> Result<(), String>`을 받습니다. 전체 목록을 먼저 수집하지 않으며 filesystem 열거 순서로 전달합니다. 기존 배열 함수도 같은 탐색을 사용하고 마지막에 기존 방식으로 정렬합니다.

취소는 진입·항목 순회·전달 전·완료 경계에서 확인합니다. 진행 중인 OS I/O 자체를 중단하지는 않습니다. 취소와 callback 오류는 탐색을 중단하고 오류를 반환합니다. 소비 앱은 자신의 취소 토큰으로 cancelled/failed를 구별하고 completed/cancelled/failed 종료 이벤트를 전달해야 합니다. 이미 전달한 항목은 성공 종료 전까지 임시 결과입니다.

`list_dir_stream`은 기존처럼 숨김 설정을 적용하고 읽을 수 없는 개별 항목을 건너뜁니다. 디렉터리 symlink를 표시하지만 재귀 탐색하지 않습니다. `scan_files_stream`은 기존처럼 symlink를 건너뛰고 대소문자를 구분하지 않는 glob을 적용하며 읽기 오류를 반환합니다. 앱의 기본 영화 확장자 정책은 공통 모듈에 포함하지 않습니다.
