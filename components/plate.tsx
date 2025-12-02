import styles from "@/styles/plate.module.css";
import { DataType, FileType, FolderType } from "@/types/dataParms";
import { getUuid, traverseTree } from "@/utils";
import changeData from "@/utils/changeData";
import checkDoubleClick from "@/utils/checkDoubleClick";
import clsx from "clsx";
import Image from "next/image";
import { useRouter } from "next/router";
import { Children, useEffect, useRef, useState } from "react";

const folderIcon = {
  src: require("@/public/icons/folder.svg"),
  alt: "folder"
}

const textFileIcon = {
  src: require("@/public/icons/textFile.svg"),
  alt: "textFile"
}

const List = ({ children, selectedId, onItemClick }: { children: DataType, selectedId: string | null, onItemClick: (node: DataType[number]) => void }) => {
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
            <div className={clsx("flex justifyCenter alignCenter", styles.icon, { [styles.selectedIcon]: child.id === selectedId })}>
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

const Plate = ({ data, setData, selectedItem, onItemClick }: { data: DataType, setData: (data: DataType) => void, selectedItem: DataType[number] | null, onItemClick: (node: DataType[number] | null) => void }) => {
  const router = useRouter();

  const [node, setNode] = useState<DataType[number] | null>(null);

  const routerBack = () => {
    router.back();
  }

  const deleteChild = () => {
    if (!node || !selectedItem) return;
    const nodeId = node.id;
    const targetId = selectedItem.id;
    
    const newChildren = [...(node as FolderType).children.filter(child => child.id !== targetId)];
    
    const newData = changeData(data, nodeId, ({ folder }) => {
      if (folder) return { ...folder, children: newChildren };
    });
    
    onItemClick(null);
    setData(newData);
  }

  const addChild = () => {
    if (!node) return;
    const nodeId = node.id;
    const newId = crypto.randomUUID();

    const newFile: FileType = {
      id: newId,
      type: "file",
      name: "new",
      desc: "new"
    };

    const newChildren: FolderType["children"] = "children" in node
      ? [...node.children, newFile]
      : [newFile];

    const newData = changeData(data, nodeId, ({ folder, file }) => {
      if (folder) return { ...folder, children: newChildren };
      if (file) return { ...file, type: "folder", children: newChildren };
    });

    setData(newData);
  }

  useEffect(() => {
    const queryId = getUuid(router.query);
    if (!queryId) {
      onItemClick(null);
      setNode(null);
      return;
    }

    const resultNode = traverseTree<DataType[number]>(data, node => {
      if (node.id === queryId) return node;
    });
    if (!resultNode) return;

    setNode(resultNode);
  }, [router.query, data]);

  return (
    <div className={clsx(styles.plate)}>
      <div className={clsx(styles.option)}>
        <div>
          <p onClick={routerBack}>{`< PREV`}</p>
        </div>
        <div>
          <p onClick={deleteChild}>{`- DELETE`}</p>
          <p onClick={addChild}>{`+ ADD`}</p>
        </div>
      </div>
      {node && node.type === "folder" && node.children.length > 0 && (
        <List children={node.children} selectedId={selectedItem?.id ?? null} onItemClick={onItemClick} />
      )}
      {(!node || node.type === "file" || (node && node.type === "folder" && node.children.length < 1)) && (
        <div className={clsx(styles.nothing)}>
          <p>{`Nothing in here :)`}</p>
        </div>
      )}
    </div>
  );
}

export default Plate;