import styles from "@/styles/plate.module.css";
import { DataType } from "@/types/dataParms";
import { getUuid, traverseTree } from "@/utils";
import checkDoubleClick from "@/utils/checkDoubleClick";
import clsx from "clsx";
import Image from "next/image";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

const folderIcon = {
  src: require("@/public/icons/folder.svg"),
  alt: "folder"
}

const textFileIcon = {
  src: require("@/public/icons/textFile.svg"),
  alt: "textFile"
}

const List = ({ children, onItemClick }: { children: DataType, onItemClick: (node: DataType[number]) => void }) => {
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleClick = (child: DataType[number]) => {
    const isDoubleClick = checkDoubleClick(timerRef);
    if (isDoubleClick) {
      router.push(
        {
          pathname: router.pathname,
          query: { uuid: child.id }
        }
        , undefined, { shallow: true }
      );
      
      return;
    }

    onItemClick(child);
  }

  return (
    <div className={styles.list}>
      {
        children.map((child, idx) => (
          <div className={clsx("flex flexColumn alignCenter textCenter")} onClick={() => handleClick(child)} key={idx}>
            <div className={clsx("flex justifyCenter alignCenter", styles.icon)}>
              {
                child.type === "folder"
                  ? <Image src={folderIcon.src} alt={folderIcon.alt} />
                  : <Image src={textFileIcon.src} alt={textFileIcon.alt} />
              }
            </div>
            <p>{ child.name }</p>
          </div>
        ))
      }
    </div>
  );
}

const Plate = ({ data, onItemClick }: { data: DataType, onItemClick: (node: DataType[number]) => void }) => {
  const router = useRouter();

  const [node, setNode] = useState<DataType[number] | null>(null);

  useEffect(() => {
    const queryId = getUuid(router.query);
    if (!queryId) return;

    const resultNode = traverseTree<DataType[number]>(data, node => {
      if (node.id === queryId) return node;
    });
    if (!resultNode) return;

    setNode(resultNode);
  }, [router.query, data]);

  return (
    <div className={clsx(styles.plate)}>
      {
        node && node.type === "folder"
          ? (
            <List children={node.children} onItemClick={onItemClick} />
          )
          : (
            <div className={clsx(styles.nothing)}>
              <p>{`Nothing in here :)`}</p>
            </div>
          )
      }
    </div>
  );
}

export default Plate;