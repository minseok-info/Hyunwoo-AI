# Hyunwoo AI Frontend — Project Guide

## Overview

Three.js + Next.js (Pages Router) 기반의 인터랙티브 온톨로지 탐색 플랫폼.
랜딩 페이지에서는 3D WebGL 씬 안에서 노드를 탐색하고, 관리자 페이지에서는 트리 구조 기반 CMS로 온톨로지를 편집합니다.

---

## Tech Stack

| Category | Details |
|---|---|
| Framework | Next.js 14 (Pages Router), TypeScript |
| 3D Engine | Three.js 0.180, CSS3DRenderer, GLTFLoader |
| Styling | CSS Modules, clsx |
| Markdown | react-markdown v10, remark-gfm, remark-math, remark-breaks, rehype-katex, rehype-sanitize |
| State | React hooks + TreeContext (Context API) |
| Backend | `https://hyunwoo-ai-backend.fly.dev/` (GET/POST `/ontology`) |

---

## Pages

### `/` — Landing (3D Exploration)

- **Three.js 기반 3D 노드 탐색**: 카메라 회전, 휠 줌(스케일), Raycasting 클릭으로 노드 간 이동
- **Energy Handle UI**: 상(Top), 하(Bottom), 좌(Left), 우(Right) 4방향 패널
  - **Top**: 노드 설명(Markdown) + 태그 기반 노드 탐색, Google Maps 임베드 지원
  - **Left**: 노드 트리 탐색(Back/Push)
  - **Right**: 확장 가능한 빈 패널 (미래 기능용)
  - **Bottom**: SVG 기반 NodeMapViewer (트리 맵)
- **SplashOverlay**: 첫 진입 시 표시, 아무 Energy Handle 토글 시 사라짐
- **SSR**: `getServerSideProps`로 온톨로지 데이터를 서버에서 미리 가져옴. 실패 시 클라이언트 fallback
- **Wheel Zoom 정규화**: trackpad(소delta, 고빈도)와 mouse(대delta, 저빈도) 모두에서 일관된 줌 경험 제공. `WHEEL_MAX_DELTA=60`으로 clamp 후 `[-1, 1]` 범위로 정규화

### `/admin` — Admin (CMS)

- **SidebarNavigator**: 트리 검색 및 파일/폴더 형태 탐색
- **NodeEditor**: 노드 이름/설명/태그/부모/자식 편집, Markdown 에디터 + 뷰어
- **NodeMapViewer**: 항상 좌상단 미니맵으로 표시, 클릭 시 전체 오버레이 확장
- **SSR**: `getServerSideProps`로 온톨로지 서버 사이드 fetch
- **Ctrl+S**: 온톨로지 변경사항 서버 저장
- **beforeunload**: 마크다운 파일 자동 저장 (`/api/save-markdowns`)

### `/signIn` — Sign In Page

---

## Key Components

### `NodeMapViewer`
SVG 기반 트리 맵. `mode="landing"` (부모+자식만 클릭 가능) / `mode="admin"` (모든 노드 클릭 가능) 지원. 드래그+줌, Reingold-Tilford 유사 레이아웃 알고리즘.

### `GoogleMapEmbed`
Google Maps 단축 URL을 iframe 임베드로 변환. 두 가지 모드:
1. **Pre-resolved** (`embedData` prop): 붙여넣기 시 좌표를 미리 해석하여 alt text에 저장 → 즉시 렌더링
2. **Runtime resolution**: `/api/resolve-map` API 호출 → Node.js `https` 모듈로 리다이렉트 추적 → 좌표 추출

마크다운 형식: `![googlemaps:lat,lng,zoom](shortUrl)` 또는 `![googlemaps](shortUrl)`

### `EnergyHandleTop / Left / Right / Bottom`
랜딩 페이지의 4방향 패널. 각각 `onFirstClick` 콜백을 통해 SplashOverlay 해제 및 이벤트 리스너 등록 트리거.

### `SplashOverlay`
`show` prop이 true가 되면 fade out 후 display:none. 첫 Energy Handle 인터랙션 시 해제됨.

---

## API Routes

### `POST /api/save-markdowns`
트리 구조를 마크다운 파일 형식으로 변환. 각 노드는 `{NodeName}.md` 파일명으로 저장되며) YAML frontmatter (nodeId, treeId, name, tags) 포함.

### `GET /api/resolve-map?url=<shortUrl>`
Google Maps 단축 URL (`maps.app.goo.gl/*`)을 임베드 URL로 해석.
- **Strategy 1**: Node.js `https` 모듈로 HTTP 리다이렉트 수동 추적 (consent cookie 포함)
- **Strategy 2**: Web `fetch` API `redirect:follow` 백업
- URL 패턴 5가지에서 좌표/장소명 추출 → `maps.google.com/maps?q=...&output=embed` 형식 반환

---

## Data Flow

```
Backend (fly.dev/ontology)
  ↓ getServerSideProps (SSR) or client fetch (fallback)
Ontology { nodes: Node[], relations: Relation[] }
  ↓ ontologyToTree()
Tree[] (hierarchical structure with treeId, nodeId, children)
  ↓ treeUtils.sortTree()
sortedTree → Components (SidebarNavigator, NodeEditor, NodeMapViewer, EnergyHandles)
```

---

## Types

```typescript
type Ontology = { nodes: Node[]; relations: Relation[] }
type Node = { id: string; name: string; desc: string; tags: string[] }
type Relation = { from: string; to: string; type: "parent" }
type Tree = { treeId: string; nodeId: string; name: string; desc: string; tags: string[]; children: Tree[] }
```

---

## Styles

CSS Modules (`*.module.css`). 주요 디자인 변수:
- `--theme`, `--darkTheme`, `--text`, `--line` (globals.css)
- Sci-fi blue radial-gradient 테마 (nodeMapViewer panels)
- bottomPanelContent 배경: `rgba(8, 12, 22, 0.94)` (흰색 배경 위 가시성 확보)

---

## Recent Changes (2026-02-27)

1. **NodeMapViewer bottomPanel 배경 강화**: `bottomPanelContent`에 어두운 배경(`rgba(8,12,22,0.94)`) 추가하여 밝은 콘텐츠 위 가시성 개선
2. **Google Maps 임베드 개선**: resolve-map API를 Node.js `https` 모듈 기반으로 완전 재작성, consent cookie 추가, 5가지 URL 패턴 지원, 붙여넣기 시 좌표 미리 해석
3. **Admin 미니맵 위치**: 우하단 → 좌상단(Path 요소 아래)으로 이동
4. **SplashOverlay 해제 조건 확장**: EnergyHandleTop뿐 아니라 모든 Energy Handle 토글 시 해제
5. **SSR 데이터 페칭**: index.tsx, admin/index.tsx 모두 `getServerSideProps`로 온톨로지 SSR fetch (실패 시 클라이언트 fallback)
6. **Wheel Zoom 정규화**: deltaY를 `[-60, 60]` 범위로 clamp하여 trackpad와 mouse 간 일관된 줌 경험 제공
