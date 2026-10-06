import styles from "@/styles/treeSearch.module.css";
import { Tree } from "@/types/ontologyTypes";
import clsx from "clsx";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import TreeFolder from "./TreeFolder";
import TreeFile from "./TreeFile";
import { debounceTimer, treeUtils } from "@/utils";

const TreeSearch = ({ tree }: { tree: Tree[] }) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [tempword, setTempword] = useState<string>("");
  const [keyword, setKeyword] = useState<string>("");

  const [resultTree, setResultTree] = useState<Tree[]>([]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setTempword(value);
  }

  useEffect(() => {
    debounceTimer(timerRef, () => setKeyword(tempword));
  }, [tempword]);

  useEffect(() => {
    const word = keyword.toLowerCase();

    const filteredTree: Tree[] = [];
    if (keyword !== "") {
      treeUtils.traverseTree(tree, n => {
        if (filteredTree.some(t => t.nodeId === n.nodeId)) return;
  
        const name = n.name.toLowerCase();
        const desc = n.desc.toLowerCase();
  
        if (name.includes(word) || desc.includes(word)) {
          filteredTree.push(n);
        }
      });
    }

    setResultTree(filteredTree);
  }, [keyword]);

  return (
    <>
      <div className={clsx(styles.search)}>
        <input type="text" placeholder="Search" value={tempword} onChange={handleChange} />
      </div>
      {resultTree.length > 0 && resultTree.map((n, i) => {
        if (n.children.length > 0) return <TreeFolder node={n} depth={0} closeForce key={i} />
        else return <TreeFile node={n} depth={0} key={i} />
      })}
    </>
  );
}

export default TreeSearch;