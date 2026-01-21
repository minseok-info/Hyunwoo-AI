from typing import List, Optional, Literal
from fastapi import FastAPI, HTTPException, Form, Body, Response, Depends, Cookie
from fastapi.responses import JSONResponse
from fastapi.requests import Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from datetime import datetime, timedelta

import asyncpg
import jwt
import os

app = FastAPI()

app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_methods=["*"],
  allow_headers=["*"],
  allow_credentials=True
)

DATABASE_URL = os.getenv("DATABASE_URL")

ID = os.getenv("ID")
PWD = os.getenv("PWD")

SECRET_KEY = os.getenv("ADMIN_JWT_SECRET")
ALGORITHM = "HS256"

class Node(BaseModel):
  id: str
  name: str
  description: str = Field(..., alias="desc")
  tags: List[str]

  class Config:
    allow_population_by_field_name = True

class Relation(BaseModel):
  from_: str = Field(..., alias="from")
  to_: str = Field(..., alias="to")
  type: Literal["parent"]

  class Config:
    allow_population_by_field_name = True

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

def verify_admin_jwt(token: str):
  try:
    payload = jwt.decode(
      token,
      SECRET_KEY,
      algorithms=[ALGORITHM]
    )
    if payload.get("role") != "admin":
      raise HTTPException(status_code=401, detail="Not admin")
    return payload
  except jwt.ExpiredSignatureError:
    raise HTTPException(status_code=401, detail="Token expired")
  except jwt.InvalidTokenError:
    raise HTTPException(status_code=401, detail="Invalid token")

def create_admin_jwt():
  payload = {
    "role": "admin",
    "exp": datetime.utcnow() + timedelta(hours=12),
  }
  return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def require_admin(
  admin_auth: Optional[str] = Cookie(None)
):
  if not admin_auth:
    raise HTTPException(status_code=401, detail="Not authenticated")

  return verify_admin_jwt(admin_auth)

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
  response: Response,
  id: str = Form(...),
  pwd: str = Form(...)
):
  if not SECRET_KEY:
    raise HTTPException(status_code=500, detail="Secret Key is not set")

  if id != ID:
    return { "status": "failed", "reason": "id" }
  elif pwd != PWD:
    return { "status": "failed", "reason": "pwd" }

  token = create_admin_jwt()

  response.set_cookie(
    key="admin_auth",
    value=token,
    httponly=True,
    secure=True,
    samesite="strict",
    max_age=60*60*12,
    path="/"
  )

  return { "status": "success" }

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
async def write_ontology(
  ont_diff: OntologyDifference = Body(...),
  _: dict = Depends(require_admin)
):
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

  return {
    "nodes": nodes_diff.dict(),
    "relations": relations_diff.dict(),
    "status": True
  }