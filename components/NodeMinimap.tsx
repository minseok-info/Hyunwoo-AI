import styles from "@/styles/nodeMinimap.module.css";
import { Tree } from "@/types/ontologyTypes";
import React from "react";
import NodeMapViewer from "./NodeMapViewer";

const NodeMinimap = React.forwardRef<
  HTMLDivElement,
  {
    tree: Tree[];
    node: Tree;
    onExpand?: () => void;
  }
>((props, ref) => {
  const { tree, node, onExpand } = props;

  return (
    <div ref={ref} className={styles.minimap}>
      <NodeMapViewer
        tree={tree}
        currentNode={node}
        mode="landing"
        isMinimap
        onExpandMinimap={onExpand}
      />
    </div>
  );
});

NodeMinimap.displayName = "NodeMinimap";

export default NodeMinimap;
