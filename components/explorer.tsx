import { DataType } from "@/types/dataParms";
import Folder from "./folder";
import File from "./file";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

const Explorer = ({ data }: { data: DataType }) => {
  const router = useRouter();

  const [once, setOnce] = useState<boolean>(false);
  const [path, setPath] = useState<string[]>([]);

  useEffect(() => {
    if (once) return;
    
    const uuid = router.query["uuid"] || null;
    if (!uuid) return;
    
    const temp: string[] = [];
    const dfs = (objects: DataType, prevPath: string[] = []) => {
      for (const obj of objects) {
        const currentPath: string[] = [...prevPath, obj.id];
        
        if (obj.id === uuid) {
          temp.push(...currentPath);
          return;
        }
        
        if (obj.type === "folder") {
          dfs(obj.children, currentPath);
        }
      }
    }
    dfs(data);
    setPath(temp);
    setOnce(true);
  }, [router.query]);

  return data.map((d, idx) => {
    if (d.type === "folder") return <Folder folder={d} path={path} key={idx} />
    else return <File file={d} key={idx} />
  })
}

export default Explorer;