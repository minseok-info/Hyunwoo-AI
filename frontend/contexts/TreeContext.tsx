import { Ontology, Tree } from "@/types/ontologyTypes";
import { createContext } from "react";

interface TreeContext {
  setTree: (tree: Tree[]) => void

  nodePath: Tree[]

  nodeId: Tree["nodeId"]
  treeId: Tree["treeId"]
  setId: (newTreeId: Tree["treeId"], newNodeId: Tree["nodeId"]) => void

  oldOntology: Ontology;
  saveOntology: () => void
}

const TreeContext = createContext<TreeContext>({
  setTree: () => {},
  
  nodePath: [],
  
  treeId: "",
  nodeId: "",
  setId: () => {},

  oldOntology: { nodes: [], relations: [] },
  saveOntology: () => {}
});

export default TreeContext;