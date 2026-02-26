import styles from "@/styles/nodeMapViewer.module.css";
import { Tree } from "@/types/ontologyTypes";
import clsx from "clsx";
import React, { useState } from "react";
import NodeMapViewer from "./NodeMapViewer";

const EnergyHandleBottom = React.forwardRef<
  HTMLDivElement,
  {
    tree: Tree[];
    node: Tree;
    back: () => void;
    push: (node: Tree) => void;
    onFirstClick?: () => void;
  }
>((props, ref) => {
  const { tree, node, back, push, onFirstClick } = props;
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    onFirstClick?.();
    setIsExpanded(prev => !prev);
  };

  return (
    <div
      ref={ref}
      className={clsx(styles.bottomPanel, {
        [styles.bottomPanelExpanded]: isExpanded,
      })}
    >
      <div className={clsx(styles.bottomPanelBar)} onClick={handleToggle}>
        <div className={clsx(styles.bottomPanelHandle)} />
        <span className={clsx(styles.bottomPanelLabel)}>
          {node.name} — {node.children.length} nodes
        </span>
        <div className={clsx(styles.bottomPanelHandle)} />
      </div>
      <div className={clsx(styles.bottomPanelContent)}>
        <NodeMapViewer
          tree={tree}
          currentNode={node}
          mode="landing"
          onBack={back}
          onPush={push}
        />
      </div>
    </div>
  );
});

EnergyHandleBottom.displayName = "EnergyHandleBottom";

export default EnergyHandleBottom;
