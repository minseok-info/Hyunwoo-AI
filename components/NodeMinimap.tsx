import styles from "@/styles/nodeMinimap.module.css";
import { Tree } from "@/types/ontologyTypes";
import React from "react";
import NodeMapViewer from "./NodeMapViewer";

const NodeMinimap = React.forwardRef<
  HTMLDivElement,
  {
    tree: Tree[];
    node: Tree;
    back: () => void;
    push: (node: Tree) => void;
  }
>((props, ref) => {
  const { tree, node, back, push } = props;

  return (
    <div ref={ref} className={styles.minimap}>
      <NodeMapViewer
        tree={tree}
        currentNode={node}
        mode="landing"
        onBack={back}
        onPush={push}
      />
    </div>
  );
});

NodeMinimap.displayName = "NodeMinimap";

export default NodeMinimap;
