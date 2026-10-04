# scan-client

`consumeScan<T>`는 listener 설치 뒤 작업을 시작하고 terminal까지 기다린다. 완료 응답은 이벤트 종료 장벽으로 간주하지 않는다. 기존 Folder/Movie/Tree transport 계약을 유지한다.

`ScanLifecycle<Request extends { scanId: string }>`는 start/accepts/finish/cancel/dispose를 제공한다. `start`는 void 또는 ID ack를 허용하며 다른 ID ack는 오류다. ID gate를 닫는 `finish`가 true일 때만 앱 terminal 결과를 반영한다. `dispose`는 UI delivery를 즉시 차단하며 pending ack 이후에도 worker 취소를 전달한다.

기본 취소는 ack 뒤 전송한다(Folder). `cancelBeforeAcknowledgement: true`는 즉시 시도하고 ack 뒤 재시도한다(Repo). ack 전 transport 실패는 재시도 대상으로 유지하며 ack 뒤 실패는 onCancelError로 전달해 사용자가 다시 취소할 수 있다. DTO, listener 설치/해제, item 배치와 catalog commit은 앱 adapter의 책임이다.

`consumeScan`도 이 lifecycle을 사용한다. callback 실패 시 ID를 즉시 차단하고 아직 등록 확인이 오지 않은 작업도 ack 뒤 취소한다. OS I/O 자체 중단이나 이벤트 backpressure를 보장하지 않는다.
