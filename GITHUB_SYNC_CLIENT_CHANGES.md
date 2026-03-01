# 클라이언트 변경사항: GitHub 마크다운 동기화 연동

## 개요

백엔드(`hyunwoo-ai-backend.fly.dev`)에 `POST /sync-markdowns` 엔드포인트가 추가되었다.
온톨로지 저장(Ctrl+S) 성공 후, 현재 Tree 데이터를 Obsidian 호환 마크다운으로 변환하여
GitHub 레포(`hyunwoo-ai/knowledge-ontology-engine`)에 자동 push한다.

---

## 수정 파일

`pages/admin/index.tsx`

---

## 변경 1: `saveOntology` finally 블록 수정

**변경 전:**
```typescript
finally {
  if (status) setModalData({ message: "Successful", status: true });
  else setModalData({ message: "Failed", status: false });
  setModalTrigger(prev => prev + 1);

  initialOntologyRef.current = newOntology;
  isUsingServerRef.current = false;
}
```

**변경 후:**
```typescript
finally {
  if (status) {
    setModalData({ message: "Successful", status: true });
    setModalTrigger(prev => prev + 1);

    initialOntologyRef.current = newOntology;
    isUsingServerRef.current = false;

    // 온톨로지 저장 성공 후 GitHub 마크다운 동기화
    await syncMarkdownsToGithub();
  } else {
    setModalData({ message: "Failed", status: false });
    setModalTrigger(prev => prev + 1);

    initialOntologyRef.current = newOntology;
    isUsingServerRef.current = false;
  }
}
```

---

## 변경 2: `syncMarkdownsToGithub` 함수 추가

`saveOntology` 함수 바로 아래에 추가:

```typescript
const syncMarkdownsToGithub = async () => {
  const treeCopied = treeRef.current;
  if (treeCopied.length < 1) return;

  try {
    const serverUrl = serverUrlRef.current;
    const res = await fetch(`${serverUrl}sync-markdowns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tree: treeCopied })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: "Unknown error" }));
      setModalData({ message: `GitHub sync failed: ${errData.detail}`, status: false });
      setModalTrigger(prev => prev + 1);
      return;
    }

    const data = await res.json();
    if (data.status) {
      setModalData({ message: `Synced to GitHub (${data.commit?.slice(0, 7)})`, status: true });
    } else {
      setModalData({ message: "GitHub sync failed", status: false });
    }
    setModalTrigger(prev => prev + 1);
  } catch (error) {
    console.error("GitHub sync error:", error);
  }
};
```

---

## 변경 3: 죽은 코드 제거

`handleBeforeUnload` 내 주석과 `saveMarkdowns` 주석 블록 제거:

```typescript
// 삭제 대상 ↓
// saveMarkdowns(); // disabled — replaced by GitHub repo sync (see GITHUB_MARKDOWN_SYNC_TASK.md)

// 삭제 대상 ↓
// const saveMarkdowns = async () => {
//   const treeCopied = treeRef.current;
//   ...
// };
```

---

## 백엔드 엔드포인트 스펙

### `POST /sync-markdowns`

**Request:**
```json
{
  "tree": [
    {
      "treeId": "string",
      "nodeId": "string",
      "name": "string",
      "desc": "string",
      "tags": ["string"],
      "children": [/* recursive */]
    }
  ]
}
```

**Success (200):**
```json
{ "status": true, "commit": "full_sha_string" }
```

**Error:**
- `400` — 빈 tree
- `500` — GitHub API 실패 (단계별 에러 메시지 포함)
- `503` — GIT_REPO 토큰 미설정

---

## 동작 흐름

```
Ctrl+S
  → saveOntology()
    → POST /ontology (DB 저장)
    → 성공 시 모달: "Successful"
    → syncMarkdownsToGithub()
      → POST /sync-markdowns (GitHub push)
      → 성공 시 모달: "Synced to GitHub (abc1234)"
      → 실패 시 모달: "GitHub sync failed: ..."
```

GitHub 동기화 실패가 온톨로지 저장 결과에 영향을 주지 않는다.
`isUsingServerRef`가 `false`로 복원된 후에 sync가 호출된다.
