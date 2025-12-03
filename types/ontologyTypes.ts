export type Ontology = {
  nodes: Node[]
  relations: Relation[]
}

export type Node = {
  id: string
  name: string
  desc: string
}

export type Relation = {
  from: Node["id"]
  to: Node["id"]
  type: "parent" | "tag"
}

export type Tree = {
  treeId: string
  nodeId: Node["id"]
  name: Node["name"]
  desc: Node["desc"]
  children: Tree[]
}