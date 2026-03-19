# Knowledge Ontology Engine - Agent Guide

이 문서는 AI 에이전트가 이 레포지토리의 데이터를 생성, 수정, 삭제하는 방법을 설명합니다.

> **핵심 원리**: 이 레포지토리에 push하면 GitHub Actions가 자동으로 데이터베이스에 반영합니다. 따라서 에이전트는 마크다운 파일과 폴더 구조만 올바르게 관리하면 됩니다.

---

## 1. 전체 구조

```
knowledge-ontology-engine/
├── README.md                    ← 자동 생성됨 (직접 수정 불필요)
├── AGENT_GUIDE.md               ← 이 가이드
├── .github/workflows/           ← DB 동기화 워크플로우
└── Brain/                       ← 루트 노드 폴더
    ├── Brain.md                 ← 루트 노드 마크다운
    ├── Left/
    │   ├── Left.md
    │   ├── AI _ ML/
    │   │   ├── AI _ ML.md
    │   │   ├── vLLM.md          ← 리프 노드 (자식 없음)
    │   │   └── LLM/
    │   │       ├── LLM.md       ← 폴더 노드 (자식 있음)
    │   │       └── GPT.md       ← 리프 노드
    │   └── Mathematics/
    │       └── Mathematics.md
    └── Right/
        └── Right.md
```

### 폴더 노드 vs 리프 노드

| 유형 | 조건 | 예시 |
|------|------|------|
| **폴더 노드** | 자식이 있는 노드. 자신의 이름과 같은 폴더 안에 `폴더명.md` 파일이 존재 | `AI _ ML/AI _ ML.md` |
| **리프 노드** | 자식이 없는 노드. 부모 폴더 안에 `노드명.md` 파일만 존재 | `AI _ ML/vLLM.md` |

---

## 2. 마크다운 파일 형식

모든 노드는 아래 형식의 마크다운 파일로 표현됩니다.

### 폴더 노드 (자식이 있는 경우)

```markdown
---
nodeId: 54edd916-ee79-450d-817e-c25183db0e4d
name: AI / ML
tags: [machine-learning, artificial-intelligence]
children: [vLLM, LLM, Generative Models]
---

# AI / ML

여기에 노드의 설명을 작성합니다.

## Children

- [[vLLM]]
- [[LLM]]
- [[Generative Models]]
```

### 리프 노드 (자식이 없는 경우)

```markdown
---
nodeId: 6f373ee0-629c-4a12-8240-c106728c9c74
name: Variational AutoEncoder (VAE)
tags: [generative-model, deep-learning]
children: []
---

# Variational AutoEncoder (VAE)

여기에 상세 설명을 작성합니다.
수학 수식, 코드 블록, 이미지 링크 등을 자유롭게 사용할 수 있습니다.

$$\log p(x) \ge \mathbb{E}_{q(z|x)}[\log p(x|z)] - D_{KL}(q(z|x) || p(z))$$
```

### Frontmatter 필드 설명

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `nodeId` | string | ✅ | 고유 식별자. UUID v4 형식 권장 (예: `550e8400-e29b-41d4-a716-446655440000`) |
| `name` | string | ✅ | 노드 표시 이름. 파일/폴더명의 원본 이름 |
| `tags` | string[] | ✅ | 태그 배열. 비어있으면 `[]` |
| `children` | string[] | ✅ | 자식 노드들의 `name` 목록. 리프 노드는 `[]` |

---

## 3. 파일/폴더 이름 규칙

파일명과 폴더명에서 특수 문자는 `_`로 치환됩니다:

| 원본 name | 파일/폴더명 |
|-----------|------------|
| `AI / ML` | `AI _ ML` |
| `C++` | `C++` |
| `What is "AI"?` | `What is _AI__` |

**치환 대상 문자**: `< > : " / \ | ? *`

---

## 4. 새 노드 생성하기

### Step 1: nodeId 생성

UUID v4를 생성합니다. 예시:
```
a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### Step 2: 파일 위치 결정

- **부모 노드 아래에 리프 노드 추가**: 부모 폴더 안에 `새노드명.md` 파일 생성
- **부모 노드 아래에 폴더 노드 추가**: 부모 폴더 안에 `새노드명/새노드명.md` 생성

### Step 3: 마크다운 파일 작성

위 형식에 맞춰 frontmatter와 본문을 작성합니다.

### Step 4: 부모 노드 업데이트

부모 노드의 마크다운 파일에서:
1. frontmatter의 `children` 배열에 새 노드의 `name` 추가
2. `## Children` 섹션에 `- [[새 노드명]]` 추가

### 예시: "Transformer" 노드를 AI / ML 아래에 추가

1. `Brain/Left/AI _ ML/Transformer.md` 파일 생성 (리프 노드인 경우)

```markdown
---
nodeId: f47ac10b-58cc-4372-a567-0e02b2c3d479
name: Transformer
tags: [deep-learning, attention]
children: []
---

# Transformer

Attention Is All You Need (2017) 논문에서 제안된 아키텍처.
```

2. `Brain/Left/AI _ ML/AI _ ML.md` 의 frontmatter 및 Children 수정:

```markdown
---
nodeId: 54edd916-ee79-450d-817e-c25183db0e4d
name: AI / ML
tags: []
children: [vLLM, LLM, Generative Models, Transformer]
---

# AI / ML

...

## Children

- [[vLLM]]
- [[LLM]]
- [[Generative Models]]
- [[Transformer]]
```

---

## 5. 리프 노드를 폴더 노드로 변환

기존 리프 노드에 자식을 추가하려면:

1. 노드명과 같은 폴더 생성
2. 기존 `.md` 파일을 폴더 안으로 이동
3. 자식 노드 파일 추가
4. frontmatter의 `children` 및 `## Children` 섹션 업데이트

**예시**: `vLLM.md` → `vLLM/vLLM.md` + `vLLM/PagedAttention.md`

---

## 6. 노드 삭제

1. 해당 노드의 `.md` 파일 삭제 (폴더 노드인 경우 폴더 전체 삭제)
2. 부모 노드의 `children`과 `## Children`에서 해당 노드 제거

---

## 7. 노드 수정

노드의 설명, 태그 등을 수정하려면 해당 `.md` 파일을 직접 편집합니다.

- **이름 변경**: frontmatter의 `name` 수정 + 파일/폴더명 변경 + 부모의 children 업데이트
- **설명 수정**: frontmatter 아래 본문 편집
- **태그 수정**: frontmatter의 `tags` 배열 수정

---

## 8. 커밋 & 푸시

변경사항을 `main` 브랜치에 push하면 자동으로 데이터베이스에 반영됩니다.

```bash
git add .
git commit -m "Add Transformer node under AI/ML"
git push origin main
```

> ⚠️ **주의사항**:
> - 커밋 메시지가 `sync:`로 시작하면 워크플로우가 실행되지 않습니다 (웹페이지 동기화와의 충돌 방지).
> - `nodeId`는 변경하지 마세요. 기존 노드의 ID를 바꾸면 데이터 무결성이 깨집니다.
> - 반드시 `main` 브랜치에 push해야 워크플로우가 트리거됩니다.

---

## 9. 체크리스트

새 노드를 만들 때 아래를 확인하세요:

- [ ] frontmatter에 유효한 UUID v4 형식의 `nodeId`가 있는가?
- [ ] `name` 필드가 정확한가?
- [ ] `tags`가 배열 형식 `[tag1, tag2]`인가?
- [ ] `children`이 실제 자식 노드의 `name` 목록과 일치하는가?
- [ ] 폴더 노드라면 폴더명과 `.md` 파일명이 동일한가?
- [ ] 부모 노드의 `children`과 `## Children`에 새 노드가 추가되었는가?
- [ ] 파일/폴더명에서 특수 문자가 `_`로 치환되었는가?
