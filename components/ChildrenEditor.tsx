import TreeContext from "@/contexts/TreeContext";
import styles from "@/styles/treeEditor.module.css";
import { Tree } from "@/types/ontologyTypes";
import { checkDoubleClick, treeUtils } from "@/utils";
import clsx from "clsx";
import Image from "next/image";
import { useRouter } from "next/router";
import { useContext, useEffect, useRef, useState } from "react";

const folderIcon = {
  src: require("@/public/icons/folder.svg"),
  alt: "folder"
};

const fileIcon = {
  src: require("@/public/icons/textFile.svg"),
  alt: "file"
};

const Item = ({ node }: { node: Tree }) => {
  const { nodeId, setTreeId, setNodeId } = useContext(TreeContext);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleClick = () => {
    setNodeId(node.nodeId);

    const isDoubleClick = checkDoubleClick(timerRef);
    if (!isDoubleClick) return;

    setTreeId(node.treeId);
  }

  return (
    <div className={clsx(styles.item, { [styles.selected]: node.nodeId === nodeId })} onClick={handleClick}>
      {node.children.length > 0 ? (
        <Image src={folderIcon.src} alt={folderIcon.alt} />
      ) : (
        <Image src={fileIcon.src} alt={fileIcon.alt} />
      )}
      <p>{ node.name }</p>
    </div>
  );
};

const List = ({ children }: { children: Tree[] }) => {
  return (
    <div className={clsx(styles.list)}>
      {children.map((n, i) => (
        <Item node={n} key={i} />
      ))}
    </div>
  );
};

const EmptyState = () => {
  return (
    <div className={clsx(styles.nothing)}>
      <p>{`Nothing in here :)`}</p>
    </div>
  );
};

const ChildrenEditor = ({ tree }: { tree: Tree[] }) => {
  const router = useRouter();
  const { treeId, nodeId, setTree, setNodeId } = useContext(TreeContext);

  const [node, setNode] = useState<Tree | null>(null);
  const [children, setChildren] = useState<Tree[]>([]);

  const handleRouterBack = () => {
    router.back();
  }

  const handleInsertNode = () => {
    const newNode: Tree = {
      name: "Node",
      desc: "",
      treeId: crypto.randomUUID(),
      nodeId: crypto.randomUUID(),
      children: []
    };

    const newTree = treeUtils.insertNode(tree, node!.nodeId, newNode);
    setTree(newTree);
  }

  const handleDeleteNode = () => {
    const targetId = nodeId;
    const newTree = treeUtils.deleteNode(tree, targetId);
    setTree(newTree);
    setNodeId(null);
  }

  useEffect(() => {
    if (node) setChildren(node.children);
    else setChildren([]);
  }, [node]);

  useEffect(() => {
    treeUtils.traverseTree(tree, n => {
      if (n.treeId === treeId) {
        setNode(n);
        return true;
      }
    });
  }, [tree, treeId]);

  return (
    <div className={clsx(styles.editor)}>
      <div className={clsx(styles.toolbar)}>
        <div>
          <p onClick={handleRouterBack}>{`< PREV`}</p>
        </div>
        <div>
          <p onClick={handleDeleteNode}>{`- DELETE`}</p>
          <p onClick={handleInsertNode}>{`+ ADD`}</p>
        </div>
      </div>
      {children.length > 0
        ? <List children={children} />
        : <EmptyState />
      }
    </div>
  );
};

export default ChildrenEditor;