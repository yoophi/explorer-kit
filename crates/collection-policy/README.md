# 컬렉션·평점 순수 규칙

Tauri·파일·schema에 의존하지 않습니다. 앱의 JSON update callback 내부에서 호출합니다.

`upsert_by_key(items, item, key_of)`는 기존 위치에서 교체하거나 끝에 추가하고 `UpsertResult`를 반환합니다. `remove_by_key(items, active, key, minimum_groups, key_of)`는 없는 키와 최소 그룹 수를 변경 전에 검사하고 같은 키의 항목을 모두 제거합니다. 활성 그룹을 삭제하면 첫 남은 그룹으로 이동합니다. `select_active_by_key`는 존재하는 키만 선택합니다. 키 형식, 기본 그룹 생성, migration, 북마크·이미지 삭제 순서는 앱이 결정합니다.

`RatingScale::new(min, max, step)`은 유한한 범위와 **정규화된 2의 거듭제곱 간격**만 허용합니다(예: 1, 0.5, 0.25). min과 max도 해당 step의 정수배여야 합니다. 0.1 간격이나 `min=0.1, step=0.25`처럼 격자에서 어긋난 범위는 생성 시 거부합니다. 필드는 비공개여서 검증을 우회해 생성할 수 없습니다. `contains_f32`와 `contains_f64`는 유한한 값, 포함 범위, 정확한 step 배수를 검사합니다. Folder의 `1..=5`와 Bookmark의 `0..=5`는 각각 `RatingScale::new(1.0, 5.0, 0.5)`와 `RatingScale::new(0.0, 5.0, 0.5)`로 표현합니다. null 허용 여부와 텍스트 파싱은 앱에 남습니다.
