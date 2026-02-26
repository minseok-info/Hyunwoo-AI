import styles from "@/styles/energyHandleRight.module.css";
import clsx from "clsx";
import Image from "next/image";
import React, { useState } from "react";

const coreIcon = {
  src: require("@/public/icons/priority.svg"),
  alt: "core"
};

const EnergyHandleRight = ({ onFirstClick }: { onFirstClick?: () => void }) => {
  const [isToggledHandle, setIsToggledHandle] = useState<boolean>(false);

  const handleToggleHandle = () => {
    onFirstClick?.();
    setIsToggledHandle(!isToggledHandle);
  };

  return (
    <React.Fragment>
      <div className={clsx(styles.panel, { [styles.toggledPanel]: isToggledHandle })}>
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

export default EnergyHandleRight;