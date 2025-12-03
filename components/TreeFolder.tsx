import styles from "@/styles/treeExplorer.module.css";
import { Tree } from "@/types/ontologyTypes";
import Image from "next/image";
import { useContext, useEffect, useRef, useState } from "react";
import TreeFile from "./TreeFile";
import TreeContext from "@/contexts/TreeContext";
import clsx from "clsx";
import { checkDoubleClick } from "@/utils";

const folderIcon = {
  src: require("@/public/icons/arrow.svg"),
  alt: "folder"
}

const TreeFolder = ({ node, close }: { node: Tree, close?: boolean }) => {
  const { treeId, treePath, setTreeId } = useContext(TreeContext);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [isOpened, setIsOpened] = useState<boolean>(false);
  const [isSelected, setIsSelected] = useState<boolean>(false);

  const handleClick = () => {
    const isDoubleClick = checkDoubleClick(timerRef);
    if (isDoubleClick) {
      setIsOpened(!isOpened);
      return;
    }

    setTreeId(node.treeId);
  }

  useEffect(() => {
    if (treeId === node.treeId) setIsSelected(true);
    else setIsSelected(false);
  }, [treeId]);

  useEffect(() => {
    if (close === false) setIsOpened(false);
    else if (treePath.includes(node.treeId)) setIsOpened(true);
  }, [treePath, close]);

  return (
    <div className={clsx(styles.folder)}>
      <div className={clsx(styles.folderLine, { [styles.selected]: isSelected })} onClick={handleClick}>
        <Image className={clsx({ [styles.rotatedIMG]: !isOpened })} src={folderIcon.src} alt={folderIcon.alt} />
        <p>{ node.name }</p>
      </div>
      {isOpened && node.children.map((c, i) => {
        if (c.children.length > 0) return <TreeFolder node={c} key={i} />
        else return <TreeFile node={c} key={i} />
      })}
    </div>
  );
};

export default TreeFolder;