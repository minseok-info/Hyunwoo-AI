import { DataType } from "@/types/dataParms";
import Folder from "./folder";
import File from "./file";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getUuid, traverseTree } from "@/utils";

const Explorer = ({ data }: { data: DataType }) => {
  const router = useRouter();

  const [path, setPath] = useState<string[]>([]);
  const [uuid, setUuid] = useState<string>("");

  useEffect(() => {
    const queryId = getUuid(router.query);
    if (!queryId) return;

    const resultPath = traverseTree<string[]>(data, (node, prevPath) => {
      if (node.id === queryId) {
        return prevPath;
      }
    });
    if (!resultPath) return;
    
    setPath(resultPath);
    setUuid(queryId);
  }, [router.query]);

  return data.map((d, idx) => {
    if (d.type === "folder") return <Folder folder={d} path={path} uuid={uuid} key={idx} />
    else return <File file={d} uuid={uuid} key={idx} />
  })
}

export default Explorer;