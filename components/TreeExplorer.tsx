import { Tree } from "@/types/ontologyTypes";
import TreeFile from "./TreeFile";
import TreeFolder from "./TreeFolder";

const TreeExplorer = ({ tree }: { tree: Tree[] }) => {
  return tree.map((n, i) => {
    if (n.children.length > 0) return <TreeFolder node={n} key={i} />
    else return <TreeFile node={n} key={i} />
  });
};

export default TreeExplorer;