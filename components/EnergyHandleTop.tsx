import katexSchema from "@/katexSchema";
import styles from "@/styles/energyHandleTop.module.css";
import { Tree } from "@/types/ontologyTypes";
import { treeUtils } from "@/utils";
import clsx from "clsx";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import ReactMarkDown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeSanitize from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

const coreIcon = {
  src: require("@/public/icons/priority.svg"),
  alt: "core"
};

const EnergyHandleTop = React.forwardRef<
  HTMLDivElement,
  {
    tree: Tree[],
    node: Tree,
    onFirstClick: () => void
  }
>((props, ref) => {
  const { tree, node, onFirstClick } = props;

  const [isToggledHandle, setIsToggledHandle] = useState<boolean>(true);

  const [toggledTag, setToggledTag] = useState<Tree["tags"][number]>("");
  const [toggledNode, setToggledNode] = useState<Tree | undefined>(undefined);

  const [sameTagNodes, setSameTagNodes] = useState<Tree[]>([]);

  const resetContent = () => {
    setToggledTag("");
    setToggledNode(undefined);
  };

  const selectTag = (targetTag: Tree["tags"][number]) => {
    if (!targetTag) {
      setSameTagNodes([]);
      return;
    }

    const targetNodes = treeUtils.getNodeWithTag(tree, targetTag);
    if (!targetNodes) setSameTagNodes([]);
    else setSameTagNodes([...targetNodes].sort((a, b) => a.name.localeCompare(b.name)));

    setToggledTag(targetTag);
  };

  const handleToggleHandle = () => {
    onFirstClick();
    setIsToggledHandle(!isToggledHandle);
  };

  const handleToggleTag = (targetTag: Tree["tags"][number]) => {
    if (toggledNode) {
      setToggledNode(undefined);
    }
    else if (toggledTag === targetTag) {
      setToggledTag("");
      return;
    }
    
    selectTag(targetTag);
  };

  const handleToggleNode = (targetNode: Tree) => {
    setToggledNode(targetNode);
  };

  useEffect(() => {
    if (!node) return;
    resetContent();
  }, [node]);

  return (
    <React.Fragment>
      <div ref={ref} className={clsx(styles.panel, { [styles.toggledPanel]: isToggledHandle })}>
        <div className={clsx(styles.tagListWrapper)}>
          {node.tags.map((t, i) => (
            <div className={clsx(styles.tag, { [styles.toggledTag]: t === toggledTag })} onClick={() => handleToggleTag(t)} key={i}>
              <p>{ t }</p>
            </div>
          ))}
        </div>
        <div className={clsx(styles.contentWrapper)}>
          {(!toggledTag || toggledNode) && (
            <div className={clsx(styles.viewer)}>
              {toggledNode && (
                <div className={clsx(styles.path)}>
                  <p className={clsx(styles.current)} onClick={() => handleToggleTag(toggledTag)}>{ toggledTag }</p>
                  <p>{"/"}</p>
                  <p>{ toggledNode.name }</p>
                </div>
              )}
              <ReactMarkDown remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex, [rehypeSanitize, katexSchema]]}>
                { toggledNode?.desc ?? node.desc }
              </ReactMarkDown>
            </div>
          )}
          {(toggledTag && !toggledNode) && (
            <div className={styles.nodeList}>
              {sameTagNodes.map((n, i) => (
                <div className={styles.node} onClick={() => handleToggleNode(n)} key={i}>
                  <p>{ n.name }</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className={clsx(styles.handle, { [styles.toggledHandle]: isToggledHandle })}>
        <div className={clsx(styles.line)} />
        <div className={clsx(styles.diamond)} onClick={handleToggleHandle}>
          <Image src={coreIcon.src} alt={coreIcon.alt} />
        </div>
      </div>
    </React.Fragment>
  );
});

export default EnergyHandleTop;