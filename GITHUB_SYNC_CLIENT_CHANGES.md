# 클라이언트 변경사항: GitHub 마크다운 동기화 연동 (v2)

## 개요

`POST /ontology` 응답에 GitHub sync 결과가 포함된다.
DB 저장 성공 후, 서버가 자동으로 DB에서 전체 온톨로지를 읽어
Obsidian 호환 마크다운으로 변환하여 GitHub 레포(`hyunwoo-ai/knowledge-ontology-engine`)에 push한다.

**별도 엔드포인트 호출 불필요** — `POST /ontology` 하나로 DB 저장 + GitHub sync가 모두 처리된다.

---

## 수정 파일

`pages/admin/index.tsx`

---

## 변경 1: `saveOntology` — 응답에서 sync 결과 읽기

**변경 전:**
```typescript
let status: boolean = false;

try {
  // ...fetch POST /ontology...
  await res.json().then(j => {
    status = j["status"];
  });
} finally {
  if (status) setModalData({ message: "Successful", status: true });
  else setModalData({ message: "Failed", status: false });
  setModalTrigger(prev => prev + 1);

  initialOntologyRef.current = newOntology;
  isUsingServerRef.current = false;
}
```

**변경 후:**
```typescript
let status: boolean = false;
let syncCommit: string | null = null;

try {
  // ...fetch POST /ontology...
  await res.json().then(j => {
    status = j["status"];
    if (j["sync"]?.status) syncCommit = j["sync"].commit;
  });
} catch (error) {
  console.error(error);
} finally {
  if (status) {
    const msg = syncCommit
      ? `Saved & Synced (${syncCommit.slice(0, 7)})`
      : "Saved";
    setModalData({ message: msg, status: true });
  } else {
    setModalData({ message: "Failed", status: false });
  }
  setModalTrigger(prev => prev + 1);

  initialOntologyRef.current = newOntology;
  isUsingServerRef.current = false;
}
```

---

## 변경 2: `syncMarkdownsToGithub` 함수 삭제

이전에 추가했던 `syncMarkdownsToGithub` 함수는 더 이상 필요 없다. 삭제한다.

---

## `POST /ontology` 응답 스펙 (변경됨)

```json
{
  "nodes": { "inserted": [], "deleted": [], "updated": [] },
  "relations": { "inserted": [], "deleted": [] },
  "status": true,
  "sync": {
    "status": true,
    "commit": "full_sha_string"
  }
}
```

`sync` 필드:
- `sync.status: true` + `sync.commit` — GitHub push 성공
- `sync.status: false` + `sync.error` — GitHub push 실패 (DB 저장은 성공)
- GitHub 토큰 미설정 시에도 `sync.status: false`

---

## 동작 흐름

```
Ctrl+S
  -> saveOntology()
    -> POST /ontology (DB 저장 + GitHub sync)
    -> 응답의 status로 DB 저장 성공 여부 확인
    -> 응답의 sync.status로 GitHub sync 성공 여부 확인
    -> 성공 시 모달: "Saved & Synced (abc1234)"
    -> sync 실패 시 모달: "Saved" (DB는 저장됨)
    -> DB 저장 실패 시 모달: "Failed"
```

GitHub sync는 diff 기반으로 동작한다:
- 서버가 DB에서 전체 온톨로지를 읽어 마크다운 생성
- 각 파일의 git blob SHA를 로컬에서 계산하여 GitHub 기존 파일과 비교
- 변경된 파일만 blob 생성 + push
- 삭제된 파일은 `sha: null`로 마킹
- 변경사항 없으면 커밋하지 않음
