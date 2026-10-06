# Hyunwoo AI

마크다운 지식 베이스를 3D 노드 맵으로 탐색·편집하고, 채팅으로 질문하는 개인 지식 온톨로지 서비스.

| 폴더 | 역할 | 스택 |
| --- | --- | --- |
| [`frontend/`](frontend) | 3D 노드 맵, 트리 탐색기, 노드 에디터, 채팅 UI | Next.js · React · TypeScript · Three.js |
| [`backend/`](backend) | 인증, 온톨로지 조회·저장, GitHub 동기화 | FastAPI · PostgreSQL · Fly.io |
| [`knowledge-ontology-engine/`](knowledge-ontology-engine) | 폴더 구조가 곧 노드 트리인 마크다운 지식 베이스 | Markdown · GitHub Actions |
