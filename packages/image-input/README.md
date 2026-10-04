# image-input

이미지 MIME 검사·bytes 변환과 붙여넣기 수명을 제공합니다. React 앱은 `@yoophi/image-input/react`의 `useImagePaste({ active, targetKey, save })`를 사용합니다. 반환된 `handlePaste(event)`는 이미지가 있으면 기본 paste를 막고 `true`를 반환합니다. 텍스트 paste와 이벤트 listener 설치는 앱이 맡습니다.

`save(targetKey, payload)`는 성공 여부를 boolean으로 반환합니다. 같은 대상 안에서 붙여넣기 순서대로 payload 읽기와 저장을 직렬화해 같은 대상의 최종 디스크 이미지가 마지막 유효 요청이 되도록 합니다. 대상 변경·닫기·새 요청으로 오래된 읽기 결과는 저장 전에 버립니다. **이미 시작한 저장 호출은 취소하지 않습니다.** 현재 대상의 최신 요청만 pending·error·preview URL을 갱신하며 preview 교체·대상 변경·unmount 시 이전 object URL을 해제합니다. 앱은 저장 실패 또는 부분 성공을 boolean으로 해석하는 adapter를 제공합니다.

서로 다른 대상의 작업은 별도 queue를 사용하므로 이전 대상의 느린 저장이 새 대상 저장을 막지 않습니다. 같은 대상을 다시 열면 이전에 시작한 저장이 끝난 뒤 새 저장을 진행합니다.
