import styles from "@/styles/energyHandleLeft.module.css";
import { Tree } from "@/types/ontologyTypes";
import clsx from "clsx";
import Image from "next/image";
import React, { useEffect, useState } from "react";

const coreIcon = {
  src: require("@/public/icons/priority.svg"),
  alt: "core"
};

const EnergyHandleLeft = ({ node, back, push, onFirstClick }: {
  node: Tree,
  back: () => void,
  push: (node: Tree) => void,
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
          <div className={clsx(styles.back)} onClick={back}>
            <p>{ "< BACK" }</p>
          </div>
          <div className={clsx(styles.pushList)}>
            {node.children.map((c, i) => (
              <div className={clsx(styles.push)} onClick={() => push(c)} key={i}>
                <p>{ c.name }</p>
              </div>
            ))}
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
};

export default EnergyHandleLeft;