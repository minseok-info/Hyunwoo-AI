import styles from "@/styles/treeExplorer.module.css";
import { Tree } from "@/types/ontologyTypes";
import Image from "next/image";
import { MouseEvent, useContext, useEffect, useState } from "react";
import TreeFile from "./TreeFile";
import TreeContext from "@/contexts/TreeContext";
import clsx from "clsx";

const folderIcon = {
  src: require("@/public/icons/arrow.svg"),
  alt: "folder"
}

const TreeFolder = ({ node, depth, closeForce }: { node: Tree, depth: number, closeForce?: boolean }) => {
  const { treeId, nodePath, setId } = useContext(TreeContext);

  const [isOpened, setIsOpened] = useState<boolean>(false);
  const [isSelected, setIsSelected] = useState<boolean>(false);

  const handleTreeIdSet = () => {
    setId(node.treeId, node.nodeId);
  }

  const handleFolderOpen = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    setIsOpened(!isOpened);
  }

  useEffect(() => {
    if (treeId === node.treeId) setIsSelected(true);
    else setIsSelected(false);
  }, [node, treeId]);

  useEffect(() => {
    if (nodePath.some(n => n.treeId === node.treeId)) setIsOpened(closeForce ? false : true);
  }, [nodePath, closeForce]);

  return (
    <div className={clsx(styles.folder)}>
      <div className={clsx(styles.line, styles.folderLine, { [styles.selected]: isSelected })} onClick={handleTreeIdSet} style={{ "--depth": depth } as React.CSSProperties}>
        <div onClick={handleFolderOpen}>
          <Image className={clsx({ [styles.rotatedIMG]: !isOpened })} src={folderIcon.src} alt={folderIcon.alt} />
        </div>
        <div>
          <p>{ node.name }</p>
        </div>
      </div>
      {isOpened && node.children.map((c, i) => {
        if (c.children.length > 0) return <TreeFolder node={c} depth={depth + 1} key={i} />
        else return <TreeFile node={c} depth={depth + 1} key={i} />
      })}
    </div>
  );
};

export default TreeFolder;