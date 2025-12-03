import TreeContext from "@/contexts/TreeContext";
import styles from "@/styles/nodeEditor.module.css";
import { Tree } from "@/types/ontologyTypes";
import { debounceTimer, treeUtils } from "@/utils";
import clsx from "clsx";
import { ChangeEvent, useContext, useEffect, useRef, useState } from "react";

const EmptyState = () => {
  return (
    <div className={clsx(styles.nothing)}>
      <p>{`Select any :D`}</p>
    </div>
  );
};

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
    if (nodeId === "") {
      setNode(null);
      return;
    }

    treeUtils.traverseTree(tree, n => {
      if (n.nodeId === nodeId) {
        setNode(n);
        return true;
      }
    });
  }, [nodeId]);

  useEffect(() => {
    if (!node) return;
    setName(node.name);
    setDesc(node.desc);
  }, [node]);

  useEffect(() => {
    if (!node) return;
    if (node.name === name && node.desc === desc) return;

    debounceTimer(timerRef, handleChangeTree);
  }, [name, desc]);

  return (
    <div className={clsx(styles.editor)}>
      {!node ? <EmptyState /> : (
        <div className={clsx(styles.attribute)}>
          <div>
            <p>NAME</p>
            <input type="text" placeholder="Write Name" value={name} onChange={handleChangeName} />
          </div>
          <div>
            <p>DESCRIPTION</p>
            <textarea rows={7} placeholder="Write Desc" value={desc} onChange={handleChangeDesc} />
          </div>
        </div>
      )}
    </div>
  );
};

export default NodeEditor;