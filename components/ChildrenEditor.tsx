import TreeContext from "@/contexts/TreeContext";
import styles from "@/styles/nodeEditor.module.css";
import { Tree } from "@/types/ontologyTypes";
import { treeUtils } from "@/utils";
import clsx from "clsx";
import Image from "next/image";
import { useContext, useEffect, useState } from "react";

const folderIcon = {
  src: require("@/public/icons/folder.svg"),
  alt: "folder"
};

const fileIcon = {
  src: require("@/public/icons/textFile.svg"),
  alt: "file"
};

const ChildrenEditor = ({ tree, node }: { tree: Tree[], node: Tree }) => {
  const { setTree, setId } = useContext(TreeContext);

  const [selectedChild, setSelectedChild] = useState<Tree | null>(null);
  
  const handleSelectChild = (newNode: Tree) => {
    setSelectedChild(newNode);
  };
  
  const handleChangeNode = (newNode: Tree) => {
    setId(newNode.treeId, newNode.nodeId);
  };

  const handleInsertChild = () => {
    const newNode: Tree = {
      name: "New Node",
      desc: "",
      treeId: crypto.randomUUID(),
      nodeId: crypto.randomUUID(),
      tags: [],
      children: []
    };

    const newTree = treeUtils.insertNode(tree, node!.nodeId, newNode);
    setTree(newTree);
  };

  const handleDeleteChild = () => {
    if (!selectedChild) return;

    const targetId = selectedChild.nodeId;
    const newTree = treeUtils.deleteNode(tree, targetId);
    setTree(newTree);
  };

  return (
    <div className={clsx(styles.childrenEditor)}>
      <div>
        <h4>CHILDREN</h4>
        <div className={clsx(styles.childrenToolbar)}>
          <p onClick={handleDeleteChild}>{`- DELETE`}</p>
          <p onClick={handleInsertChild}>{`+ ADD`}</p>
        </div>
      </div>
      <div className={clsx(styles.childrenList)}>
        {node.children.length > 0 ? node.children.map((c, i) => (
          <div className={clsx({ [styles.selectedChild]: c === selectedChild })} onClick={() => handleSelectChild(c)} key={i}>
            <div onClick={() => handleChangeNode(c)}>
              {c.children.length > 0 ? (
                <Image src={folderIcon.src} alt={folderIcon.alt} />
              ): (
                <Image src={fileIcon.src} alt={fileIcon.alt} />
              )}
              <p>{ c.name }</p>
            </div>
          </div>
        )) : (
          <div className={styles.nothingWrapper}>
            <p>{`Nothing in here :)`}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChildrenEditor;