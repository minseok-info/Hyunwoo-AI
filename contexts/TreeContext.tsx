import { Tree } from "@/types/ontologyTypes";
import { createContext } from "react";

interface TreeContext {
  setTree: (tree: Tree[]) => void

  nodePath: Tree[]

  nodeId: Tree["nodeId"]
  treeId: Tree["treeId"]
  setId: (newTreeId: Tree["treeId"], newNodeId: Tree["nodeId"]) => void
}

const TreeContext = createContext<TreeContext>({
  nodePath: [],
  
  setTree: () => {},
  
  treeId: "",
  nodeId: "",
  setId: () => {},
});

export default TreeContext;