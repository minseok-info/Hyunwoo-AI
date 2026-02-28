import styles from "@/styles/energyHandleLeft.module.css";
import { Tree } from "@/types/ontologyTypes";
import clsx from "clsx";
import Image from "next/image";
import React, { useState } from "react";

const coreIcon = {
  src: require("@/public/icons/priority.svg"),
  alt: "core"
};

const EnergyHandleLeft = ({ node, back, push, canGoBack, onFirstClick }: {
  node: Tree,
  back: () => void,
  push: (node: Tree) => void,
  canGoBack?: boolean,
  onFirstClick?: () => void
}) => {
  const [isToggledHandle, setIsToggledHandle] = useState<boolean>(false);

  const handleToggleHandle = () => {
    onFirstClick?.();
    setIsToggledHandle(!isToggledHandle);
  };

  return (
    <React.Fragment>
      <div className={clsx(styles.panel, { [styles.toggledPanel]: isToggledHandle })}>
        <div className={clsx(styles.navigatorWrapper)}>
          <div className={clsx(styles.header)}>
            <span className={clsx(styles.headerLabel)}>INDEX</span>
            <span className={clsx(styles.headerNodeName)}>{ node.name }</span>
          </div>
          {canGoBack && (
            <div className={clsx(styles.back)} onClick={back}>
              <p>{ "< BACK" }</p>
            </div>
          )}
          <div className={clsx(styles.pushList)}>
            {node.children.map((c, i) => (
              <div className={clsx(styles.push)} onClick={() => push(c)} key={i}>
                <span className={clsx(styles.pushName)}>{ c.name }</span>
                {c.children.length > 0 && (
                  <span className={clsx(styles.pushChevron)}>{">"}</span>
                )}
              </div>
            ))}
          </div>
          {node.children.length > 0 && (
            <div className={clsx(styles.footer)}>
              <span>{ node.children.length } nodes</span>
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
};

export default EnergyHandleLeft;
