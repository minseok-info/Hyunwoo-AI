import styles from "@/styles/attribute.module.css";
import { DataType } from "@/types/dataParms";
import { getUuid, traverseTree } from "@/utils";
import changeData from "@/utils/changeData";
import clsx from "clsx";
import Image from "next/image";
import { useRouter } from "next/router";
import { ChangeEvent, useEffect, useRef, useState } from "react";

const folderIcon = {
  src: require("@/public/icons/folder.svg"),
  alt: "folderIcon"
}

const textFileIcon = {
  src: require("@/public/icons/textFile.svg"),
  alt: "textFileIcon"
}

const Attribute = ({ node, data, setData }: { node: DataType[number] | null, data: DataType, setData: (data: DataType) => void }) => {
  const router = useRouter();

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [prevUuid, setPrevUuid] = useState<string>("");
  const [selectedNode, setSelectedNode] = useState<DataType[number] | null>(null);

  const [name, setName] = useState<string>("");
  const [desc, setDesc] = useState<string>("");

  const handleChangeName = (event: ChangeEvent<HTMLInputElement>) => {
    const target = event.target;
    const value = target.value;

    setName(value);
  }

  const handleChangeDesc = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const target = event.target;
    const value = target.value;

    setDesc(value);
  }

  const handleChangeData = () => {
    if (!selectedNode) return;

    const newData = changeData(data, selectedNode.id, ({folder, file}) => {
      if (folder) return { ...folder, name };
      else if (file) return { ...file, name, desc };
    });
    setData(newData);
  }

  useEffect(() => {
    getUuid(router.query, uuid => {
      if (uuid === prevUuid) return;
      setPrevUuid(uuid);
      setSelectedNode(null);
    });
  }, [router.query]);

  useEffect(() => {
    if (!node) return;

    setSelectedNode(node);
    setName(node.name);
    if (node.type === "file") setDesc(node.desc);
  }, [node]);

  useEffect(() => {
    if (!selectedNode) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    timeoutRef.current = setTimeout(() => {
      handleChangeData();
    }, 500);
  }, [name, desc]);

  return (
    <div className={clsx(styles.attribute)}>
      {!selectedNode && (
        <div className={styles.nothing}>
          <p>Select Any :D</p>
        </div>
      )}
      {selectedNode && (
        <>
          <div className={clsx(styles.type)}>
            <div className={clsx({ [styles.selectedType]: selectedNode.type === "folder" })}>
              <Image src={folderIcon.src} alt={folderIcon.alt} />
            </div>
            <hr />
            <div className={clsx({ [styles.selectedType]: selectedNode.type === "file" })}>
              <Image src={textFileIcon.src} alt={textFileIcon.alt} />
            </div>
          </div>
          <div className={clsx(styles.name)}>
            <p>Name</p>
            <input type="text" placeholder="Name" value={name} onChange={handleChangeName} />
          </div>
          {
            selectedNode.type === "file" && (
              <div className={clsx(styles.desc)}>
                <p>Description</p>
                <textarea rows={7} placeholder="Desc" value={desc} onChange={handleChangeDesc} />
              </div>
            )
          }
        </>
      )}
    </div>
  );
}

export default Attribute;