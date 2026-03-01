import styles from "@/styles/nodeMinimap.module.css";
import { Tree } from "@/types/ontologyTypes";
import clsx from "clsx";
import React, { useEffect, useRef } from "react";
import NodeMapViewer from "./NodeMapViewer";

const NodeMinimap = React.forwardRef<
  HTMLDivElement,
  {
    tree: Tree[];
    node: Tree;
    expanded?: boolean;
    onExpand?: () => void;
    onCollapse?: () => void;
    onBack?: () => void;
    onPush?: (node: Tree) => void;
    onStartExplore?: () => void;
  }
>((props, ref) => {
  const { tree, node, expanded, onExpand, onCollapse, onBack, onPush, onStartExplore } = props;
  const innerRef = useRef<HTMLDivElement | null>(null);

  /* collapse on outside click */
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (innerRef.current && !innerRef.current.contains(e.target as Node)) {
        onCollapse?.();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expanded, onCollapse]);

  return (
    <div
      ref={(el) => {
        innerRef.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }}
      className={clsx(styles.minimap, expanded && styles.expanded)}
    >
      {expanded ? (
        <NodeMapViewer
          tree={tree}
          currentNode={node}
          mode="landing"
          onBack={onBack}
          onPush={onPush}
          onEmptyClick={onCollapse}
        />
      ) : (
        <NodeMapViewer
          tree={tree}
          currentNode={node}
          mode="landing"
          isMinimap
          onExpandMinimap={() => { onStartExplore?.(); onExpand?.(); }}
        />
      )}
    </div>
  );
});

NodeMinimap.displayName = "NodeMinimap";

export default NodeMinimap;
