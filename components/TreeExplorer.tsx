import { Tree } from "@/types/ontologyTypes";
import TreeFile from "./TreeFile";
import TreeFolder from "./TreeFolder";

const TreeExplorer = ({ tree }: { tree: Tree[] }) => {
  return tree.map((n, i) => {
    if (n.children.length > 0) return <TreeFolder node={n} depth={0} key={i} />
    else return <TreeFile node={n} depth={0} key={i} />
  });
};

export default TreeExplorer;