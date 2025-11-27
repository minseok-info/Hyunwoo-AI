import styles from "@/styles/plate.module.css";
import { DataType } from "@/types/dataParms";
import { getUuid, traverseTree } from "@/utils";
import clsx from "clsx";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const Plate = ({ data }: { data: DataType }) => {
  const router = useRouter();

  const [children, setChildren] = useState<DataType | null>(null);
  const [desc, setDesc] = useState<string | null>(null);

  useEffect(() => {
    const uuid = getUuid(router.query);
    if (!uuid) return;

    const resultNode = traverseTree<DataType[number]>(data, node => {
      if (node.id === uuid) return node;
    });
    if (!resultNode) return;

    if (resultNode.type === "folder") {
      setChildren(resultNode.children);
      setDesc(null);
    }
    else if (resultNode.type === "file") {
      setChildren(null);
      setDesc(resultNode.desc);
    }
  }, [router.query]);

  return (
    <div className={clsx("flex justifyCenter alignCenter", styles.plate)}>
    </div>
  );
}

export default Plate;