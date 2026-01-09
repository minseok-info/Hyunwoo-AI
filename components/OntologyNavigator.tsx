import styles from "@/styles/ontologyNavigator.module.css";
import { MODEL_IDS, SectionId } from "@/types/modelParams";
import { Tree } from "@/types/ontologyTypes";
import { treeUtils } from "@/utils";
import clsx from "clsx";
import Image from "next/image";
import React, { useEffect, useState } from "react";

const arrowIcon = {
  src: require("@/public/icons/arrow.svg"),
  alt: "arrow"
};

const OntologyNavigator = (
  { tree, currentSectionId, back, push }:
  { tree: Tree[], currentSectionId: SectionId | undefined, back: () => void, push: (arg: SectionId) => void }
) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const [name, setName] = useState<Tree["name"]>("");
  const [children, setChildren] = useState<Tree["children"]>([]);

  useEffect(() => {
    if (tree.length === 0 || !currentSectionId) return;

    if (currentSectionId === MODEL_IDS.human) {
      setName("Human");
      setChildren(tree);

      return;
    }

    const currentNode = treeUtils.getNode(tree, currentSectionId);
    if (!currentNode) return;

    setName(currentNode.name);
    setChildren(currentNode.children);
  }, [tree, currentSectionId]);

  return (
    <div className={clsx(styles.navigatorContainer, { [styles.expanded]: isExpanded })}>
      <div className={clsx(styles.navigator)}>
        <div className={clsx(styles.top)} onClick={back}>
          {currentSectionId !== MODEL_IDS.human && <Image src={arrowIcon.src} alt={arrowIcon.alt} />}
          <p>{ name }</p>
        </div>
        <div className={clsx(styles.childList)}>
          {children.map((c, idx) => (
            <div key={idx} onClick={() => push(c.nodeId)}>
              <p>{ c.name }</p>
            </div>
          ))}
        </div>
      </div>
      <div className={clsx(styles.expandButton)} onClick={() => setIsExpanded(!isExpanded)}>
        <Image src={arrowIcon.src} alt={arrowIcon.alt} />
      </div>
    </div>
  );
};

export default OntologyNavigator;