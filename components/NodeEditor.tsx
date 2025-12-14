import TreeContext from "@/contexts/TreeContext";
import styles from "@/styles/nodeEditor.module.css";
import { Tree } from "@/types/ontologyTypes";
import { debounceTimer, treeUtils } from "@/utils";
import clsx from "clsx";
import { ChangeEvent, useContext, useEffect, useRef, useState } from "react";
import ParentEditor from "./ParentEditor";
import TagEditor from "./TagEditor";
import ChildrenEditor from "./ChildrenEditor";
import Path from "./Path";

const NodeEditor = ({ tree }: { tree: Tree[] }) => {
  const { nodeId, setTree } = useContext(TreeContext);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [node, setNode] = useState<Tree | null>(null);

  const [name, setName] = useState<Tree["name"]>("");
  const [desc, setDesc] = useState<Tree["desc"]>("");

  const handleChangeName = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setName(value);
  };

  const handleChangeDesc = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setDesc(value);
  };

  const handleChangeTree = () => {
    const newTree = treeUtils.updateNode(tree, nodeId, n => {
      return { ...n, name, desc };
    });
    setTree(newTree);
  };

  useEffect(() => {
    if (!node) return;
    else if (node.name === name && node.desc === desc) return;
    debounceTimer(timerRef, handleChangeTree, 250);
  }, [name, desc]);

  useEffect(() => {
    if (nodeId === "") return;
    
    treeUtils.traverseTree(tree, n => {
      if (n.nodeId === nodeId) {
        setNode(n);
        return true;
      }
    });
  }, [tree, nodeId]);

  useEffect(() => {
    if (!node) return;
    setName(node.name);
    setDesc(node.desc);
  }, [node]);

  if (!node) {
    return (
      <div className={clsx(styles.editor)}>
        <div className={clsx(styles.nothingWrapper)}>
          <p>{`Select Any :D`}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(styles.editor)}>
      <div className={clsx(styles.path)}>
        <Path node={node} />
      </div>
      <div className={clsx(styles.wrapper)}>
        <div className={clsx(styles.name)}>
          <input type="text" placeholder="New Page" value={name} onChange={handleChangeName} />
        </div>
        <div className={clsx(styles.meta)}>
          <ParentEditor tree={tree} node={node} />
          <TagEditor tree={tree} node={node} />
        </div>
        <div className={clsx(styles.desc)}>
          <textarea placeholder="New Description" value={desc} onChange={handleChangeDesc} />
        </div>
        <div className={clsx(styles.children)}>
          <ChildrenEditor tree={tree} node={node} />
        </div>
      </div>
    </div>
  );
};

export default NodeEditor;