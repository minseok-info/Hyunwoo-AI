import { Tree } from "@/types/ontologyTypes";
import { createContext } from "react";

interface TreeContext {
  treeId: Tree["treeId"]
  treePath: string[]
  setTree: (tree: Tree[]) => void
  setTreeId: (id: Tree["treeId"]) => void

  nodeId: Tree["nodeId"]
  setNodeId: (id: Tree["nodeId"] | null) => void
}

const TreeContext = createContext<TreeContext>({
  treeId: "",
  treePath: [],
  setTree: () => {},
  setTreeId: () => {},
  
  nodeId: "",
  setNodeId: () => {}
});

export default TreeContext;