import styles from "@/styles/search.module.css";
import { DataType } from "@/types/dataParms";
import clsx from "clsx";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { getUuid, traverseTree } from "@/utils";
import Folder from "./folder";
import File from "./file";
import { useRouter } from "next/router";

const Search = ({ data }: { data: DataType }) => {
  const router = useRouter();

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [tempword, setTempword] = useState<string>("");
  const [keyword, setkeyword] = useState<string | null>(null);

  const [result, setResult] = useState<DataType>([]);

  const [uuid, setUuid] = useState<string>("");

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setTempword(value);
  }

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    timeoutRef.current = setTimeout(() => {
      setkeyword(tempword);
    }, 500);
  }, [tempword]);

  useEffect(() => {
    const filteredNodes: DataType = [];
    traverseTree(data, node => {
      if (!keyword) return;
      
      if (node.name.includes(keyword)) filteredNodes.push(node);
      else if (node.type === "file" && node.desc.includes(keyword)) filteredNodes.push(node);
    });
    setResult(filteredNodes);
  }, [keyword]);

  useEffect(() => {
    getUuid(router.query, uuid => {
      setUuid(uuid);
    });
  }, [router.query]);

  return (
    <>
      <div className={clsx("flex justifyCenter", styles.searchBox)}>
        <input type="text" placeholder="Search" value={tempword} onChange={(event: ChangeEvent<HTMLInputElement>) => handleChange(event)} />
      </div>
      {
        result.map((res, idx) => {
          if (res.type === "folder") return <Folder folder={res} path={[]} uuid={uuid} key={idx} />
          else return <File file={res} uuid={uuid} key={idx} />
        })
      }
    </>
  );
}

export default Search;