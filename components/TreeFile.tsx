import TreeContext from "@/contexts/TreeContext";
import styles from "@/styles/treeExplorer.module.css";
import { Tree } from "@/types/ontologyTypes";
import clsx from "clsx";
import Image from "next/image";
import { useContext, useEffect, useState } from "react";

const fileIcon = {
  src: require("@/public/icons/text.svg"),
  alt: "file"
};

const TreeFile = ({ node, depth }: { node: Tree, depth: number }) => {
  const { treeId, setTreeId } = useContext(TreeContext);

  const [isSelected, setIsSelected] = useState<boolean>(false);

  const handleClick = () => {
    setTreeId(node.treeId);
  };

  useEffect(() => {
    if (treeId === node.treeId) setIsSelected(true);
    else setIsSelected(false);
  }, [treeId]);

  return (
    <div className={clsx(styles.line, styles.fileLine, { [styles.selected]: isSelected })} onClick={handleClick} style={{ "--depth": depth } as React.CSSProperties}>
      <div>
        <Image src={fileIcon.src} alt={fileIcon.alt} />
      </div>
      <div>
        <p>{ node.name }</p>
      </div>
    </div>
  );
};

export default TreeFile;