from typing import List, Optional, Literal
from fastapi import FastAPI, HTTPException, Form, Body, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.requests import Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import asyncpg
import os

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

def get_current_user(request: Request):
  auth_header = request.headers.get("Authorization")
  if not auth_header or not auth_header.startswith("Bearer "):
    raise HTTPException(status_code =401, detail="Missing token")
  
  token = auth_header.split(" ")[1]
  try:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    username = payload.get("sub")
    if username is None:
      raise HTTPException(status_code=401, detail="Invalid token")
    return username
  except JWTError:
    raise HTTPException(status_code=401, detail="Invalid token")

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
async def write_ontology(
  ont_diff: OntologyDifference = Body(...),
  current_user: str = Depends(get_current_user)
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