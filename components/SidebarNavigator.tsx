import styles from "@/styles/sidebarNavigator.module.css";
import { Tree } from "@/types/ontologyTypes";
import { useRouter } from "next/router";
import { useState } from "react";
import TreeExplorer from "./TreeExplorer";
import clsx from "clsx";
import TreeSearch from "./TreeSearch";
import Image from "next/image";
import TreeStatus from "./TreeStatus";

const explorerIcon = {
  src: require("@/public/icons/file.svg"),
  alt: "explorer"
};

const searchIcon = {
  src: require("@/public/icons/search.svg"),
  alt: "search"
};

const statusIcon = {
  src: require("@/public/icons/status.svg"),
  alt: "status"
};

const exitIcon = {
  src: require("@/public/icons/door.svg"),
  alt: "exit"
};

const SidebarNavigator = ({ tree }: { tree: Tree[] }) => {
  const router = useRouter();

  type Navigator = "explorer" | "search" | "status" | "exit";
  const [navigator, setNavigator] = useState<Navigator>("explorer");
  const navigatorRecord: Record<Navigator, React.ReactNode> = {
    explorer: <TreeExplorer tree={tree} />,
    search: <TreeSearch tree={tree} />,
    status: <TreeStatus tree={tree} />,
    exit: ""
  };

  const returnToLanding = () => {
    router.push("/");
  };

  const handleClick = (navigator: Navigator) => {
    setNavigator(navigator);
  };

  return (
    <div className={clsx(styles.container)}>
      <div className={clsx(styles.sidebar)}>
        <div className={clsx({ [styles.selected]: navigator === "explorer" })} onClick={() => handleClick("explorer")}>
          <Image src={explorerIcon.src} alt={explorerIcon.alt} />
        </div>
        <div className={clsx({ [styles.selected]: navigator === "search" })} onClick={() => handleClick("search")}>
          <Image src={searchIcon.src} alt={searchIcon.alt} />
        </div>
        <div className={clsx({ [styles.selected]: navigator === "status" })} onClick={() => handleClick("status")}>
          <Image src={statusIcon.src} alt={statusIcon.alt} />
        </div>
        <div onClick={returnToLanding}>
          <Image src={exitIcon.src} alt={exitIcon.alt} />
        </div>
      </div>
      <div className={clsx(styles.navigator)}>
        <div>
          <h4>{ navigator.toUpperCase() }</h4>
        </div>
        { navigatorRecord[navigator] }
      </div>
    </div>
  );
};

export default SidebarNavigator;