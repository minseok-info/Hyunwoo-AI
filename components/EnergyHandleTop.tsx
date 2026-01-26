import katexSchema from "@/katexSchema";
import styles from "@/styles/energyHandleTop.module.css";
import { Tree } from "@/types/ontologyTypes";
import clsx from "clsx";
import Image from "next/image";
import React, { useState } from "react";
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
    node: Tree,
    onFirstClick: () => void
  }
>((props, ref) => {
  const { node, onFirstClick } = props;

  const [isToggledHandle, setIsToggledHandle] = useState<boolean>(true);

  const handleToggleHandle = () => {
    onFirstClick();
    setIsToggledHandle(!isToggledHandle);
  };

  return (
    <React.Fragment>
      <div className={clsx(styles.panel, { [styles.toggledPanel]: isToggledHandle })}>
        <div className={clsx(styles.viewerWrapper)}>
          <div ref={ref} className={clsx(styles.viewer)}>
            <ReactMarkDown remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex, [rehypeSanitize, katexSchema]]}>
              { node.desc }
            </ReactMarkDown>
          </div>
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