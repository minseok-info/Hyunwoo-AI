export type Ontology = {
  nodes: Node[]
  relations: Relation[]
}

export type Node = {
  id: string
  name: string
  desc: string
  tags: string[]
}

export type Relation = {
  from: Node["id"]
  to: Node["id"]
  type: "parent"
}

export type OntologyDifference = {
  nodes: {
    inserted: Node[]
    deleted: Node[]
    updated: Node[]
  }
  relations: {
    inserted: Relation[]
    deleted: Relation[]
  }
}

export type Tree = {
  treeId: string
  nodeId: Node["id"]
  name: Node["name"]
  desc: Node["desc"]
  tags: Node["tags"]
  children: Tree[]
}