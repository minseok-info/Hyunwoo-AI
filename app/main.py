from typing import List, Optional, Literal
from fastapi import FastAPI, HTTPException, Form, Body, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.requests import Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict

import asyncpg
import os
import re
import base64
import hashlib
import httpx

from jose import JWTError, jwt
from datetime import datetime, timedelta

app = FastAPI()

app.add_middleware(
  CORSMiddleware,
  allow_origins=[
    "http://localhost",
    "https://hyunwoo.ai",
    "https://www.hyunwoo.ai"
  ],
  allow_methods=["*"],
  allow_headers=["*"],
  allow_credentials=True
)

DATABASE_URL = os.getenv("DATABASE_URL")

ID = os.getenv("ID")
PWD = os.getenv("PWD")

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 6 * 60

# GitHub Sync Configuration
GITHUB_TOKEN = os.getenv("GIT_REPO")
GITHUB_API = "https://api.github.com"
GITHUB_REPO_OWNER = "hyunwoo-ai"
GITHUB_REPO_NAME = "knowledge-ontology-engine"
GITHUB_BRANCH = "main"

class Node(BaseModel):
  model_config = ConfigDict(populate_by_name=True)
  id: str
  name: str
  description: str = Field(..., alias="desc")
  tags: List[str]

class Relation(BaseModel):
  model_config = ConfigDict(populate_by_name=True)
  from_: str = Field(..., alias="from")
  to_: str = Field(..., alias="to")
  type: Literal["parent"]

class Ontology(BaseModel):
  nodes: List[Node]
  relations: List[Relation]

class NodesDiff(BaseModel):
  inserted: List[Node]
  deleted: List[Node]
  updated: List[Node]

class RelationsDiff(BaseModel):
  inserted: List[Relation]
  deleted: List[Relation]

class OntologyDifference(BaseModel):
  nodes: NodesDiff
  relations: RelationsDiff

def create_access_token(
  data: dict,
  expires_delta: timedelta | None = None
):
  to_encode = data.copy()
  if expires_delta:
    expire = datetime.utcnow() + expires_delta
  else:
    expire = datetime.utcnow() + timedelta(minutes=15)
  to_encode.update({"exp": expire})
  encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
  return encoded_jwt

@app.on_event("startup")
async def startup():
  try:
    app.state.db = await asyncpg.create_pool(DATABASE_URL)
    print("Success connecting with DB")
  except Exception as e:
    print(f"DATABASE_URL is [ {DATABASE_URL} ]")
    print(f"Failed connectiong with DB: [ {e} ]",)

@app.on_event("shutdown")
async def shutdown():
  if getattr(app.state, "db", None):
    await app.state.db.close()
    print("Close DB")

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
  return JSONResponse(
    status_code=exc.status_code,
    content={"detail": exc.detail}
  )

@app.get("/")
async def home():
  print("health check")
  return { "status": "ok" }

@app.post("/signin")
async def sign_in(
  id: str = Form(...),
  pwd: str = Form(...)
):
  if id != ID:
    return { "status": "failed", "reason": "id" }
  elif pwd != PWD:
    return { "status": "failed", "reason": "pwd" }

  access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
  access_token = create_access_token(
    data={"sub": id},
    expires_delta=access_token_expires
  )

  return JSONResponse({
    "status": "success",
    "access_token": access_token,
    "token_type": "bearer"
  })

@app.get("/ontology")
async def read_ontology():
  if not hasattr(app.state, "db") or app.state.db is None:
    raise HTTPException(status_code=500, detail="Cannot Connect DB")

  async with app.state.db.acquire() as conn:
    rows = await conn.fetch("select * from nodes")
    nodes = [dict(r) for r in rows]
    rows = await conn.fetch("select * from relations")
    relations = [dict(r) for r in rows]

  print("Success get Nodes & Relations")

  ontology = {
    "nodes": nodes,
    "relations": relations
  }

  return {
    "ontology": ontology
  }

@app.post("/ontology")
async def write_ontology(ont_diff: OntologyDifference = Body(...)):
  if not hasattr(app.state, "db") or app.state.db is None:
    raise HTTPException(status_code=500, detail="Cannot Connect DB")

  nodes_diff = ont_diff.nodes
  relations_diff = ont_diff.relations

  async with app.state.db.acquire() as conn:
    async with conn.transaction():
      try:
        if nodes_diff.inserted:
          insert_values = [(n.id, n.name, n.description, n.tags) for n in nodes_diff.inserted]
          await conn.executemany(
            "INSERT INTO nodes (id, name, description, tags) VALUES ($1, $2, $3, $4)",
            insert_values
          )
        
        if nodes_diff.deleted:
          delete_ids = [n.id for n in nodes_diff.deleted]
          await conn.execute(
            "DELETE FROM nodes WHERE id = ANY($1)",
            delete_ids
          )

        if nodes_diff.updated:
          update_values = [(n.name, n.description, n.tags, n.id) for n in nodes_diff.updated]
          await conn.executemany(
            "UPDATE nodes SET name=$1, description=$2, tags=$3 WHERE id=$4",
            update_values
          )

        if relations_diff.inserted:
          insert_values = [(r.from_, r.to_, r.type) for r in relations_diff.inserted]
          await conn.executemany(
            "INSERT INTO relations (from_, to_, type) VALUES ($1, $2, $3)",
            insert_values
          )

        if relations_diff.deleted:
          from_ids = [r.from_ for r in relations_diff.deleted]
          to_ids = [r.to_ for r in relations_diff.deleted]

          await conn.execute(
            """
            WITH del_relations(from_, to_) AS (
                SELECT UNNEST($1::text[]), UNNEST($2::text[])
            )
            DELETE FROM relations r
            USING del_relations d
            WHERE r.from_ = d.from_ AND r.to_ = d.to_;
            """,
            from_ids,
            to_ids
          )

      except Exception as e:
        print(f"DB Operation Failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"DB Operation Failed: {str(e)}")

  # GitHub sync after DB save
  sync_result = await sync_ontology_to_github(app.state.db)

  return {
    "nodes": nodes_diff.model_dump(),
    "relations": relations_diff.model_dump(),
    "status": True,
    "sync": sync_result
  }

# --- GitHub Markdown Sync ---

def sanitize_name(name: str) -> str:
  return re.sub(r'[<>:"/\\|?*]', '_', name).strip() or "unnamed"

def git_blob_sha(content: str) -> str:
  encoded = content.encode("utf-8")
  header = f"blob {len(encoded)}\0".encode("utf-8")
  return hashlib.sha1(header + encoded).hexdigest()

def ontology_to_tree(nodes: list, relations: list) -> list:
  node_map = {}
  for n in nodes:
    node_map[n["id"]] = {
      "nodeId": n["id"],
      "name": n["name"],
      "desc": n.get("description", ""),
      "tags": n.get("tags", []),
      "children": []
    }

  child_ids = set()
  for r in relations:
    pid, cid = r["from_"], r["to_"]
    if pid in node_map and cid in node_map:
      node_map[pid]["children"].append(node_map[cid])
      child_ids.add(cid)

  return [node_map[nid] for nid in node_map if nid not in child_ids]

def build_markdown_content(node: dict) -> str:
  children_names = [c["name"] for c in node["children"]]
  lines = [
    "---",
    f"nodeId: {node['nodeId']}",
    f"name: {node['name']}",
    f"tags: [{', '.join(node['tags'])}]",
    f"children: [{', '.join(children_names)}]",
    "---",
    "",
    f"# {node['name']}",
    "",
    node["desc"],
  ]

  if node["children"]:
    lines.append("")
    lines.append("## Children")
    lines.append("")
    for c in node["children"]:
      lines.append(f"- [[{c['name']}]]")

  return "\n".join(lines)

def build_markdown_files(tree: list, base_path: str = "") -> list:
  files = []
  for node in tree:
    safe_name = sanitize_name(node["name"])
    content = build_markdown_content(node)

    if node["children"]:
      node_path = f"{base_path}/{safe_name}" if base_path else safe_name
      files.append({"path": f"{node_path}/{safe_name}.md", "content": content})
      files.extend(build_markdown_files(node["children"], node_path))
    else:
      path = f"{base_path}/{safe_name}.md" if base_path else f"{safe_name}.md"
      files.append({"path": path, "content": content})

  return files

def build_readme(tree: list) -> str:
  toc_lines = [f"- [[{node['name']}]]" for node in tree]
  return "\n".join([
    "# Knowledge Ontology Engine",
    "",
    "## Table of Contents",
    "",
    *toc_lines,
    "",
  ])

def github_headers() -> dict:
  return {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  }

async def sync_to_github(files: list) -> str:
  headers = github_headers()
  repo_path = f"{GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}"

  async with httpx.AsyncClient(timeout=60.0) as client:
    # 1. Get current HEAD ref
    ref_url = f"{GITHUB_API}/repos/{repo_path}/git/refs/heads/{GITHUB_BRANCH}"
    ref_res = await client.get(ref_url, headers=headers)

    has_commits = ref_res.status_code == 200
    current_commit_sha = None
    current_tree_sha = None
    existing_files: dict[str, str] = {}

    if has_commits:
      current_commit_sha = ref_res.json()["object"]["sha"]
      commit_res = await client.get(
        f"{GITHUB_API}/repos/{repo_path}/git/commits/{current_commit_sha}",
        headers=headers
      )
      if commit_res.status_code != 200:
        raise Exception(f"[get-commit] {commit_res.status_code}")
      current_tree_sha = commit_res.json()["tree"]["sha"]

      # Fetch existing file SHAs
      tree_res = await client.get(
        f"{GITHUB_API}/repos/{repo_path}/git/trees/{current_tree_sha}?recursive=1",
        headers=headers
      )
      if tree_res.status_code == 200:
        for item in tree_res.json().get("tree", []):
          if item["type"] == "blob":
            existing_files[item["path"]] = item["sha"]

    elif ref_res.status_code in (404, 409):
      # Empty repo: initialize
      print("[init] Empty repo detected, initializing...")
      init_content = base64.b64encode(b"# init\n").decode()
      init_res = await client.put(
        f"{GITHUB_API}/repos/{repo_path}/contents/.gitkeep",
        headers=headers,
        json={"message": "init", "content": init_content}
      )
      if init_res.status_code not in (200, 201):
        raise Exception(f"[init-repo] {init_res.status_code}: {init_res.text}")

      ref_res = await client.get(ref_url, headers=headers)
      if ref_res.status_code == 200:
        has_commits = True
        current_commit_sha = ref_res.json()["object"]["sha"]
        commit_res = await client.get(
          f"{GITHUB_API}/repos/{repo_path}/git/commits/{current_commit_sha}",
          headers=headers
        )
        current_tree_sha = commit_res.json()["tree"]["sha"]
      else:
        raise Exception(f"[get-ref-after-init] {ref_res.status_code}")
    else:
      raise Exception(f"[get-ref] {ref_res.status_code}: {ref_res.text}")

    # 2. Diff: compare local SHAs with existing
    new_file_map = {f["path"]: f["content"] for f in files}
    tree_items = []

    # Changed/new files: create blobs only for these
    for path, content in new_file_map.items():
      local_sha = git_blob_sha(content)
      if existing_files.get(path) != local_sha:
        blob_res = await client.post(
          f"{GITHUB_API}/repos/{repo_path}/git/blobs",
          headers=headers,
          json={"content": content, "encoding": "utf-8"}
        )
        if blob_res.status_code != 201:
          raise Exception(f"[create-blob] {path}: {blob_res.status_code}")
        tree_items.append({
          "path": path, "mode": "100644", "type": "blob",
          "sha": blob_res.json()["sha"]
        })

    # Deleted files: mark with sha null
    for path in existing_files:
      if path not in new_file_map:
        tree_items.append({
          "path": path, "mode": "100644", "type": "blob",
          "sha": None
        })

    if not tree_items:
      print("No changes to sync")
      return current_commit_sha

    changed = sum(1 for t in tree_items if t["sha"] is not None)
    deleted = sum(1 for t in tree_items if t["sha"] is None)
    print(f"Syncing: {changed} changed, {deleted} deleted")

    # 3. Create tree with base_tree
    tree_body: dict = {"tree": tree_items, "base_tree": current_tree_sha}
    tree_res = await client.post(
      f"{GITHUB_API}/repos/{repo_path}/git/trees",
      headers=headers,
      json=tree_body
    )
    if tree_res.status_code != 201:
      raise Exception(f"[create-tree] {tree_res.status_code}: {tree_res.text}")
    new_tree_sha = tree_res.json()["sha"]

    # 4. Create commit
    commit_res = await client.post(
      f"{GITHUB_API}/repos/{repo_path}/git/commits",
      headers=headers,
      json={
        "message": f"sync: update knowledge base {datetime.utcnow().isoformat()}Z",
        "tree": new_tree_sha,
        "parents": [current_commit_sha],
      }
    )
    if commit_res.status_code != 201:
      raise Exception(f"[create-commit] {commit_res.status_code}")
    new_commit_sha = commit_res.json()["sha"]

    # 5. Update ref
    update_res = await client.patch(
      ref_url, headers=headers,
      json={"sha": new_commit_sha}
    )
    if update_res.status_code not in (200, 201):
      raise Exception(f"[update-ref] {update_res.status_code}")

    return new_commit_sha

async def sync_ontology_to_github(db_pool) -> dict:
  if not GITHUB_TOKEN:
    return {"status": False, "error": "GIT_REPO token not configured"}

  try:
    async with db_pool.acquire() as conn:
      rows = await conn.fetch("select * from nodes")
      nodes = [dict(r) for r in rows]
      rows = await conn.fetch("select * from relations")
      relations = [dict(r) for r in rows]

    tree = ontology_to_tree(nodes, relations)
    if not tree:
      return {"status": False, "error": "Empty ontology"}

    files = build_markdown_files(tree)
    files.append({"path": "README.md", "content": build_readme(tree)})

    commit_sha = await sync_to_github(files)
    print(f"GitHub sync success: {commit_sha[:7]}")
    return {"status": True, "commit": commit_sha}
  except Exception as e:
    print(f"GitHub sync failed: {str(e)}")
    return {"status": False, "error": str(e)}
