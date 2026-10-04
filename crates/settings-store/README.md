# explorer-settings-store

Tauri에 의존하지 않는 경로 소유형 JSON 설정 저장소입니다. `JsonSettingsStore<T>`는 `explorer-json-store::update_json_if_changed`를 사용하므로 같은 프로세스의 JSON 저장/갱신 작업과 동일한 잠금 안에서 읽기, 판정, 쓰기를 수행합니다.

앱은 callback에서 JSON을 디코드하고 스키마와 버전을 검사하며 기본값, 정규화, 마이그레이션을 결정합니다. 저장소는 앱의 스키마를 정의하지 않습니다.

```rust
use explorer_settings_store::{JsonSettingsStore, UpdateAction};
use serde_json::Value;
use std::io;

let store = JsonSettingsStore::<Value>::new("settings.json");
let settings = store.load(|document| {
    let settings = document.unwrap_or_else(|| serde_json::json!({ "theme": "system" }));
    Ok::<_, io::Error>(UpdateAction::Unchanged(settings))
})?;

let (settings, changed) = store.update(|document| {
    let mut settings = document.unwrap_or_else(|| serde_json::json!({ "theme": "system" }));
    settings["theme"] = "dark".into();
    Ok::<_, io::Error>(UpdateAction::Write {
        value: settings.clone(),
        result: (settings, true),
    })
})?;
# Ok::<(), io::Error>(())
```

`Unchanged`는 파일을 다시 쓰지 않으며, 파일이 없을 때에도 생성하지 않습니다. `Write`는 `explorer-json-store`의 원자적 저장을 사용합니다. 읽기, callback 또는 쓰기가 실패하면 기존 JSON 바이트를 보존합니다. 미래 버전과 잘못된 문서는 앱 callback에서 오류로 반환해야 합니다. 버전 판정에는 `explorer_json_store::document_version`을 사용할 수 있습니다.

앱에서 `load`와 `update`가 **같은 decode/validate/migrate 함수**를 호출하도록 구성하세요. `update`도 이전 버전을 먼저 정규화한 다음 typed 설정을 변경합니다. 최종 JSON 값이 입력과 같으면 `UpdateAction::Unchanged((settings, result))`를 반환하고, 값이 달라졌을 때만 `Write`를 반환합니다. 이 crate는 앱 스키마를 모르므로 값 동등성 판정과 migration 정책도 앱 callback이 소유합니다.

**잠금 주의:** callback 안에서 다른 JSON save/update를 호출하지 마세요. 잠금은 재진입할 수 없습니다. 서로 다른 프로세스의 작업은 직렬화하지 않습니다. 다른 파일이나 이미지에 대한 작업까지 원자적으로 묶어 주지는 않습니다.
