import styles from "@/styles/plate.module.css";
import { DataType } from "@/types/dataParms";
import { getUuid, traverseTree } from "@/utils";
import clsx from "clsx";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const Plate = ({ data }: { data: DataType }) => {
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
  }, [router.query]);

  return (
    <div className={clsx("flex justifyCenter alignCenter", styles.plate)}>
      <div className={clsx(styles.canvas)}>
      </div>
    </div>
  );
}

export default Plate;