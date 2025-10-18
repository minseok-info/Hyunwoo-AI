from typing import List, Optional
from fastapi import FastAPI, HTTPException, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import asyncpg
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

class Thought(BaseModel):
  id: Optional[int] = None
  type: str
  title: str
  content: str

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

@app.get("/")
async def home():
  print("health check")
  return { "status": "ok" }

@app.post("/auth")
async def sign_in(
  id: str = Form(...),
  pwd: str = Form(...)
):
  if id != ID:
    return {
      "status": "failed",
      "reason": "id"
    }
  elif pwd != PWD:
    return {
      "status": "failed",
      "reason": "pwd"
    }

  return { "status": "success" }

@app.get("/thoughts")
async def read_thoughts():
  if app.state.db is None:
    raise HTTPException(status_code=500, detail="Cannot Connect DB")

  async with app.state.db.acquire() as connection:
    rows = await connection.fetch("select * from thoughts")
    thoughts = [dict(row) for row in rows]
    return thoughts

@app.post("/thoughts")
async def add_thought(thoughts: List[Thought] = Body(...)):
  if app.state.db is None:
    raise HTTPException(status_code=500, detail="Cannot Connect DB")

  to_insert = [t for t in thoughts if t.id is None]
  to_change = [t for t in thoughts if t.id is not None]

  async with app.state.db.acquire() as connection:
    try:
      if to_insert:
        insert_values = [(t.type, t.title, t.content) for t in to_insert]
        await connection.executemany(
          """
          insert into thoughts (type, title, content)
          values ($1, $2, $3)
          """,
          insert_values
        )

      if to_change:
        update_values = [(t.type, t.title, t.content, t.id) for t in to_change]
        await connection.executemany(
          """
          update thoughts
          set type = $1, title = $2, content = $3
          where id = $4
          """,
          update_values
        )
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))

  return {
    "updated_count": len(thoughts),
    "status": "updated"
  }

@app.delete("/thoughts")
async def delete_thought(thought_ids: List[int] = Body(...)):
  if app.state.db is None:
    raise HTTPException(status_code=500, detail="Cannot Connect DB")

  async with app.state.db.acquire() as connection:
    result = await connection.execute(
      "delete from thoughts where id = ANY($1)",
      thought_ids
    )
  
  return {
    "ids": thought_ids,
    "status": "deleted"
  }