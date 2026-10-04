# collection-core

태그 집계·표시 크기·안정적 섞기와 선택 복구 함수를 제공합니다. `isSelectionAvailable(id, visibleIds)`는 현재 필터 결과에 선택이 남아 있는지 검사합니다. `reconcileSelection(selectedId, visibleIds, fallback?)`은 유효한 기존 선택을 유지하고, 아니면 입력 순서의 첫 항목 또는 앱의 `fallback(visibleIds)` callback이 고른 유효한 값을 반환합니다. 값 자체를 세 번째 인자로 전달하지 않습니다. 가시 항목이 없거나 fallback도 목록 밖이면 `null`입니다. Movie의 부분 결과 선택 보존, Repo의 worktree·검색·정렬 정책은 앱에서 `visibleIds`를 만드는 단계에 둡니다.
